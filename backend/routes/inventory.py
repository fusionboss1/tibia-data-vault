"""Inventory and stash export plan endpoints."""

import logging
import re
import sqlite3
from flask import Blueprint, jsonify, request
from werkzeug.exceptions import BadRequest, NotFound

from backend import get_db
from backend.models import ApiResponse, StashImportRequest, StashImportResult

logger = logging.getLogger(__name__)

inventory_bp = Blueprint('inventory', __name__)

LOG_LINE_RE = re.compile(
    r'^\d{2}:\d{2}:\d{2}\s+Retrieved\s+(\d+)x\s+(.+?)\s*\.$',
    re.IGNORECASE
)


@inventory_bp.route('/api/inventory', methods=['GET'])
def get_inventory():
    """
    Get the current stash inventory, enriched with item data.

    Query parameters:
    - search: Filter by item name (partial match)
    - category: Filter by item category
    - server_id: Optional server ID to include market prices in best_unit_price
    """
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    server_id = request.args.get('server_id', type=int)
    weekly_only = request.args.get('weekly_only', '').lower() in ('1', 'true')
    price_filter = request.args.get('price_filter', 'all')  # all | opt_pvp | opt_pvp_green

    try:
        with get_db() as conn:
            query = """
                SELECT
                    si.id,
                    si.item_id,
                    si.item_name,
                    si.quantity,
                    si.updated_at,
                    i.category,
                    i.tier,
                    i.best_npc_buy_price,
                    i.best_npc_buy_npcs,
                    i.best_npc_sell_price,
                    i.best_npc_sell_npcs,
                    mc.buy_offer AS market_buy_offer,
                    mc.sell_offer AS market_sell_offer,
                    mc.time AS price_time
                FROM stash_inventory si
                JOIN items i ON i.id = si.item_id
                LEFT JOIN market_current mc ON mc.item_id = si.item_id AND mc.server_id = ?
                LEFT JOIN weekly_delivery_items wdi ON wdi.item_id = si.item_id
                WHERE 1=1
            """
            params = [server_id or 0]

            if search:
                query += " AND si.item_name LIKE ?"
                params.append(f"%{search}%")

            if category:
                query += " AND i.category = ?"
                params.append(category)

            if weekly_only:
                query += " AND wdi.item_id IS NOT NULL AND wdi.is_active = 1"

            query += " ORDER BY i.category, si.item_name"

            cursor = conn.execute(query, params)
            items = [dict(row) for row in cursor.fetchall()]

            cursor = conn.execute(
                "SELECT COUNT(*) as count FROM stash_inventory"
            )
            total = cursor.fetchone()["count"]

            response = ApiResponse(
                success=True,
                data={
                    "inventory": items,
                    "total_items": total,
                    "server_id": server_id
                },
                count=len(items)
            )
            return jsonify(response.model_dump())

    except sqlite3.Error as e:
        logger.error(f"Database error in get_inventory: {e}")
        raise


