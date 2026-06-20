"""Market data endpoints."""

import logging
import sqlite3
from datetime import datetime
from flask import Blueprint, jsonify, request

from backend import get_db
from backend.models import ApiResponse

logger = logging.getLogger(__name__)

market_bp = Blueprint('market', __name__)


@market_bp.route('/api/market/current', methods=['GET'])
def get_market_current():
    """
    Get current market data.
    
    Query parameters:
    - server_id: Filter by server
    - item_id: Filter by item
    """
    try:
        with get_db() as conn:
            query = """
                SELECT mc.*, i.name as item_name, s.name as server_name
                FROM market_current mc
                JOIN items i ON mc.item_id = i.id
                JOIN servers s ON mc.server_id = s.id
                WHERE 1=1
            """
            params = []
            
            server_id = request.args.get('server_id', type=int)
            if server_id:
                query += " AND mc.server_id = ?"
                params.append(server_id)
            
            item_id = request.args.get('item_id', type=int)
            if item_id:
                query += " AND mc.item_id = ?"
                params.append(item_id)
            
            query += " ORDER BY s.name, i.name"
            
            limit = request.args.get('limit', 1000, type=int)
            query += " LIMIT ?"
            params.append(limit)
            
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            data = [dict(row) for row in rows]
            
            response = ApiResponse(
                success=True,
                data={"market_data": data},
                count=len(data)
            )
            return jsonify(response.model_dump())
            
    except sqlite3.Error as e:
        logger.error(f"Database error in get_market_current: {e}")
        raise


@market_bp.route('/api/market/history', methods=['GET'])
def get_market_history():
    """
    Get market history data.
    
    Query parameters:
    - server_id: Filter by server
    - item_id: Filter by item
    - limit: Maximum records to return (default 1000)
    """
    try:
        with get_db() as conn:
            query = """
                SELECT mh.*, i.name as item_name, s.name as server_name
                FROM market_history mh
                JOIN items i ON mh.item_id = i.id
                JOIN servers s ON mh.server_id = s.id
                WHERE 1=1
            """
            params = []
            
            server_id = request.args.get('server_id', type=int)
            if server_id:
                query += " AND mh.server_id = ?"
                params.append(server_id)
            
            item_id = request.args.get('item_id', type=int)
            if item_id:
                query += " AND mh.item_id = ?"
                params.append(item_id)
            
            query += " ORDER BY mh.time DESC"
            
            limit = request.args.get('limit', 1000, type=int)
            query += " LIMIT ?"
            params.append(limit)
            
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            data = [dict(row) for row in rows]
            
            response = ApiResponse(
                success=True,
                data={"history": data},
                count=len(data)
            )
            return jsonify(response.model_dump())
            
    except sqlite3.Error as e:
        logger.error(f"Database error in get_market_history: {e}")
        raise


@market_bp.route('/api/market/item-servers', methods=['GET'])
def get_item_servers():
    """
    Get per-server buy/sell prices for a specific item across Optional PvP servers.
    Used for the breakdown tooltips (top servers for an item).

    Query parameters:
    - item_id: Required. The item to look up.
    """
    item_id = request.args.get('item_id', type=int)
    if not item_id:
        return jsonify(ApiResponse(
            success=False,
            data={"servers": []},
            message="item_id is required"
        ).model_dump()), 400

    try:
        with get_db() as conn:
            cursor = conn.execute("""
                SELECT
                    s.id as server_id,
                    s.name as server_name,
                    s.battleye,
                    COALESCE(mc.buy_offer, 0) as buy_offer,
                    COALESCE(mc.sell_offer, 0) as sell_offer,
                    COALESCE(mc.buy_offers, 0) as buy_offers,
                    COALESCE(mc.sell_offers, 0) as sell_offers
                FROM market_current mc
                JOIN servers s ON s.id = mc.server_id
                WHERE mc.item_id = ?
                  AND s.pvp_type = 'Optional PvP'
                  AND (s.notes IS NULL OR s.notes != 'blocked')
                  AND (mc.buy_offer > 0 OR mc.sell_offer > 0)
                ORDER BY mc.buy_offer DESC
            """, (item_id,))
            servers = [dict(row) for row in cursor.fetchall()]

            response = ApiResponse(
                success=True,
                data={"servers": servers},
                count=len(servers)
            )
            return jsonify(response.model_dump())

    except sqlite3.Error as e:
        logger.error(f"Database error in get_item_servers: {e}")
        raise


