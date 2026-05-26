"""
Tibia Data Vault Flask API

Provides REST endpoints for accessing Tibia game data.
"""

import logging
import sqlite3
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import BadRequest, NotFound

from backend import (
    get_db,
    init_db,
    check_db_health,
    API_HOST,
    API_PORT,
    API_DEBUG,
    LOG_LEVEL,
    LOG_FORMAT,
)
from backend.models import Server, Item, MarketCurrent, ApiResponse, ErrorResponse

# Configure logging
logging.basicConfig(level=getattr(logging, LOG_LEVEL), format=LOG_FORMAT)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


@app.errorhandler(BadRequest)
def handle_bad_request(error):
    """Handle 400 Bad Request errors."""
    logger.warning(f"Bad request: {error}")
    response = ErrorResponse(error=str(error.description), details="Invalid request data")
    return jsonify(response.model_dump()), 400


@app.errorhandler(NotFound)
def handle_not_found(error):
    """Handle 404 Not Found errors."""
    logger.warning(f"Resource not found: {request.path}")
    response = ErrorResponse(error="Resource not found", details=str(error.description))
    return jsonify(response.model_dump()), 404


@app.errorhandler(sqlite3.Error)
def handle_db_error(error):
    """Handle database errors."""
    logger.error(f"Database error: {error}")
    response = ErrorResponse(error="Database error", details="An error occurred while accessing the database")
    return jsonify(response.model_dump()), 500


@app.errorhandler(Exception)
def handle_generic_error(error):
    """Handle unexpected errors."""
    logger.exception(f"Unhandled error: {error}")
    response = ErrorResponse(error="Internal server error", details="An unexpected error occurred")
    return jsonify(response.model_dump()), 500


@app.before_request
def log_request():
    """Log incoming requests."""
    logger.info(f"{request.method} {request.path} - {request.remote_addr}")


# =============================================================================
# Health & Status Endpoints
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    health = check_db_health()
    
    if health["connected"]:
        response = ApiResponse(
            success=True,
            data={"database": health},
            message="Service is healthy"
        )
        return jsonify(response.model_dump()), 200
    else:
        response = ErrorResponse(
            error="Service unhealthy",
            details=health.get("error", "Database connection failed")
        )
        return jsonify(response.model_dump()), 503


# =============================================================================
# Server Endpoints
# =============================================================================

@app.route('/api/servers', methods=['GET'])
def get_servers():
    """
    Get all servers with optional filtering.
    
    Query parameters:
    - region: Filter by region (EU, NA, SA, OCE)
    - pvp_type: Filter by PvP type
    - battleye: Filter by BattlEye status (Green, Yellow)
    """
    try:
        with get_db() as conn:
            query = "SELECT * FROM servers WHERE 1=1"
            params = []
            
            # Apply filters
            region = request.args.get('region')
            if region:
                query += " AND region = ?"
                params.append(region)
            
            pvp_type = request.args.get('pvp_type')
            if pvp_type:
                query += " AND pvp_type = ?"
                params.append(pvp_type)
            
            battleye = request.args.get('battleye')
            if battleye:
                query += " AND battleye = ?"
                params.append(battleye)
            
            query += " ORDER BY name"
            
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            servers = [dict(row) for row in rows]
            
            response = ApiResponse(
                success=True,
                data={"servers": servers},
                count=len(servers)
            )
            return jsonify(response.model_dump())
            
    except sqlite3.Error as e:
        logger.error(f"Database error in get_servers: {e}")
        raise


@app.route('/api/servers/<int:server_id>', methods=['GET'])
def get_server(server_id: int):
    """Get a specific server by ID."""
    try:
        with get_db() as conn:
            cursor = conn.execute(
                "SELECT * FROM servers WHERE id = ?",
                (server_id,)
            )
            row = cursor.fetchone()
            
            if not row:
                raise NotFound(f"Server with ID {server_id} not found")
            
            response = ApiResponse(
                success=True,
                data={"server": dict(row)}
            )
            return jsonify(response.model_dump())
            
    except sqlite3.Error as e:
        logger.error(f"Database error in get_server: {e}")
        raise


# =============================================================================
# Item Endpoints
# =============================================================================

@app.route('/api/items', methods=['GET'])
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


@app.route('/api/items/<int:item_id>', methods=['GET'])
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


# =============================================================================
# Market Data Endpoints
# =============================================================================

@app.route('/api/market/current', methods=['GET'])
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


@app.route('/api/market/history', methods=['GET'])
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


@app.route('/api/market/stats', methods=['GET'])
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


@app.route('/api/market/global-key-items', methods=['GET'])
def get_global_key_items():
    """
    Get global market statistics for key items:
    Tibia Coins, Gold Token, Silver Token
    """
    KEY_ITEM_IDS = (22118, 22516, 22721)
    
    try:
        with get_db() as conn:
            cursor = conn.execute("""
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
                WHERE i.id IN (?, ?, ?)
                GROUP BY i.id
                ORDER BY 
                    CASE i.id
                        WHEN 22118 THEN 1
                        WHEN 22721 THEN 2
                        WHEN 22516 THEN 3
                    END
            """, KEY_ITEM_IDS)
            
            items = []
            for row in cursor.fetchall():
                item = dict(row)
                item['avg_buy'] = int(item['avg_buy'])
                item['avg_sell'] = int(item['avg_sell'])
                items.append(item)
            
            # Get total servers for coverage percentage
            cursor = conn.execute("SELECT COUNT(*) as count FROM servers")
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


# =============================================================================
# Exporteitor - Export Opportunities
# =============================================================================