@inventory_bp.route('/api/inventory/import', methods=['POST'])
def import_inventory():
    """
    Parse a pasted server log and replace the entire stash inventory.

    Body (JSON):
    - log_text: raw text from the server log file
    """
    body = request.get_json(silent=True)
    if not body or not body.get('log_text', '').strip():
        raise BadRequest("log_text is required")

    payload = StashImportRequest(log_text=body['log_text'])

    parsed = {}
    for line in payload.log_text.splitlines():
        m = LOG_LINE_RE.match(line.strip())
        if m:
            qty = int(m.group(1))
            name = m.group(2).strip().lower()
            parsed[name] = parsed.get(name, 0) + qty

    if not parsed:
        raise BadRequest("No valid 'Retrieved' lines found in the provided log text")

    unmatched = []
    ambiguous = []
    matched = []

    try:
        with get_db() as conn:
            for name, qty in parsed.items():
                cursor = conn.execute(
                    """
                    SELECT i.id, i.category, i.best_npc_buy_price,
                           COUNT(mc.server_id) AS market_servers
                    FROM items i
                    LEFT JOIN market_current mc ON mc.item_id = i.id
                    WHERE LOWER(i.name) = ?
                    GROUP BY i.id
                    ORDER BY
                        (i.best_npc_buy_price IS NOT NULL) DESC,
                        (i.category = 'Creature Products') DESC,
                        market_servers DESC
                    """,
                    (name,)
                )
                candidates = cursor.fetchall()
                if not candidates:
                    unmatched.append(name)
                    logger.warning(f"Stash import: no items match for '{name}'")
                    continue

                best = candidates[0]
                if len(candidates) > 1:
                    second = candidates[1]
                    same_npc = (best["best_npc_buy_price"] is not None) == (second["best_npc_buy_price"] is not None)
                    same_cat = best["category"] == second["category"]
                    if same_npc and same_cat:
                        ambiguous.append(name)
                        logger.warning(f"Stash import: ambiguous match for '{name}' (picked id={best['id']}, category={best['category']})")

                matched.append((best["id"], name, qty))

            conn.executemany(
                """
                INSERT INTO stash_inventory (item_id, item_name, quantity, updated_at)
                VALUES (?, ?, ?, datetime('now'))
                ON CONFLICT(item_id) DO UPDATE SET
                    quantity   = excluded.quantity,
                    item_name  = excluded.item_name,
                    updated_at = datetime('now')
                """,
                matched
            )
            conn.commit()

        result = StashImportResult(
            items_imported=len(matched),
            unmatched_names=unmatched,
            ambiguous_names=ambiguous
        )
        msg = f"Imported {len(matched)} items"
        if unmatched:
            msg += f", {len(unmatched)} unmatched"
        if ambiguous:
            msg += f", {len(ambiguous)} ambiguous (best guess used)"
        response = ApiResponse(
            success=True,
            data=result.model_dump(),
            message=msg
        )
        return jsonify(response.model_dump()), 200

    except sqlite3.Error as e:
        logger.error(f"Database error in import_inventory: {e}")
        raise


@inventory_bp.route('/api/inventory', methods=['DELETE'])
def wipe_inventory():
    """Delete every row from the stash_inventory table."""
    try:
        with get_db() as conn:
            cursor = conn.execute("DELETE FROM stash_inventory")
            deleted = cursor.rowcount
            conn.commit()

        response = ApiResponse(
            success=True,
            data={"deleted": deleted},
            message=f"Wiped {deleted} stash item{'' if deleted == 1 else 's'}"
        )
        return jsonify(response.model_dump()), 200

    except sqlite3.Error as e:
        logger.error(f"Database error in wipe_inventory: {e}")
        raise


