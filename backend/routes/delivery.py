"""Weekly delivery items endpoints."""

import logging
import sqlite3
from flask import Blueprint, jsonify, request
from werkzeug.exceptions import NotFound

from backend import get_db
from backend.models import ApiResponse

logger = logging.getLogger(__name__)

delivery_bp = Blueprint('delivery', __name__)


@delivery_bp.route('/api/delivery/items', methods=['GET'])
def get_weekly_delivery_items():
    """
    Get weekly delivery pool items with local server prices and global market stats.

    Query parameters:
    - server_id: Optional server ID to show local market prices
    - search: Search by item name (optional, partial match)
    - active_only: Return only active delivery items (default true)
    """
    server_id = request.args.get('server_id', type=int)
    search = request.args.get('search', '').strip()
    active_only = request.args.get('active_only', 'true').lower() != 'false'

    try:
        with get_db() as conn:
            selected_server = None
            if server_id:
                cursor = conn.execute(
                    "SELECT id, name FROM servers WHERE id = ?",
                    (server_id,)
                )
                selected_server = cursor.fetchone()
                if not selected_server:
                    raise NotFound(f"Server with ID {server_id} not found")

            query = """
                WITH global_stats AS (
                    SELECT
                        item_id,
                        ROUND(AVG(NULLIF(sell_offer, 0)), 2) AS global_avg_sell_price,
                        ROUND(AVG(NULLIF(buy_offer, 0)), 2) AS global_avg_buy_price,
                        COALESCE(SUM(buy_offers), 0) AS estimated_demand,
                        COALESCE(SUM(sell_offers), 0) AS global_supply,
                        COALESCE(SUM(buy_offers + sell_offers), 0) AS global_activity,
                        COUNT(DISTINCT server_id) AS global_server_count
                    FROM market_current
                    GROUP BY item_id
                )
                SELECT
                    wdi.item_id,
                    i.name AS item_name,
                    i.category AS item_category,
                    i.tier AS item_tier,
                    i.wiki_name,
                    i.best_npc_buy_price,
                    i.best_npc_buy_npcs,
                    i.best_npc_sell_price,
                    i.best_npc_sell_npcs,
                    COALESCE(i.best_npc_buy_price, i.best_npc_sell_price) AS npc_price,
                    COALESCE(wdi.is_active, 1) AS is_active,
                    wdi.source_order,
                    wdi.source_market_value,
                    wdi.notes,
                    wdi.added_at,
                    wdi.updated_at,
                    mc.buy_offer AS server_buy_price,
                    mc.sell_offer AS server_sell_price,
                    mc.buy_offers AS server_buy_offers,
                    mc.sell_offers AS server_sell_offers,
                    mc.time AS server_updated_at,
                    COALESCE(gs.global_avg_sell_price, 0) AS global_avg_sell_price,
                    COALESCE(gs.global_avg_buy_price, 0) AS global_avg_buy_price,
                    COALESCE(gs.estimated_demand, 0) AS estimated_demand,
                    COALESCE(gs.global_supply, 0) AS global_supply,
                    COALESCE(gs.global_activity, 0) AS global_activity,
                    COALESCE(gs.global_server_count, 0) AS global_server_count
                FROM weekly_delivery_items wdi
                JOIN items i ON i.id = wdi.item_id
                LEFT JOIN global_stats gs ON gs.item_id = i.id
                LEFT JOIN market_current mc ON mc.item_id = i.id AND mc.server_id = ?
                WHERE 1=1
            """
            params = [server_id or 0]

            if active_only:
                query += " AND wdi.is_active = 1"

            if search:
                query += " AND i.name LIKE ?"
                params.append(f"%{search}%")

            query += " ORDER BY COALESCE(wdi.source_order, 999999), i.name"

            cursor = conn.execute(query, params)
            items = [dict(row) for row in cursor.fetchall()]

            response = ApiResponse(
                success=True,
                data={
                    "server_id": server_id,
                    "server_name": selected_server["name"] if selected_server else None,
                    "delivery_items": items
                },
                count=len(items)
            )
            return jsonify(response.model_dump())

    except sqlite3.Error as e:
        logger.error(f"Database error in get_weekly_delivery_items: {e}")
        raise