@market_bp.route('/api/market/stats', methods=['GET'])
def get_market_stats():
    """Get market statistics summary."""
    try:
        with get_db() as conn:
            stats = {}
            
            # Total records count
            cursor = conn.execute("SELECT COUNT(*) as count FROM market_current")
            stats["total_current_records"] = cursor.fetchone()["count"]
            
            cursor = conn.execute("SELECT COUNT(*) as count FROM market_history")
            stats["total_history_records"] = cursor.fetchone()["count"]
            
            # Server coverage
            cursor = conn.execute("""
                SELECT s.name, COUNT(mc.item_id) as item_count
                FROM servers s
                LEFT JOIN market_current mc ON s.id = mc.server_id
                GROUP BY s.id
                ORDER BY item_count DESC
            """)
            stats["server_coverage"] = [dict(row) for row in cursor.fetchall()]
            
            # Last update timestamps
            cursor = conn.execute("""
                SELECT name, market_last_fetch, api_last_update
                FROM servers
                WHERE market_last_fetch IS NOT NULL
                ORDER BY market_last_fetch DESC
            """)
            stats["last_updates"] = [dict(row) for row in cursor.fetchall()]
            
            response = ApiResponse(
                success=True,
                data=stats
            )
            return jsonify(response.model_dump())
            
    except sqlite3.Error as e:
        logger.error(f"Database error in get_market_stats: {e}")
        raise


@market_bp.route('/api/market/global-key-items', methods=['GET'])
def get_global_key_items():
    """
    Get global market statistics for key items:
    Tibia Coins, Gold Token, Silver Token

    Query parameters:
    - pvp_type: Filter by server PvP type (e.g. 'Optional PvP')
    - battleye: Filter by BattlEye status ('Green' or 'Yellow')
    - exclude_blocked: If 'true', excludes servers marked as blocked
    """
    KEY_ITEM_IDS = (22118, 22516, 22721)

    pvp_type = request.args.get('pvp_type', '').strip()
    battleye = request.args.get('battleye', '').strip()
    exclude_blocked = request.args.get('exclude_blocked', 'false').strip().lower() == 'true'

    server_filters = ""
    server_params: list = []

    if pvp_type:
        server_filters += " AND s.pvp_type = ?"
        server_params.append(pvp_type)
    if battleye:
        server_filters += " AND s.battleye = ?"
        server_params.append(battleye)
    if exclude_blocked:
        server_filters += " AND (s.notes IS NULL OR s.notes != 'blocked')"

    try:
        with get_db() as conn:
            query = f"""
                SELECT 
                    i.id as item_id,
                    i.name as item_name,
                    COUNT(DISTINCT mc.server_id) as server_count,
                    ROUND(AVG(mc.buy_offer), 0) as avg_buy,
                    ROUND(AVG(mc.sell_offer), 0) as avg_sell,
                    MIN(mc.buy_offer) as min_buy,
                    MAX(mc.buy_offer) as max_buy,
                    MIN(mc.sell_offer) as min_sell,
                    MAX(mc.sell_offer) as max_sell,
                    SUM(mc.buy_offers) as total_buy_offers,
                    SUM(mc.sell_offers) as total_sell_offers
                FROM items i
                JOIN market_current mc ON i.id = mc.item_id
                JOIN servers s ON s.id = mc.server_id
                WHERE i.id IN (?, ?, ?){server_filters}
                GROUP BY i.id
                ORDER BY 
                    CASE i.id
                        WHEN 22118 THEN 1
                        WHEN 22721 THEN 2
                        WHEN 22516 THEN 3
                    END
            """
            cursor = conn.execute(query, list(KEY_ITEM_IDS) + server_params)
            
            items = []
            for row in cursor.fetchall():
                item = dict(row)
                item['avg_buy'] = int(item['avg_buy']) if item['avg_buy'] is not None else 0
                item['avg_sell'] = int(item['avg_sell']) if item['avg_sell'] is not None else 0
                items.append(item)
            
            # Get total servers for coverage percentage (respecting the same filters)
            total_query = "SELECT COUNT(*) as count FROM servers s WHERE 1=1"
            total_params: list = []
            if pvp_type:
                total_query += " AND s.pvp_type = ?"
                total_params.append(pvp_type)
            if battleye:
                total_query += " AND s.battleye = ?"
                total_params.append(battleye)
            if exclude_blocked:
                total_query += " AND (s.notes IS NULL OR s.notes != 'blocked')"
            cursor = conn.execute(total_query, total_params)
            total_servers = cursor.fetchone()["count"]
            
            response = ApiResponse(
                success=True,
                data={
                    "items": items,
                    "total_servers": total_servers,
                    "last_updated": datetime.utcnow().isoformat()
                }
            )
            return jsonify(response.model_dump())
            
    except sqlite3.Error as e:
        logger.error(f"Database error in get_global_key_items: {e}")
        raise