@inventory_bp.route('/api/inventory/categories', methods=['GET'])
def get_inventory_categories():
    """Get distinct item categories present in the current stash."""
    try:
        with get_db() as conn:
            cursor = conn.execute("""
                SELECT DISTINCT i.category
                FROM stash_inventory si
                JOIN items i ON i.id = si.item_id
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
        logger.error(f"Database error in get_inventory_categories: {e}")
        raise


@inventory_bp.route('/api/export/stash-plan', methods=['GET', 'POST'])
def get_stash_export_plan():
    """
    Calculate the best Optional PvP server to export your entire stash inventory.
    
    Returns servers ranked by total profit potential (instant sell value - transfer cost).
    Only considers Optional PvP servers (Green or Yellow BattlEye).
    
    Query parameters:
    - min_coverage: Minimum % of inventory that must have market demand (default: 0)
    - battleye_filter: 'green' | 'yellow' | 'all' (default: 'all')
    - selected_items: Comma-separated list of item_ids to include (optional, if not provided uses all items)
    
    POST body (optional):
    - selected_items: Array of item_ids to include in calculation
    - source_server_id: Server ID where the stash is currently located (for arbitrage calculation)
    """
    min_coverage = request.args.get('min_coverage', type=float, default=0)
    battleye_filter = request.args.get('battleye_filter', '').lower()
    source_server_id = request.args.get('source_server_id', type=int)
    
    # Get selected items from query params or POST body
    selected_items = None
    if request.method == 'POST':
        body = request.get_json(silent=True)
        if body and 'selected_items' in body:
            selected_items = body['selected_items']
        if body and 'source_server_id' in body:
            source_server_id = body['source_server_id']
    else:
        selected_items_param = request.args.get('selected_items', '')
        if selected_items_param:
            selected_items = [int(x.strip()) for x in selected_items_param.split(',') if x.strip()]
    
    try:
        with get_db() as conn:
            # Get Tibia Coins price for transfer cost calculation
            cursor = conn.execute("""
                SELECT opt_pvp_avg_sell
                FROM market_summary ms
                JOIN items i ON i.id = ms.item_id
                WHERE i.name = 'Tibia Coins'
            """)
            tc_row = cursor.fetchone()
            tc_price = tc_row["opt_pvp_avg_sell"] if tc_row and tc_row["opt_pvp_avg_sell"] else 35000
            transfer_cost_gold = 750 * tc_price
            
            # Get total items in stash for coverage calculation.
            # Note: an empty selection ([]) is treated as "all items" so the panels/table
            # remain visible. Item-level deselection is reflected on the frontend (dimming
            # + recalculated selected totals), while a non-empty subset still drives the
            # server ranking on the backend.
            if selected_items and len(selected_items) > 0:
                placeholders = ','.join('?' * len(selected_items))
                cursor = conn.execute(
                    f"SELECT COUNT(*) as total FROM stash_inventory WHERE quantity > 0 AND item_id IN ({placeholders})",
                    selected_items
                )
                total_stash_items = cursor.fetchone()["total"]
            else:
                # For empty selection or null, use all items for coverage calculation
                cursor = conn.execute("SELECT COUNT(*) as total FROM stash_inventory WHERE quantity > 0")
                total_stash_items = cursor.fetchone()["total"]
            
            if total_stash_items == 0:
                return jsonify(ApiResponse(
                    success=True,
                    data={
                        "servers": [],
                        "transfer_cost_gold": transfer_cost_gold,
                        "tibia_coins_price": tc_price,
                        "total_stash_items": 0
                    },
                    message="No items in stash inventory"
                ).model_dump())
            
            # Build the main query
            battleye_condition = ""
            if battleye_filter == 'green':
                battleye_condition = "AND s.battleye = 'Green'"
            elif battleye_filter == 'yellow':
                battleye_condition = "AND s.battleye = 'Yellow'"
            
            # Build selected items condition (only applied to the server ranking
            # when a non-empty subset is provided).
            selected_items_condition = ""
            if selected_items and len(selected_items) > 0:
                placeholders = ','.join('?' * len(selected_items))
                selected_items_condition = f"AND si.item_id IN ({placeholders})"
            
            query = f"""
                WITH inventory_value_per_server AS (
                    SELECT 
                        s.id as server_id,
                        s.name as server_name,
                        s.battleye,
                        si.item_id,
                        si.item_name,
                        si.quantity,
                        i.category,
                        COALESCE(mc.buy_offer, 0) as buy_price,
                        COALESCE(mc.sell_offer, 0) as sell_price,
                        COALESCE(mc.buy_offers, 0) as buy_offers,
                        COALESCE(mc.sell_offers, 0) as sell_offers,
                        COALESCE(i.best_npc_buy_price, 0) as npc_price,
                        
                        -- Source server market data (for arbitrage calculation)
                        COALESCE(mc_source.buy_offer, 0) as source_buy_price,
                        COALESCE(mc_source.sell_offer, 0) as source_sell_price,
                        COALESCE(mc_source.buy_offers, 0) as source_buy_offers,
                        COALESCE(mc_source.sell_offers, 0) as source_sell_offers,
                        
                        -- Instant sell value (buy offers)
                        si.quantity * COALESCE(mc.buy_offer, 0) as instant_value,
                        
                        -- Listing value (sell offers)
                        si.quantity * COALESCE(mc.sell_offer, 0) as listing_value,
                        
                        -- NPC baseline
                        si.quantity * COALESCE(i.best_npc_buy_price, 0) as npc_value,
                        
                        -- Source server weighted value (using same liquidity-based strategy)
                        si.quantity * COALESCE(
                            CASE 
                                WHEN COALESCE(mc_source.buy_offers, 0) + COALESCE(mc_source.sell_offers, 0) = 0 THEN 0
                                WHEN COALESCE(mc_source.buy_offers, 0) >= 50 THEN mc_source.buy_offer * 0.7 + mc_source.sell_offer * 0.3
                                WHEN COALESCE(mc_source.buy_offers, 0) >= 20 THEN mc_source.buy_offer * 0.85 + mc_source.sell_offer * 0.15
                                ELSE mc_source.buy_offer
                            END,
                            i.best_npc_buy_price
                        ) as source_weighted_value,
                        
                        -- Activity score (total market activity for this item)
                        COALESCE(mc.buy_offers, 0) + COALESCE(mc.sell_offers, 0) as activity,
                        
                        -- Liquidity score (0-100): higher = easier to sell
                        CASE
                            WHEN COALESCE(mc.buy_offers, 0) + COALESCE(mc.sell_offers, 0) = 0 THEN 0
                            WHEN COALESCE(mc.buy_offers, 0) >= 50 THEN 100
                            WHEN COALESCE(mc.buy_offers, 0) >= 20 THEN 80
                            WHEN COALESCE(mc.buy_offers, 0) >= 10 THEN 60
                            WHEN COALESCE(mc.buy_offers, 0) >= 5 THEN 40
                            WHEN COALESCE(mc.sell_offers, 0) >= 20 THEN 30
                            WHEN COALESCE(mc.sell_offers, 0) >= 10 THEN 20
                            ELSE 10
                        END as liquidity_score
                        
                    FROM stash_inventory si
                    JOIN items i ON i.id = si.item_id
                    CROSS JOIN servers s
                    LEFT JOIN market_current mc ON mc.item_id = si.item_id AND mc.server_id = s.id
                    LEFT JOIN market_current mc_source ON mc_source.item_id = si.item_id AND mc_source.server_id = ?
                    WHERE s.pvp_type = 'Optional PvP'
                      AND (s.notes IS NULL OR s.notes != 'blocked')
                      AND si.quantity > 0
                      {battleye_condition}
                      {selected_items_condition}
                )
                SELECT 
                    server_id,
                    server_name,
                    battleye,
                    COUNT(DISTINCT item_id) as total_items,
                    
                    -- Coverage metrics
                    COUNT(DISTINCT CASE WHEN buy_price > 0 THEN item_id END) as items_with_instant_demand,
                    COUNT(DISTINCT CASE WHEN sell_price > 0 THEN item_id END) as items_with_listing_potential,
                    COUNT(DISTINCT CASE WHEN activity > 0 THEN item_id END) as items_with_market_activity,
                    
                    -- Value calculations
                    SUM(instant_value) as total_instant_value,
                    SUM(listing_value) as total_listing_value,
                    SUM(npc_value) as total_npc_value,
                    SUM(source_weighted_value) as total_source_weighted_value,
                    
                    -- Profit calculations (arbitrage: destination - source)
                    SUM(instant_value - source_weighted_value) as gross_profit_instant,
                    SUM(listing_value - source_weighted_value) as gross_profit_listing,
                    
                    -- Weighted hybrid profit (70% instant + 30% listing for high liquidity items)
                    SUM(
                        CASE 
                            WHEN liquidity_score >= 60 THEN (instant_value * 0.7 + listing_value * 0.3) - source_weighted_value
                            WHEN liquidity_score >= 30 THEN (instant_value * 0.85 + listing_value * 0.15) - source_weighted_value
                            ELSE instant_value - source_weighted_value
                        END
                    ) as gross_profit_weighted,
                    
                    -- Activity metrics
                    SUM(buy_offers) as total_buy_offers,
                    SUM(sell_offers) as total_sell_offers,
                    SUM(activity) as total_activity,
                    ROUND(AVG(liquidity_score), 2) as avg_liquidity_score,
                    
                    -- Coverage percentages
                    ROUND(COUNT(DISTINCT CASE WHEN buy_price > 0 THEN item_id END) * 100.0 / ?, 2) as instant_coverage_pct,
                    ROUND(COUNT(DISTINCT CASE WHEN sell_price > 0 THEN item_id END) * 100.0 / ?, 2) as listing_coverage_pct,
                    ROUND(COUNT(DISTINCT CASE WHEN activity > 0 THEN item_id END) * 100.0 / ?, 2) as market_coverage_pct,
                    
                    -- Net profit (after transfer cost) - using weighted strategy with arbitrage
                    (SUM(
                        CASE 
                            WHEN liquidity_score >= 60 THEN (instant_value * 0.7 + listing_value * 0.3) - source_weighted_value
                            WHEN liquidity_score >= 30 THEN (instant_value * 0.85 + listing_value * 0.15) - source_weighted_value
                            ELSE instant_value - source_weighted_value
                        END
                    ) - ?) as net_profit_weighted,
                    
                    (SUM(instant_value - source_weighted_value) - ?) as net_profit_instant,
                    (SUM(listing_value - source_weighted_value) - ?) as net_profit_listing,
                    
                    -- ROI (based on source weighted value as investment)
                    ROUND((SUM(
                        CASE 
                            WHEN liquidity_score >= 60 THEN (instant_value * 0.7 + listing_value * 0.3) - source_weighted_value
                            WHEN liquidity_score >= 30 THEN (instant_value * 0.85 + listing_value * 0.15) - source_weighted_value
                            ELSE instant_value - source_weighted_value
                        END
                    ) - ?) * 100.0 / NULLIF(SUM(source_weighted_value), 0), 2) as roi_pct
                    
                FROM inventory_value_per_server
                GROUP BY server_id, server_name, battleye
                HAVING market_coverage_pct >= ?
                ORDER BY net_profit_weighted DESC
                LIMIT 20
            """
            
            # Build parameters list
            # IMPORTANT: parameter order must match the placeholders in the SQL text.
            # The LEFT JOIN mc_source (server_id = ?) appears BEFORE the WHERE IN clause,
            # so source_server_id must be bound first.
            query_params = []
            query_params.append(source_server_id or 7)  # For LEFT JOIN mc_source (default to Bravoria)
            if selected_items and len(selected_items) > 0:
                query_params.extend(selected_items)  # For the WHERE IN clause
            query_params.extend([
                total_stash_items,  # instant_coverage_pct
                total_stash_items,  # listing_coverage_pct
                total_stash_items,  # market_coverage_pct
                transfer_cost_gold,  # net_profit_weighted
                transfer_cost_gold,  # net_profit_instant
                transfer_cost_gold,  # net_profit_listing
                transfer_cost_gold,  # roi_pct
                min_coverage  # HAVING clause
            ])
            
            cursor = conn.execute(query, query_params)
            servers = [dict(row) for row in cursor.fetchall()]
            
            # For the item breakdown, always fetch data even if no profitable servers exist
            # Use the best server if available, otherwise use a default Optional PvP server
            top_server_items = []
            top_server_id = None
            if servers:
                top_server_id = servers[0]["server_id"]
            else:
                # Get a default Optional PvP server for item breakdown when no profitable servers
                cursor = conn.execute("""
                    SELECT id FROM servers
                    WHERE pvp_type = 'Optional PvP'
                      AND (notes IS NULL OR notes != 'blocked')
                    ORDER BY name
                    LIMIT 1
                """)
                default_server = cursor.fetchone()
                if default_server:
                    top_server_id = default_server["id"]
            
            if top_server_id:
                # The item breakdown ALWAYS returns every stash item so the table never
                # loses rows when the user deselects items. Selection is handled on the
                # frontend (dimming + recalculated selected totals).
                item_breakdown_condition = ""
                
                item_query = f"""
                    SELECT 
                        si.item_id,
                        si.item_name,
                        si.quantity,
                        i.category,
                        
                        -- Destination server prices (target)
                        COALESCE(mc_dest.buy_offer, 0) as dest_buy_price,
                        COALESCE(mc_dest.sell_offer, 0) as dest_sell_price,
                        COALESCE(mc_dest.buy_offers, 0) as dest_buy_offers,
                        COALESCE(mc_dest.sell_offers, 0) as dest_sell_offers,
                        
                        -- Source server prices (origin)
                        COALESCE(mc_src.buy_offer, 0) as source_buy_price,
                        COALESCE(mc_src.sell_offer, 0) as source_sell_price,
                        COALESCE(mc_src.buy_offers, 0) as source_buy_offers,
                        COALESCE(mc_src.sell_offers, 0) as source_sell_offers,
                        
                        -- Global averages from market_summary
                        COALESCE(ms.opt_pvp_avg_buy, 0) as global_avg_buy,
                        COALESCE(ms.opt_pvp_avg_sell, 0) as global_avg_sell,
                        
                        -- NPC price
                        COALESCE(i.best_npc_buy_price, 0) as npc_price,
                        
                        -- Market activity (destination)
                        COALESCE(mc_dest.buy_offers, 0) + COALESCE(mc_dest.sell_offers, 0) as total_activity,
                        
                        -- Liquidity score (based on destination)
                        CASE
                            WHEN COALESCE(mc_dest.buy_offers, 0) + COALESCE(mc_dest.sell_offers, 0) = 0 THEN 0
                            WHEN COALESCE(mc_dest.buy_offers, 0) >= 50 THEN 100
                            WHEN COALESCE(mc_dest.buy_offers, 0) >= 20 THEN 80
                            WHEN COALESCE(mc_dest.buy_offers, 0) >= 10 THEN 60
                            WHEN COALESCE(mc_dest.buy_offers, 0) >= 5 THEN 40
                            WHEN COALESCE(mc_dest.sell_offers, 0) >= 20 THEN 30
                            WHEN COALESCE(mc_dest.sell_offers, 0) >= 10 THEN 20
                            ELSE 10
                        END as liquidity_score,
                        
                        -- Values (based on destination)
                        si.quantity * COALESCE(mc_dest.buy_offer, 0) as instant_value,
                        si.quantity * COALESCE(mc_dest.sell_offer, 0) as listing_value,
                        
                        -- Source server weighted value (with NPC fallback)
                        si.quantity * COALESCE(
                            CASE 
                                WHEN COALESCE(mc_src.buy_offers, 0) + COALESCE(mc_src.sell_offers, 0) = 0 THEN 0
                                WHEN COALESCE(mc_src.buy_offers, 0) >= 50 THEN mc_src.buy_offer * 0.7 + mc_src.sell_offer * 0.3
                                WHEN COALESCE(mc_src.buy_offers, 0) >= 20 THEN mc_src.buy_offer * 0.85 + mc_src.sell_offer * 0.15
                                ELSE mc_src.buy_offer
                            END,
                            i.best_npc_buy_price
                        ) as source_weighted_value,
                        
                        -- Weighted value (same logic as main query)
                        si.quantity * CASE 
                            WHEN CASE
                                WHEN COALESCE(mc_dest.buy_offers, 0) + COALESCE(mc_dest.sell_offers, 0) = 0 THEN 0
                                WHEN COALESCE(mc_dest.buy_offers, 0) >= 50 THEN 100
                                WHEN COALESCE(mc_dest.buy_offers, 0) >= 20 THEN 80
                                WHEN COALESCE(mc_dest.buy_offers, 0) >= 10 THEN 60
                                WHEN COALESCE(mc_dest.buy_offers, 0) >= 5 THEN 40
                                WHEN COALESCE(mc_dest.sell_offers, 0) >= 20 THEN 30
                                WHEN COALESCE(mc_dest.sell_offers, 0) >= 10 THEN 20
                                ELSE 10
                            END >= 60 THEN COALESCE(mc_dest.buy_offer, 0) * 0.7 + COALESCE(mc_dest.sell_offer, 0) * 0.3
                            WHEN CASE
                                WHEN COALESCE(mc_dest.buy_offers, 0) + COALESCE(mc_dest.sell_offers, 0) = 0 THEN 0
                                WHEN COALESCE(mc_dest.buy_offers, 0) >= 50 THEN 100
                                WHEN COALESCE(mc_dest.buy_offers, 0) >= 20 THEN 80
                                WHEN COALESCE(mc_dest.buy_offers, 0) >= 10 THEN 60
                                WHEN COALESCE(mc_dest.buy_offers, 0) >= 5 THEN 40
                                WHEN COALESCE(mc_dest.sell_offers, 0) >= 20 THEN 30
                                WHEN COALESCE(mc_dest.sell_offers, 0) >= 10 THEN 20
                                ELSE 10
                            END >= 30 THEN COALESCE(mc_dest.buy_offer, 0) * 0.85 + COALESCE(mc_dest.sell_offer, 0) * 0.15
                            ELSE COALESCE(mc_dest.buy_offer, 0)
                        END as weighted_value,
                        
                        -- Profits (arbitrage: destination - source)
                        si.quantity * (COALESCE(mc_dest.buy_offer, 0) - COALESCE(
                            CASE 
                                WHEN COALESCE(mc_src.buy_offers, 0) + COALESCE(mc_src.sell_offers, 0) = 0 THEN 0
                                WHEN COALESCE(mc_src.buy_offers, 0) >= 50 THEN mc_src.buy_offer * 0.7 + mc_src.sell_offer * 0.3
                                WHEN COALESCE(mc_src.buy_offers, 0) >= 20 THEN mc_src.buy_offer * 0.85 + mc_src.sell_offer * 0.15
                                ELSE mc_src.buy_offer
                            END,
                            i.best_npc_buy_price
                        )) as profit_instant,
                        si.quantity * (COALESCE(mc_dest.sell_offer, 0) - COALESCE(
                            CASE 
                                WHEN COALESCE(mc_src.buy_offers, 0) + COALESCE(mc_src.sell_offers, 0) = 0 THEN 0
                                WHEN COALESCE(mc_src.buy_offers, 0) >= 50 THEN mc_src.buy_offer * 0.7 + mc_src.sell_offer * 0.3
                                WHEN COALESCE(mc_src.buy_offers, 0) >= 20 THEN mc_src.buy_offer * 0.85 + mc_src.sell_offer * 0.15
                                ELSE mc_src.buy_offer
                            END,
                            i.best_npc_buy_price
                        )) as profit_listing,
                        
                        -- Recommended strategy (based on destination)
                        CASE
                            WHEN COALESCE(mc_dest.buy_offers, 0) >= 10 THEN 'instant'
                            WHEN COALESCE(mc_dest.sell_offers, 0) >= 10 AND COALESCE(mc_dest.sell_offer, 0) > COALESCE(mc_dest.buy_offer, 0) * 1.2 THEN 'listing'
                            WHEN COALESCE(mc_dest.buy_offers, 0) + COALESCE(mc_dest.sell_offers, 0) >= 5 THEN 'hybrid'
                            ELSE 'npc'
                        END as recommended_strategy,
                        
                        -- Profit percentages
                        CASE 
                            WHEN COALESCE(i.best_npc_buy_price, 0) > 0 
                            THEN ROUND((COALESCE(mc_dest.buy_offer, 0) - i.best_npc_buy_price) * 100.0 / i.best_npc_buy_price, 2)
                            ELSE NULL
                        END as profit_pct_instant,
                        CASE 
                            WHEN COALESCE(i.best_npc_buy_price, 0) > 0 
                            THEN ROUND((COALESCE(mc_dest.sell_offer, 0) - i.best_npc_buy_price) * 100.0 / i.best_npc_buy_price, 2)
                            ELSE NULL
                        END as profit_pct_listing
                        
                    FROM stash_inventory si
                    JOIN items i ON i.id = si.item_id
                    LEFT JOIN market_current mc_dest ON mc_dest.item_id = si.item_id AND mc_dest.server_id = ?
                    LEFT JOIN market_current mc_src ON mc_src.item_id = si.item_id AND mc_src.server_id = ?
                    LEFT JOIN market_summary ms ON ms.item_id = si.item_id
                    WHERE si.quantity > 0
                      {item_breakdown_condition}
                    ORDER BY weighted_value DESC
                """
                
                # Build parameters for item query (breakdown always returns all items)
                # Default source to 7 (Bravoria) to stay consistent with the ranking query.
                item_query_params = [top_server_id, source_server_id or 7]
                
                cursor = conn.execute(item_query, item_query_params)
                top_server_items = [dict(row) for row in cursor.fetchall()]
            
            response = ApiResponse(
                success=True,
                data={
                    "servers": servers,
                    "top_server_items": top_server_items,
                    "transfer_cost_gold": transfer_cost_gold,
                    "tibia_coins_price": tc_price,
                    "total_stash_items": total_stash_items
                },
                count=len(servers)
            )
            return jsonify(response.model_dump())
            
    except sqlite3.Error as e:
        logger.error(f"Database error in get_stash_export_plan: {e}")
        raise
