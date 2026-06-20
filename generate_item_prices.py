#!/usr/bin/env python3
"""
Generate itemprices.json for Tibia based on weekly delivery items.
Fetches market averages, compares with NPC prices, and filters for market accuracy.
"""

import sqlite3
import json
import os
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), 'tibia_data.db')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), 'output_cache.json')

# Server type configurations mapping user choice to market_summary columns
SERVER_TYPES = {
    '1': {
        'name': 'Global (All Servers)',
        'buy_col': 'global_avg_buy',
        'sell_col': 'global_avg_sell',
        'server_id_col': 'top_server_id',
        'server_buy_col': 'top_server_buy',
    },
    '2': {
        'name': 'Optional PvP (All)',
        'buy_col': 'opt_pvp_avg_buy',
        'sell_col': 'opt_pvp_avg_sell',
        'server_id_col': 'opt_pvp_top_server_id',
        'server_buy_col': 'opt_pvp_top_server_buy',
    },
    '3': {
        'name': 'Optional PvP (Green BattlEye)',
        'buy_col': 'opt_pvp_green_avg_buy',
        'sell_col': 'opt_pvp_green_avg_sell',
        'server_id_col': 'opt_pvp_green_top_server_id',
        'server_buy_col': 'opt_pvp_green_top_server_buy',
    },
}


def get_server_type() -> tuple[str, dict]:
    """Ask user for server type and return key and config."""
    print("\nSelect server type for market values:")
    print("1. Global (All Servers)")
    print("2. Optional PvP (All)")
    print("3. Optional PvP (Green BattlEye)")
    
    while True:
        choice = input("\nEnter choice (1-3): ").strip()
        if choice in SERVER_TYPES:
            return choice, SERVER_TYPES[choice]
        print("Invalid choice. Please enter 1, 2, or 3.")


def calculate_confidence_score(active_servers: int, top_activity: int, 
                                market_buy: Optional[int], market_sell: Optional[int]) -> float:
    """
    Calculate a confidence score (0-1) for market accuracy.
    Based on:
    - Number of active servers with market data
    - Transaction activity on top server
    - Spread between buy and sell prices (liquidity indicator)
    """
    score = 0.0
    
    # Active servers factor (max contribution: 0.4)
    # 80+ servers = full points, scaling down
    server_factor = min(active_servers / 80.0, 1.0) * 0.4
    score += server_factor
    
    # Top activity factor (max contribution: 0.4)
    # 50+ transactions = full points, scaling down
    activity_factor = min(top_activity / 50.0, 1.0) * 0.4
    score += activity_factor
    
    # Spread factor (max contribution: 0.2)
    # Tight spread (buy ~ sell) indicates healthy market
    if market_buy and market_sell and market_buy > 0:
        spread_ratio = market_sell / market_buy
        # Ideal spread is 1.0-1.3 (buy offers close to sell offers)
        if 1.0 <= spread_ratio <= 1.3:
            score += 0.2
        elif 1.3 < spread_ratio <= 2.0:
            score += 0.1
        # Very wide spread suggests low liquidity
    
    return round(score, 2)


def get_recommended_price(market_buy: Optional[int], market_sell: Optional[int],
                          npc_price: Optional[int]) -> Optional[int]:
    """
    Determine the recommended price for an item.
    Returns market buy average if it exceeds NPC price, otherwise None.
    """
    if market_buy is None:
        return None
    
    # Discard if market price is under NPC price
    if npc_price and market_buy <= npc_price:
        return None
    
    return market_buy


