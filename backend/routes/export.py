"""Export opportunities endpoints."""

import logging
import math
import sqlite3
from statistics import median
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


PVP_DESTINATIONS = {
    "Retro Hardcore PvP": ["Retro Hardcore PvP", "Hardcore PvP", "Retro Open PvP", "Open PvP", "Optional PvP"],
    "Hardcore PvP": ["Hardcore PvP", "Retro Open PvP", "Open PvP", "Optional PvP"],
    "Retro Open PvP": ["Retro Open PvP", "Open PvP", "Optional PvP"],
    "Open PvP": ["Open PvP", "Optional PvP"],
    "Optional PvP": ["Optional PvP"],
}


@export_bp.route('/api/export/source-opportunities', methods=['GET'])
def get_source_opportunities():
    source_server_id = request.args.get('source_server_id', type=int)
    if not source_server_id:
        raise BadRequest("source_server_id is required")
    destination_server_id = request.args.get('destination_server_id', type=int)
    category = request.args.get('category', '').strip()

    search = request.args.get('search', '').strip()
    min_discount = max(0, request.args.get('min_discount', 10, type=float))
    min_roi = request.args.get('min_roi', 0, type=float)
    sort_by = request.args.get('sort_by', 'balanced').strip()
    limit = min(200, max(1, request.args.get('limit', 50, type=int)))
    if sort_by not in {'balanced', 'instant_profit', 'projected_profit', 'instant_roi', 'projected_roi', 'discount', 'activity'}:
        sort_by = 'balanced'

    try:
        with get_db() as conn:
            source = conn.execute(
                "SELECT id, name, pvp_type, battleye FROM servers WHERE id = ?",
                (source_server_id,)
            ).fetchone()
            if not source:
                raise NotFound(f"Source server with ID {source_server_id} not found")

            allowed_pvp = PVP_DESTINATIONS.get(source["pvp_type"], [])
            if not allowed_pvp:
                return jsonify(ApiResponse(success=True, data={"source": dict(source), "opportunities": []}, count=0).model_dump())

            pvp_placeholders = ','.join('?' for _ in allowed_pvp)
            params = [source_server_id, *allowed_pvp, source_server_id]
            battleye_filter = ""
            if source["battleye"] == "Yellow":
                battleye_filter = " AND destination.battleye = 'Yellow'"
            search_filter = ""
            if search:
                search_filter = " AND item.name LIKE ?"
                params.append(f"%{search}%")

            category_filter = ""
            if category:
                category_filter = " AND item.category = ?"
                params.append(category)

            destination_filter = ""
            if destination_server_id:
                destination_filter = " AND destination.id = ?"
                params.append(destination_server_id)

            rows = conn.execute(f"""
                WITH tc_prices AS (
                    SELECT
                        market.server_id,
                        AVG(NULLIF(market.buy_offer, 0)) AS tc_buy_price,
                        AVG(NULLIF(market.sell_offer, 0)) AS tc_sell_price
                    FROM market_current market
                    WHERE market.item_id IN (SELECT id FROM items WHERE name LIKE '%tibia coin%')
                    GROUP BY market.server_id
                )
                SELECT
                    item.id AS item_id,
                    item.name AS item_name,
                    item.category AS item_category,
                    source_market.sell_offer AS source_price,
                    source_market.buy_offers AS source_buy_offers,
                    source_market.sell_offers AS source_sell_offers,
                    source_tc.tc_sell_price AS source_tc_price,
                    destination.id AS destination_server_id,
                    destination.name AS destination_server_name,
                    destination.pvp_type AS destination_pvp_type,
                    destination.battleye AS destination_battleye,
                    destination_market.buy_offer AS destination_buy_offer,
                    destination_market.sell_offer AS destination_sell_offer,
                    destination_market.buy_offers AS destination_buy_offers,
                    destination_market.sell_offers AS destination_sell_offers,
                    destination_tc.tc_sell_price AS destination_tc_price
                FROM market_current source_market
                JOIN items item ON item.id = source_market.item_id
                JOIN tc_prices source_tc ON source_tc.server_id = source_market.server_id
                JOIN market_current destination_market ON destination_market.item_id = source_market.item_id
                JOIN servers destination ON destination.id = destination_market.server_id
                JOIN tc_prices destination_tc ON destination_tc.server_id = destination.id
                WHERE source_market.server_id = ?
                  AND source_market.sell_offer > 0
                  AND destination.pvp_type IN ({pvp_placeholders})
                  AND destination.id != ?
                  AND (destination.notes IS NULL OR destination.notes != 'blocked')
                  {battleye_filter}
                  AND (destination_market.buy_offer > 0 OR destination_market.sell_offer > 0)
                  {search_filter}
                  {category_filter}
                  {destination_filter}
                ORDER BY item.id
            """, params).fetchall()

            grouped = {}
            for row in rows:
                grouped.setdefault(row["item_id"], []).append(row)

            opportunities = []
            for item_rows in grouped.values():
                first = item_rows[0]
                source_price = first["source_price"]
                source_tc_price = first["source_tc_price"] or 0
                if source_tc_price <= 0:
                    continue
                source_cost_tc = source_price / source_tc_price
                sell_prices = [row["destination_sell_offer"] for row in item_rows if row["destination_sell_offer"] > 0]
                if not sell_prices:
                    continue
                median_sell = median(sell_prices)
                discount_pct = (median_sell - source_price) / median_sell * 100 if median_sell else 0
                if discount_pct < min_discount:
                    continue

                destinations = []
                for row in item_rows:
                    destination_tc_price = row["destination_tc_price"] or 0
                    if destination_tc_price <= 0:
                        continue
                    instant_revenue_tc = row["destination_buy_offer"] / destination_tc_price if row["destination_buy_offer"] > 0 else 0
                    projected_revenue_tc = row["destination_sell_offer"] / destination_tc_price if row["destination_sell_offer"] > 0 else 0
                    instant_profit_tc = instant_revenue_tc - source_cost_tc if instant_revenue_tc else -source_cost_tc
                    projected_profit_tc = projected_revenue_tc - source_cost_tc if projected_revenue_tc else -source_cost_tc
                    instant_roi = instant_profit_tc / source_cost_tc * 100 if source_cost_tc else 0
                    projected_roi = projected_profit_tc / source_cost_tc * 100 if source_cost_tc else 0
                    activity = row["destination_buy_offers"] + row["destination_sell_offers"]
                    confidence = min(1, math.log1p(activity) / math.log(21))
                    executable_profit = instant_profit_tc if row["destination_buy_offer"] > 0 else projected_profit_tc * 0.65
                    destinations.append({
                        "server_id": row["destination_server_id"],
                        "server_name": row["destination_server_name"],
                        "pvp_type": row["destination_pvp_type"],
                        "battleye": row["destination_battleye"],
                        "buy_offer": row["destination_buy_offer"],
                        "sell_offer": row["destination_sell_offer"],
                        "buy_offers": row["destination_buy_offers"],
                        "sell_offers": row["destination_sell_offers"],
                        "tc_price": round(destination_tc_price),
                        "instant_profit_tc": round(instant_profit_tc, 4),
                        "projected_profit_tc": round(projected_profit_tc, 4),
                        "instant_roi": round(instant_roi, 2),
                        "projected_roi": round(projected_roi, 2),
                        "activity": activity,
                        "balanced_score": round(executable_profit * (0.35 + confidence * 0.65), 4),
                    })

                if not destinations:
                    continue
                instant = max(destinations, key=lambda destination: destination["instant_profit_tc"])
                projected = max(destinations, key=lambda destination: destination["projected_profit_tc"])
                balanced = max(destinations, key=lambda destination: destination["balanced_score"])
                if max(instant["instant_roi"], projected["projected_roi"]) < min_roi:
                    continue
                opportunities.append({
                    "item_id": first["item_id"],
                    "item_name": first["item_name"],
                    "item_category": first["item_category"],
                    "source_price": source_price,
                    "source_tc_price": round(source_tc_price),
                    "source_buy_offers": first["source_buy_offers"],
                    "source_sell_offers": first["source_sell_offers"],
                    "compatible_median_sell": round(median_sell),
                    "discount_pct": round(discount_pct, 2),
                    "destination_count": len(destinations),
                    "total_activity": sum(destination["activity"] for destination in destinations),
                    "best_instant": instant,
                    "best_projected": projected,
                    "best_balanced": balanced,
                })

            sort_keys = {
                "balanced": lambda opportunity: opportunity["best_balanced"]["balanced_score"],
                "instant_profit": lambda opportunity: opportunity["best_instant"]["instant_profit_tc"],
                "projected_profit": lambda opportunity: opportunity["best_projected"]["projected_profit_tc"],
                "instant_roi": lambda opportunity: opportunity["best_instant"]["instant_roi"],
                "projected_roi": lambda opportunity: opportunity["best_projected"]["projected_roi"],
                "discount": lambda opportunity: opportunity["discount_pct"],
                "activity": lambda opportunity: opportunity["total_activity"],
            }
            opportunities.sort(key=sort_keys[sort_by], reverse=True)
            opportunities = opportunities[:limit]

            return jsonify(ApiResponse(
                success=True,
                data={"source": dict(source), "opportunities": opportunities},
                count=len(opportunities)
            ).model_dump())
    except sqlite3.Error as e:
        logger.error(f"Database error in get_source_opportunities: {e}")
        raise
