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

    pvp_type = request.args.get('pvp_type', '').strip()
    battleye = request.args.get('battleye', '').strip()
    exclude_blocked = request.args.get('exclude_blocked', 'false').strip().lower() == 'true'

    try:
        with get_db() as conn:
            filters = "AND (mc.buy_offer > 0 OR mc.sell_offer > 0)"
            params: list = [item_id]

            if pvp_type:
                filters += " AND s.pvp_type = ?"
                params.append(pvp_type)
            if battleye:
                filters += " AND s.battleye = ?"
                params.append(battleye)
            if exclude_blocked:
                filters += " AND (s.notes IS NULL OR s.notes != 'blocked')"

            cursor = conn.execute(f"""
                SELECT
                    s.id as server_id,
                    s.name as server_name,
                    s.pvp_type,
                    s.battleye,
                    COALESCE(mc.buy_offer, 0) as buy_offer,
                    COALESCE(mc.sell_offer, 0) as sell_offer,
                    COALESCE(mc.buy_offers, 0) as buy_offers,
                    COALESCE(mc.sell_offers, 0) as sell_offers
                FROM market_current mc
                JOIN servers s ON s.id = mc.server_id
                WHERE mc.item_id = ?
                  {filters}
                ORDER BY mc.buy_offer DESC
            """, params)
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


@market_bp.route('/api/market/server-items', methods=['GET'])
def get_server_items():
    """
    Get all items with active offers on a specific server.

    Query parameters:
    - server_id: Required. The server to look up.
    - search: Optional item name filter.
    - sort_by: name | buy_offer | sell_offer | activity. Default: activity
    - sort_dir: asc | desc. Default: desc
    """
    server_id = request.args.get('server_id', type=int)
    if not server_id:
        return jsonify(ApiResponse(
            success=False,
            data={"items": []},
            message="server_id is required"
        ).model_dump()), 400

    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    sort_by = request.args.get('sort_by', 'activity').strip()
    sort_dir = request.args.get('sort_dir', 'desc').strip().lower()

    ALLOWED_SORT = {'name': 'i.name', 'buy_offer': 'mc.buy_offer', 'sell_offer': 'mc.sell_offer', 'activity': 'mc.buy_offers + mc.sell_offers', 'global_avg_sell': 'ms.global_avg_sell'}
    sort_col = ALLOWED_SORT.get(sort_by, 'mc.buy_offers + mc.sell_offers')
    if sort_dir not in ('asc', 'desc'):
        sort_dir = 'desc'

    try:
        with get_db() as conn:
            params: list = [server_id]
            where = "WHERE mc.server_id = ? AND (mc.buy_offer > 0 OR mc.sell_offer > 0)"
            if search:
                where += " AND i.name LIKE ?"
                params.append(f"%{search}%")
            if category:
                where += " AND i.category = ?"
                params.append(category)

            cursor = conn.execute(f"""
                SELECT
                    i.id AS item_id,
                    i.name,
                    i.category,
                    i.best_npc_buy_price,
                    i.best_npc_sell_price,
                    COALESCE(mc.buy_offer, 0) AS buy_offer,
                    COALESCE(mc.sell_offer, 0) AS sell_offer,
                    COALESCE(mc.buy_offers, 0) AS buy_offers,
                    COALESCE(mc.sell_offers, 0) AS sell_offers,
                    COALESCE(ms.global_avg_sell, 0) AS global_avg_sell
                FROM market_current mc
                JOIN items i ON i.id = mc.item_id
                LEFT JOIN market_summary ms ON ms.item_id = mc.item_id
                {where}
                ORDER BY {sort_col} {sort_dir.upper()}
            """, params)
            items = [dict(row) for row in cursor.fetchall()]

            response = ApiResponse(
                success=True,
                data={"items": items},
                count=len(items)
            )
            return jsonify(response.model_dump())

    except sqlite3.Error as e:
        logger.error(f"Database error in get_server_items: {e}")
        raise


