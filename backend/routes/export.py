"""Export opportunities endpoints."""

import logging
import sqlite3
from flask import Blueprint, jsonify, request
from werkzeug.exceptions import BadRequest, NotFound

from backend import get_db
from backend.models import ApiResponse

logger = logging.getLogger(__name__)

export_bp = Blueprint('export', __name__)


@export_bp.route('/api/export/opportunities', methods=['GET'])
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