def generate_item_prices(server_config: dict, min_confidence: float = 0.3) -> dict:
    """
    Generate item prices JSON structure.
    
    Args:
        server_config: Dictionary with column names for the selected server type
        min_confidence: Minimum confidence score (0-1) for market accuracy
    
    Returns:
        Dictionary matching the itemprices.json structure
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    custom_prices = {}
    primary_sources = {}
    
    stats = {
        'total_items': 0,
        'with_market_data': 0,
        'discarded_low_market': 0,
        'discarded_low_confidence': 0,
        'accepted': 0,
    }
    
    query = f"""
        SELECT 
            wdi.item_id,
            i.name as item_name,
            i.best_npc_buy_price as npc_price,
            ms.{server_config['buy_col']} as market_buy,
            ms.{server_config['sell_col']} as market_sell,
            ms.active_servers,
            ms.top_activity,
            ms.global_servers,
            ms.top_server_buy
        FROM weekly_delivery_items wdi
        JOIN items i ON wdi.item_id = i.id
        LEFT JOIN market_summary ms ON wdi.item_id = ms.item_id
        WHERE wdi.is_active = 1
        ORDER BY wdi.source_order
    """
    
    cursor.execute(query)
    rows = cursor.fetchall()
    
    for row in rows:
        stats['total_items'] += 1
        
        item_id = str(row['item_id'])
        npc_price = row['npc_price']
        market_buy = row['market_buy']
        market_sell = row['market_sell']
        active_servers = row['active_servers'] or 0
        top_activity = row['top_activity'] or 0
        
        # Skip if no market data
        if market_buy is None:
            continue
        
        stats['with_market_data'] += 1
        
        # Check if market price exceeds NPC price
        recommended = get_recommended_price(market_buy, market_sell, npc_price)
        
        if recommended is None:
            stats['discarded_low_market'] += 1
            continue
        
        # Calculate confidence score
        confidence = calculate_confidence_score(
            active_servers, top_activity, market_buy, market_sell
        )
        
        # Skip if confidence is too low (market might be stale/manipulated)
        if confidence < min_confidence:
            stats['discarded_low_confidence'] += 1
            print(f"  Low confidence ({confidence}): {row['item_name']} (ID: {item_id}) - skipping")
            continue
        
        # Add to output
        custom_prices[item_id] = recommended
        primary_sources[item_id] = "market"
        stats['accepted'] += 1
        
        # Show details for debugging
        print(f"  Added: {row['item_name']} (ID: {item_id}) = {recommended} gp "
              f"[confidence: {confidence}, npc: {npc_price or 0}, market_sell: {market_sell or 0}]")
    
    conn.close()
    
    print(f"\n{'='*60}")
    print("SUMMARY:")
    print(f"  Total weekly delivery items: {stats['total_items']}")
    print(f"  With market data: {stats['with_market_data']}")
    print(f"  Discarded (market <= NPC): {stats['discarded_low_market']}")
    print(f"  Discarded (low confidence): {stats['discarded_low_confidence']}")
    print(f"  Accepted: {stats['accepted']}")
    print(f"{'='*60}\n")
    
    return {
        "customSalePrices": custom_prices
    }


def main():
    print("="*60)
    print("Tibia Item Prices Generator")
    print("="*60)
    
    # Check database exists
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return
    
    # Get server type from user
    server_key, server_config = get_server_type()
    print(f"\nSelected: {server_config['name']}")
    
    # Allow confidence threshold adjustment
    print("\nConfidence threshold (0.0-1.0, default: 0.3)")
    print("  Higher = stricter filtering, more accurate prices")
    print("  Lower = more items included, may have stale prices")
    print("  (Scores typically range 0.2-0.9 based on market activity)")
    threshold_input = input("Enter threshold [0.3]: ").strip()
    try:
        min_confidence = float(threshold_input) if threshold_input else 0.3
        min_confidence = max(0.0, min(1.0, min_confidence))  # Clamp to 0-1
    except ValueError:
        min_confidence = 0.3
    
    # Generate prices
    print(f"\nGenerating prices with confidence threshold: {min_confidence}")
    print("-"*60)
    
    result = generate_item_prices(server_config, min_confidence)
    
    # Write output
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=4, ensure_ascii=False)
    
    print(f"Output written to: {OUTPUT_FILE}")
    print(f"  - {len(result['customSalePrices'])} items with custom sale prices")
    print(f"  - Primary source left as default (NPC Buy Value)")
    print("\nYou can now copy this file to your Tibia character settings folder.")


if __name__ == "__main__":
    main()
