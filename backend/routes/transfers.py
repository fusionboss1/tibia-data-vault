import logging
import sqlite3

from flask import Blueprint, jsonify, request
from werkzeug.exceptions import BadRequest, NotFound

from backend import get_db
from backend.models import ApiResponse

logger = logging.getLogger(__name__)
transfers_bp = Blueprint('transfers', __name__)
PLAN_STATUSES = {'draft', 'purchasing', 'transferred', 'selling', 'completed'}
SALE_STATUSES = {'planned', 'listed', 'partial', 'sold'}


def validate_payload(payload):
    if not isinstance(payload, dict):
        raise BadRequest('JSON body is required')
    if not str(payload.get('name', '')).strip():
        raise BadRequest('name is required')
    if not payload.get('source_server_id'):
        raise BadRequest('source_server_id is required')
    if payload.get('status', 'draft') not in PLAN_STATUSES:
        raise BadRequest('invalid plan status')
    items = payload.get('items', [])
    if not isinstance(items, list):
        raise BadRequest('items must be a list')
    seen = set()
    for item in items:
        item_id = item.get('item_id')
        quantity = int(item.get('quantity') or 0)
        sold_quantity = int(item.get('sold_quantity') or 0)
        if not item_id or item_id in seen:
            raise BadRequest('plan items must have unique item_id values')
        if quantity < 0 or sold_quantity < 0 or sold_quantity > quantity:
            raise BadRequest('invalid item quantities')
        if item.get('sale_status', 'planned') not in SALE_STATUSES:
            raise BadRequest('invalid sale status')
        seen.add(item_id)
    return items


def get_plan(conn, plan_id):
    plan = conn.execute("""
        SELECT plan.*, source.name AS source_server_name, destination.name AS destination_server_name
        FROM transfer_plans plan
        JOIN servers source ON source.id = plan.source_server_id
        LEFT JOIN servers destination ON destination.id = plan.destination_server_id
        WHERE plan.id = ?
    """, (plan_id,)).fetchone()
    if not plan:
        raise NotFound(f'Transfer plan with ID {plan_id} not found')
    items = conn.execute("""
        SELECT plan_item.*, item.name AS item_name, item.category AS item_category
        FROM transfer_plan_items plan_item
        JOIN items item ON item.id = plan_item.item_id
        WHERE plan_item.plan_id = ?
        ORDER BY plan_item.id
    """, (plan_id,)).fetchall()
    result = dict(plan)
    result['items'] = [dict(item) for item in items]
    return result


def write_items(conn, plan_id, items):
    conn.execute('DELETE FROM transfer_plan_items WHERE plan_id = ?', (plan_id,))
    for item in items:
        conn.execute("""
            INSERT INTO transfer_plan_items (
                plan_id, item_id, quantity, purchase_price, expected_sale_price,
                actual_sale_price, sold_quantity, sale_status, source_market_price,
                destination_buy_offer, destination_sell_offer, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            plan_id,
            item['item_id'],
            int(item.get('quantity') or 0),
            float(item.get('purchase_price') or 0),
            float(item.get('expected_sale_price') or 0),
            float(item.get('actual_sale_price') or 0),
            int(item.get('sold_quantity') or 0),
            item.get('sale_status', 'planned'),
            float(item.get('source_market_price') or 0),
            float(item.get('destination_buy_offer') or 0),
            float(item.get('destination_sell_offer') or 0),
            str(item.get('notes', '')).strip() or None,
        ))


@transfers_bp.route('/api/transfers', methods=['GET'])
def list_transfer_plans():
    try:
        with get_db() as conn:
            rows = conn.execute("""
                SELECT plan.id, plan.name, plan.status, plan.source_server_id,
                       plan.destination_server_id, plan.created_at, plan.updated_at,
                       source.name AS source_server_name,
                       destination.name AS destination_server_name,
                       COUNT(item.id) AS item_count
                FROM transfer_plans plan
                JOIN servers source ON source.id = plan.source_server_id
                LEFT JOIN servers destination ON destination.id = plan.destination_server_id
                LEFT JOIN transfer_plan_items item ON item.plan_id = plan.id
                GROUP BY plan.id
                ORDER BY plan.updated_at DESC, plan.id DESC
            """).fetchall()
            plans = [dict(row) for row in rows]
            return jsonify(ApiResponse(success=True, data={'plans': plans}, count=len(plans)).model_dump())
    except sqlite3.Error as e:
        logger.error(f'Database error in list_transfer_plans: {e}')
        raise


@transfers_bp.route('/api/transfers/<int:plan_id>', methods=['GET'])
def get_transfer_plan(plan_id):
    try:
        with get_db() as conn:
            return jsonify(ApiResponse(success=True, data={'plan': get_plan(conn, plan_id)}).model_dump())
    except sqlite3.Error as e:
        logger.error(f'Database error in get_transfer_plan: {e}')
        raise


@transfers_bp.route('/api/transfers', methods=['POST'])
def create_transfer_plan():
    payload = request.get_json(silent=True)
    items = validate_payload(payload)
    try:
        with get_db() as conn:
            cursor = conn.execute("""
                INSERT INTO transfer_plans (
                    name, status, source_server_id, destination_server_id,
                    source_tc_price, destination_tc_price, transfer_cost
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                payload['name'].strip(),
                payload.get('status', 'draft'),
                payload['source_server_id'],
                payload.get('destination_server_id') or None,
                float(payload.get('source_tc_price') or 0),
                float(payload.get('destination_tc_price') or 0),
                float(payload.get('transfer_cost') or 0),
            ))
            plan_id = cursor.lastrowid
            write_items(conn, plan_id, items)
            conn.commit()
            plan = get_plan(conn, plan_id)
            return jsonify(ApiResponse(success=True, data={'plan': plan}, message='Transfer plan created').model_dump()), 201
    except sqlite3.Error as e:
        logger.error(f'Database error in create_transfer_plan: {e}')
        raise


@transfers_bp.route('/api/transfers/<int:plan_id>', methods=['PUT'])
def update_transfer_plan(plan_id):
    payload = request.get_json(silent=True)
    items = validate_payload(payload)
    try:
        with get_db() as conn:
            if not conn.execute('SELECT 1 FROM transfer_plans WHERE id = ?', (plan_id,)).fetchone():
                raise NotFound(f'Transfer plan with ID {plan_id} not found')
            conn.execute("""
                UPDATE transfer_plans
                SET name = ?, status = ?, source_server_id = ?, destination_server_id = ?,
                    source_tc_price = ?, destination_tc_price = ?, transfer_cost = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                payload['name'].strip(),
                payload.get('status', 'draft'),
                payload['source_server_id'],
                payload.get('destination_server_id') or None,
                float(payload.get('source_tc_price') or 0),
                float(payload.get('destination_tc_price') or 0),
                float(payload.get('transfer_cost') or 0),
                plan_id,
            ))
            write_items(conn, plan_id, items)
            conn.commit()
            plan = get_plan(conn, plan_id)
            return jsonify(ApiResponse(success=True, data={'plan': plan}, message='Transfer plan saved').model_dump())
    except sqlite3.Error as e:
        logger.error(f'Database error in update_transfer_plan: {e}')
        raise