@market_bp.route('/api/market/browse', methods=['GET'])
def browse_market():
    """
    Browse all market items with global price summaries.

    Query parameters:
    - search: Filter by item name (partial match)
    - category: Filter by item category
    - pvp_type: Filter summary averages by server PvP type
    - battleye: Filter summary averages by BattlEye status (Green/Yellow)
    - exclude_blocked: If 'true', excludes blocked servers from averages
    - sort_by: Column to sort by (name, global_avg_buy, global_avg_sell, active_servers, top_activity). Default: top_activity
    - sort_dir: asc or desc. Default: desc
    - limit: Page size (default 100)
    - offset: Pagination offset (default 0)
    """
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    pvp_type = request.args.get('pvp_type', '').strip()
    battleye = request.args.get('battleye', '').strip()
    exclude_blocked = request.args.get('exclude_blocked', 'false').strip().lower() == 'true'
    sort_by = request.args.get('sort_by', 'top_activity').strip()
    sort_dir = request.args.get('sort_dir', 'desc').strip().lower()
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)

    ALLOWED_SORT = {'name', 'global_avg_buy', 'global_avg_sell', 'active_servers', 'top_activity'}
    if sort_by not in ALLOWED_SORT:
        sort_by = 'top_activity'
    if sort_dir not in ('asc', 'desc'):
        sort_dir = 'desc'

    try:
        with get_db() as conn:
            if pvp_type or battleye or exclude_blocked:
                server_filter = "WHERE 1=1"
                server_params: list = []
                if pvp_type:
                    server_filter += " AND s.pvp_type = ?"
                    server_params.append(pvp_type)
                if battleye:
                    server_filter += " AND s.battleye = ?"
                    server_params.append(battleye)
                if exclude_blocked:
                    server_filter += " AND (s.notes IS NULL OR s.notes != 'blocked')"

                subquery = f"""
                    SELECT
                        mc.item_id,
                        COUNT(DISTINCT mc.server_id) AS active_servers,
                        ROUND(AVG(NULLIF(mc.buy_offer, 0)), 0) AS global_avg_buy,
                        ROUND(AVG(NULLIF(mc.sell_offer, 0)), 0) AS global_avg_sell,
                        MAX(mc.buy_offers + mc.sell_offers) AS top_activity
                    FROM market_current mc
                    JOIN servers s ON s.id = mc.server_id
                    {server_filter}
                    GROUP BY mc.item_id
                """

                query = f"""
                    SELECT
                        i.id AS item_id,
                        i.name,
                        i.category,
                        i.wiki_name,
                        i.best_npc_sell_price,
                        i.best_npc_buy_price,
                        COALESCE(agg.active_servers, 0) AS active_servers,
                        agg.global_avg_buy,
                        agg.global_avg_sell,
                        COALESCE(agg.top_activity, 0) AS top_activity
                    FROM items i
                    LEFT JOIN ({subquery}) agg ON agg.item_id = i.id
                    WHERE 1=1
                """
                params = server_params[:]
            else:
                query = """
                    SELECT
                        i.id AS item_id,
                        i.name,
                        i.category,
                        i.wiki_name,
                        i.best_npc_sell_price,
                        i.best_npc_buy_price,
                        COALESCE(ms.active_servers, 0) AS active_servers,
                        ms.global_avg_buy,
                        ms.global_avg_sell,
                        COALESCE(ms.top_activity, 0) AS top_activity
                    FROM items i
                    LEFT JOIN market_summary ms ON ms.item_id = i.id
                    WHERE 1=1
                """
                params = []

            if search:
                query += " AND i.name LIKE ?"
                params.append(f"%{search}%")
            if category:
                query += " AND i.category = ?"
                params.append(category)

            sort_col = sort_by if sort_by != 'name' else 'i.name'

            count_query = f"SELECT COUNT(*) as total FROM ({query})"
            cursor = conn.execute(count_query, params)
            total = cursor.fetchone()["total"]

            query += f" ORDER BY {sort_col} {sort_dir.upper()} LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor = conn.execute(query, params)
            items = []
            for row in cursor.fetchall():
                item = dict(row)
                if item.get('global_avg_buy') is not None:
                    item['global_avg_buy'] = int(item['global_avg_buy'])
                if item.get('global_avg_sell') is not None:
                    item['global_avg_sell'] = int(item['global_avg_sell'])
                items.append(item)

            response = ApiResponse(
                success=True,
                data={"items": items, "total": total, "limit": limit, "offset": offset},
                count=len(items)
            )
            return jsonify(response.model_dump())

    except sqlite3.Error as e:
        logger.error(f"Database error in browse_market: {e}")
        raise


@market_bp.route('/api/market/categories', methods=['GET'])
def get_market_categories():
    """Get distinct item categories that have market data."""
    try:
        with get_db() as conn:
            cursor = conn.execute("""
                SELECT DISTINCT i.category
                FROM items i
                JOIN market_summary ms ON ms.item_id = i.id
                WHERE ms.active_servers > 0 AND i.category IS NOT NULL
                ORDER BY i.category
            """)
            categories = [row["category"] for row in cursor.fetchall()]
            response = ApiResponse(
                success=True,
                data={"categories": categories},
                count=len(categories)
            )
            return jsonify(response.model_dump())
    except sqlite3.Error as e:
        logger.error(f"Database error in get_market_categories: {e}")
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
