"""Item endpoints."""

import logging
import sqlite3
from flask import Blueprint, jsonify, request
from werkzeug.exceptions import NotFound

from backend import get_db
from backend.models import ApiResponse

logger = logging.getLogger(__name__)

items_bp = Blueprint('items', __name__)


@items_bp.route('/api/items', methods=['GET'])
def get_items():
    """
    Get all items with optional filtering.
    
    Query parameters:
    - category: Filter by item category
    - tier: Filter by item tier
    - search: Search by name (partial match)
    """
    try:
        with get_db() as conn:
            query = "SELECT * FROM items WHERE 1=1"
            params = []
            
            # Apply filters
            category = request.args.get('category')
            if category:
                query += " AND category = ?"
                params.append(category)
            
            tier = request.args.get('tier')
            if tier:
                query += " AND tier = ?"
                params.append(tier)
            
            search = request.args.get('search')
            if search:
                query += " AND name LIKE ?"
                params.append(f"%{search}%")
            
            query += " ORDER BY name"
            
            # Pagination
            limit = request.args.get('limit', 100, type=int)
            offset = request.args.get('offset', 0, type=int)
            query += " LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            items = [dict(row) for row in rows]
            
            response = ApiResponse(
                success=True,
                data={"items": items},
                count=len(items)
            )
            return jsonify(response.model_dump())
            
    except sqlite3.Error as e:
        logger.error(f"Database error in get_items: {e}")
        raise


@items_bp.route('/api/items/<int:item_id>', methods=['GET'])
def get_item(item_id: int):
    """Get a specific item by ID."""
    try:
        with get_db() as conn:
            cursor = conn.execute(
                "SELECT * FROM items WHERE id = ?",
                (item_id,)
            )
            row = cursor.fetchone()
            
            if not row:
                raise NotFound(f"Item with ID {item_id} not found")
            
            response = ApiResponse(
                success=True,
                data={"item": dict(row)}
            )
            return jsonify(response.model_dump())
            
    except sqlite3.Error as e:
        logger.error(f"Database error in get_item: {e}")
        raise