@app.route('/api/export/opportunities', methods=['GET'])
def get_export_opportunities():
    """
    Get export opportunities from a source server to Optional PvP servers.
    
    Query parameters:
    - source_server_id: Source server ID (required)
    - item_name: Filter by item name (optional, partial match)
    """
    source_server_id = request.args.get('source_server_id', type=int)
    if not source_server_id:
        raise BadRequest("source_server_id is required")
    
    item_name_filter = request.args.get('item_name', '').strip()
    
    try:
        with get_db() as conn:
            # Verify source server exists
            cursor = conn.execute(
                "SELECT id, name FROM servers WHERE id = ?",
                (source_server_id,)
            )
            source_server = cursor.fetchone()
            if not source_server:
                raise NotFound(f"Source server with ID {source_server_id} not found")
            
            # Build query for items with market data on source server
            query = """
                SELECT 
                    i.id as item_id,
                    i.name as item_name,
                    i.category as item_category,
                    mc_source.sell_offer as source_price,
                    mc_source.buy_offers as source_buy_offers,
                    mc_source.sell_offers as source_sell_offers
                FROM items i
                JOIN market_current mc_source ON i.id = mc_source.item_id
                WHERE mc_source.server_id = ?
                  AND mc_source.sell_offer > 0
            """
            params = [source_server_id]
            
            # Add item name filter if provided
            if item_name_filter:
                query += " AND i.name LIKE ?"
                params.append(f"%{item_name_filter}%")
            
            query += " ORDER BY i.name"
            
            cursor = conn.execute(query, params)
            source_items = cursor.fetchall()
            
            if not source_items:
                return jsonify(ApiResponse(
                    success=True,
                    data={
                        "source_server_id": source_server_id,
                        "source_server_name": source_server["name"],
                        "opportunities": []
                    },
                    count=0
                ).model_dump())
            
            # Get all Optional PvP servers
            cursor = conn.execute(
                "SELECT id, name FROM servers WHERE pvp_type = 'Optional PvP' ORDER BY name"
            )
            optional_pvp_servers = cursor.fetchall()
            
            opportunities = []
            
            for item in source_items:
                item_id = item["item_id"]
                
                # Get market data for this item on all Optional PvP servers (excluding blocked and source)
                cursor = conn.execute("""
                    SELECT 
                        s.id as server_id,
                        s.name as server_name,
                        mc.sell_offer as sell_price,
                        mc.buy_offer as buy_price,
                        mc.buy_offers,
                        mc.sell_offers
                    FROM servers s
                    JOIN market_current mc ON s.id = mc.server_id
                    WHERE s.pvp_type = 'Optional PvP'
                      AND (s.notes IS NULL OR s.notes != 'blocked')
                      AND s.id != ?
                      AND mc.item_id = ?
                      AND (mc.sell_offer > 0 OR mc.buy_offer > 0)
                    ORDER BY s.name
                """, (source_server_id, item_id,))
                
                target_servers = [dict(row) for row in cursor.fetchall()]
                
                # Calculate averages for Optional PvP servers
                if target_servers:
                    # Average sell price (what you'd list items for)
                    sell_prices = [ts["sell_price"] for ts in target_servers if ts["sell_price"] > 0]
                    avg_sell_price = sum(sell_prices) / len(sell_prices) if sell_prices else 0
                    
                    # Average buy price (instant sell to buyers)
                    buy_prices = [ts["buy_price"] for ts in target_servers if ts["buy_price"] > 0]
                    avg_buy_price = sum(buy_prices) / len(buy_prices) if buy_prices else 0
                    
                    total_activity = sum(ts["buy_offers"] + ts["sell_offers"] for ts in target_servers)
                    
                    # Calculate profit margins based on source price
                    source_price = item["source_price"]
                    profit_sell_pct = ((avg_sell_price - source_price) / source_price * 100) if source_price > 0 and avg_sell_price > 0 else 0
                    profit_buy_pct = ((avg_buy_price - source_price) / source_price * 100) if source_price > 0 and avg_buy_price > 0 else 0
                    
                    opportunities.append({
                        "item_id": item_id,
                        "item_name": item["item_name"],
                        "item_category": item["item_category"],
                        "source_price": source_price,
                        "source_buy_offers": item["source_buy_offers"],
                        "source_sell_offers": item["source_sell_offers"],
                        "avg_sell_price": round(avg_sell_price, 2),
                        "avg_buy_price": round(avg_buy_price, 2),
                        "profit_sell_pct": round(profit_sell_pct, 2),
                        "profit_buy_pct": round(profit_buy_pct, 2),
                        "total_activity": total_activity,
                        "target_server_count": len(target_servers),
                        "target_servers": target_servers
                    })
            
            # Sort by total activity (descending)
            opportunities.sort(key=lambda x: x["total_activity"], reverse=True)
            
            response = ApiResponse(
                success=True,
                data={
                    "source_server_id": source_server_id,
                    "source_server_name": source_server["name"],
                    "opportunities": opportunities
                },
                count=len(opportunities)
            )
            return jsonify(response.model_dump())
            
    except sqlite3.Error as e:
        logger.error(f"Database error in get_export_opportunities: {e}")
        raise


# =============================================================================
# Application Startup
# =============================================================================

@app.before_request
def check_db():
    """Verify database is accessible on first request."""
    if not hasattr(app, '_db_checked'):
        try:
            init_db()
            app._db_checked = True
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")


def run_app():
    """Entry point for running the Flask application."""
    logger.info(f"Starting Tibia Data Vault API on {API_HOST}:{API_PORT}")
    app.run(host=API_HOST, port=API_PORT, debug=API_DEBUG)


if __name__ == '__main__':
    run_app()
