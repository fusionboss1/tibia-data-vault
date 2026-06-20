"""
fetch_market.py — CLI tool to fetch market data from tibiamarket.top

Usage examples:
    python fetch_market.py --name Antica
    python fetch_market.py --name Antica Secura Refugia
    python fetch_market.py --region EU
    python fetch_market.py --region EU SA
    python fetch_market.py --pvp "Open PvP"
    python fetch_market.py --pvp "Optional PvP" "Retro Open PvP"
    python fetch_market.py --battleye Green
    python fetch_market.py --battleye Yellow
    python fetch_market.py --all

Add --force to skip the timestamp comparison and always fetch.
Add --dry-run to show which servers would be fetched without doing it.
"""

import argparse
import json
import logging
import sqlite3
import sys
import time
from pathlib import Path
from typing import Optional

import requests

from backend import (
    get_db,
    ITEM_METADATA_PATH,
    TIBIA_MARKET_API_URL,
    REQUEST_TIMEOUT,
    REQUEST_DELAY,
    LOG_LEVEL,
    LOG_FORMAT,
)

# Configure logging
logging.basicConfig(level=getattr(logging, LOG_LEVEL), format=LOG_FORMAT)
logger = logging.getLogger(__name__)


def fetch_world_data() -> dict[str, str]:
    """Fetch last_update timestamps for all worlds. Returns {name: last_update_str}."""
    logger.info("Fetching world data from API...")
    try:
        resp = requests.get(
            f"{TIBIA_MARKET_API_URL}/world_data",
            timeout=REQUEST_TIMEOUT
        )
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"Retrieved data for {len(data)} worlds")
        return {entry["name"]: entry["last_update"] for entry in data}
    except requests.RequestException as e:
        logger.error(f"Failed to fetch world data: {e}")
        raise


def fetch_market_values(world_name: str) -> list[dict]:
    """Fetch current market snapshot for a single world (paginates automatically)."""
    all_items: list[dict] = []
    skip = 0
    page_size = 5000
    
    logger.debug(f"Fetching market values for {world_name}")
    
    while True:
        try:
            resp = requests.get(
                f"{TIBIA_MARKET_API_URL}/market_values",
                params={"server": world_name, "skip": skip, "limit": page_size},
                timeout=REQUEST_TIMEOUT * 2,  # Longer timeout for large requests
            )
            resp.raise_for_status()
            page = resp.json()
            all_items.extend(page)
            
            logger.debug(f"Fetched page: {len(page)} items (skip={skip})")
            
            if len(page) < page_size:
                break
            skip += page_size
            
        except requests.RequestException as e:
            logger.error(f"Failed to fetch market values for {world_name} at skip={skip}: {e}")
            raise
    
    logger.info(f"Fetched {len(all_items)} total items for {world_name}")
    return all_items


def select_servers(conn, args) -> list[sqlite3.Row]:
    """Return server rows matching the CLI filter."""
    base_query = "SELECT id, name, region, pvp_type, battleye, api_last_update FROM servers"
    params: list = []

    try:
        if args.all:
            cursor = conn.execute(base_query + " ORDER BY name")
            logger.debug("Selected all servers")
        elif args.name:
            placeholders = ",".join("?" * len(args.name))
            cursor = conn.execute(
                f"{base_query} WHERE name IN ({placeholders}) ORDER BY name",
                args.name,
            )
            logger.debug(f"Selected servers by name: {args.name}")
        elif args.region:
            placeholders = ",".join("?" * len(args.region))
            cursor = conn.execute(
                f"{base_query} WHERE region IN ({placeholders}) ORDER BY name",
                args.region,
            )
            logger.debug(f"Selected servers by region: {args.region}")
        elif args.pvp:
            placeholders = ",".join("?" * len(args.pvp))
            cursor = conn.execute(
                f"{base_query} WHERE pvp_type IN ({placeholders}) ORDER BY name",
                args.pvp,
            )
            logger.debug(f"Selected servers by PvP type: {args.pvp}")
        elif args.battleye:
            placeholders = ",".join("?" * len(args.battleye))
            cursor = conn.execute(
                f"{base_query} WHERE battleye IN ({placeholders}) ORDER BY name",
                args.battleye,
            )
            logger.debug(f"Selected servers by BattlEye: {args.battleye}")
        else:
            logger.error("No filter specified")
            print("Error: specify a filter (--name, --region, --pvp, --battleye) or --all.")
            sys.exit(1)

        results = cursor.fetchall()
        logger.info(f"Selected {len(results)} server(s)")
        return results
        
    except sqlite3.Error as e:
        logger.error(f"Database error selecting servers: {e}")
        raise


def fetch_item_metadata(item_ids: set[int]) -> list[dict]:
    """Fetch metadata for a set of item IDs from the item_metadata endpoint."""
    results = []
    for item_id in item_ids:
        try:
            resp = requests.get(
                f"{TIBIA_MARKET_API_URL}/item_metadata",
                params={"item_id": item_id},
                timeout=REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
            if data:
                results.extend(data)
        except requests.RequestException as e:
            logger.warning(f"Failed to fetch metadata for item_id={item_id}: {e}")
    return results


def load_item_metadata_file() -> dict[int, dict]:
    """Load item_metadata.json from disk. Returns a dict keyed by item id, or empty dict if missing."""
    path = Path(ITEM_METADATA_PATH)
    if not path.exists():
        logger.debug(f"item_metadata.json not found at {path}")
        return {}
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    return {entry["id"]: entry for entry in data}


def ensure_items_exist(conn, items: list[dict]) -> int:
    """Insert metadata for any item IDs not yet in the items table. Returns count inserted."""
    incoming_ids = {item["id"] for item in items if item.get("is_full_data")}
    if not incoming_ids:
        return 0
    known_ids = {row[0] for row in conn.execute("SELECT id FROM items")}
    new_ids = incoming_ids - known_ids
    if not new_ids:
        return 0

    file_cache = load_item_metadata_file()
    file_hits = {id_: file_cache[id_] for id_ in new_ids if id_ in file_cache}
    api_needed = new_ids - file_hits.keys()

    metadata = list(file_hits.values())
    if api_needed:
        logger.info(f"{len(api_needed)} new item(s) not in item_metadata.json, fetching from API...")
        metadata += fetch_item_metadata(api_needed)
    else:
        logger.info(f"All {len(new_ids)} new item(s) resolved from item_metadata.json")

    rows = []
    for m in metadata:
        npc_sell = m.get("npc_sell") or []
        npc_buy = m.get("npc_buy") or []

        sell_prices = [n["price"] for n in npc_sell if n.get("price")]
        buy_prices = [n["price"] for n in npc_buy if n.get("price")]
        best_sell_price = min(sell_prices) if sell_prices else None
        best_buy_price = max(buy_prices) if buy_prices else None

        best_sell_npcs = list({n["name"] for n in npc_sell if n.get("price") == best_sell_price}) if best_sell_price else None
        best_buy_npcs = list({n["name"] for n in npc_buy if n.get("price") == best_buy_price}) if best_buy_price else None

        tier = m.get("tier")
        if tier is not None and tier < 0:
            tier = None

        rows.append((
            m["id"],
            m["name"],
            m.get("category") or "Unknown",
            tier,
            m.get("wiki_name"),
            best_sell_price,
            json.dumps(best_sell_npcs) if best_sell_npcs else None,
            best_buy_price,
            json.dumps(best_buy_npcs) if best_buy_npcs else None,
        ))

    fetched_ids = {r[0] for r in rows}
    missing_ids = new_ids - fetched_ids
    if missing_ids:
        logger.warning(f"Could not fetch metadata for {len(missing_ids)} item(s), inserting stubs: {sorted(missing_ids)}")
        for id_ in missing_ids:
            rows.append((id_, f"Unknown Item {id_}", "Unknown", None, None, None, None, None, None))

    conn.executemany(
        """
        INSERT OR IGNORE INTO items
            (id, name, category, tier, wiki_name,
             best_npc_sell_price, best_npc_sell_npcs,
             best_npc_buy_price, best_npc_buy_npcs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    logger.info(f"Inserted {len(rows)} new item(s) into items table")
    return len(rows)


def upsert_market_current(conn, server_id: int, items: list[dict]) -> int:
    """Upsert market current data. Returns number of records processed."""
    full_data_items = [
        (
            item["id"],
            server_id,
            item["time"],
            max(item["buy_offer"], 0),
            max(item["sell_offer"], 0),
            max(item["buy_offers"], 0),
            max(item["sell_offers"], 0),
        )
        for item in items
        if item.get("is_full_data")
    ]
    
    if not full_data_items:
        logger.warning(f"No full-data items to upsert for server_id={server_id}")
        return 0
    
    try:
        conn.executemany(
            """
            INSERT INTO market_current
                (item_id, server_id, time, buy_offer, sell_offer, buy_offers, sell_offers)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(item_id, server_id) DO UPDATE SET
                time        = excluded.time,
                buy_offer   = excluded.buy_offer,
                sell_offer  = excluded.sell_offer,
                buy_offers  = excluded.buy_offers,
                sell_offers = excluded.sell_offers
            """,
            full_data_items,
        )
        logger.debug(f"Upserted {len(full_data_items)} market_current records for server_id={server_id}")
        return len(full_data_items)
    except sqlite3.Error as e:
        logger.error(f"Database error upserting market_current for server_id={server_id}: {e}")
        raise


def insert_market_history(conn, server_id: int, items: list[dict]) -> int:
    """Insert market history data. Returns number of records inserted."""
    full_data_items = [
        (
            item["id"],
            server_id,
            item["time"],
            max(item["buy_offer"], 0),
            max(item["sell_offer"], 0),
            max(item["buy_offers"], 0),
            max(item["sell_offers"], 0),
        )
        for item in items
        if item.get("is_full_data")
    ]
    
    if not full_data_items:
        logger.warning(f"No full-data items to insert into history for server_id={server_id}")
        return 0
    
    try:
        conn.executemany(
            """
            INSERT INTO market_history
                (item_id, server_id, time, buy_offer, sell_offer, buy_offers, sell_offers)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            full_data_items,
        )
        logger.debug(f"Inserted {len(full_data_items)} market_history records for server_id={server_id}")
        return len(full_data_items)
    except sqlite3.Error as e:
        logger.error(f"Database error inserting market_history for server_id={server_id}: {e}")
        raise


def rebuild_market_summary(conn) -> None:
    """
    Rebuild the market_summary table from market_current.

    Called after every server upsert so the table always reflects the latest
    data.  The two subqueries are:

    g  — one row per item with global aggregates (server counts, activity-
         weighted average buy/sell prices across all servers)
    t  — one row per item identifying the single most-active server for that
         item (ties broken by MIN(server_id) inside GROUP BY)

    The result is UPSERTED so partial refreshes (fetching one server at a time)
    keep accumulating correctly rather than wiping data for untouched items.
    """
    try:
        conn.execute("""
            INSERT OR REPLACE INTO market_summary (
                item_id, global_servers, active_servers,
                top_server_id, top_server_buy, top_server_sell, top_activity,
                global_avg_buy, global_avg_sell,
                opt_pvp_avg_buy, opt_pvp_avg_sell,
                opt_pvp_green_avg_buy, opt_pvp_green_avg_sell,
                opt_pvp_top_server_id, opt_pvp_top_server_buy, opt_pvp_top_server_sell,
                opt_pvp_green_top_server_id, opt_pvp_green_top_server_buy, opt_pvp_green_top_server_sell,
                updated_at
            )
            SELECT
                g.item_id,
                g.global_servers,
                g.active_servers,
                t.server_id,
                t.buy_offer,
                t.sell_offer,
                t.activity,
                g.global_avg_buy,
                g.global_avg_sell,
                g.opt_pvp_avg_buy,
                g.opt_pvp_avg_sell,
                g.opt_pvp_green_avg_buy,
                g.opt_pvp_green_avg_sell,
                t1.server_id,
                t1.buy_offer,
                t1.sell_offer,
                t2.server_id,
                t2.buy_offer,
                t2.sell_offer,
                datetime('now')
            FROM (
                SELECT
                    mc.item_id,
                    COUNT(DISTINCT mc.server_id) AS global_servers,
                    COUNT(DISTINCT CASE WHEN mc.buy_offers + mc.sell_offers > 0 THEN mc.server_id END) AS active_servers,
                    ROUND(SUM(CASE WHEN mc.buy_offer > 0 THEN CAST(mc.buy_offer AS REAL) * (mc.buy_offers + mc.sell_offers) ELSE 0 END)
                        / NULLIF(SUM(CASE WHEN mc.buy_offer > 0 THEN mc.buy_offers + mc.sell_offers ELSE 0 END), 0), 0) AS global_avg_buy,
                    ROUND(SUM(CASE WHEN mc.sell_offer > 0 THEN CAST(mc.sell_offer AS REAL) * (mc.buy_offers + mc.sell_offers) ELSE 0 END)
                        / NULLIF(SUM(CASE WHEN mc.sell_offer > 0 THEN mc.buy_offers + mc.sell_offers ELSE 0 END), 0), 0) AS global_avg_sell,
                    ROUND(SUM(CASE WHEN s.pvp_type = 'Optional PvP' AND mc.buy_offer > 0 THEN CAST(mc.buy_offer AS REAL) * (mc.buy_offers + mc.sell_offers) ELSE 0 END)
                        / NULLIF(SUM(CASE WHEN s.pvp_type = 'Optional PvP' AND mc.buy_offer > 0 THEN mc.buy_offers + mc.sell_offers ELSE 0 END), 0), 0) AS opt_pvp_avg_buy,
                    ROUND(SUM(CASE WHEN s.pvp_type = 'Optional PvP' AND mc.sell_offer > 0 THEN CAST(mc.sell_offer AS REAL) * (mc.buy_offers + mc.sell_offers) ELSE 0 END)
                        / NULLIF(SUM(CASE WHEN s.pvp_type = 'Optional PvP' AND mc.sell_offer > 0 THEN mc.buy_offers + mc.sell_offers ELSE 0 END), 0), 0) AS opt_pvp_avg_sell,
                    ROUND(SUM(CASE WHEN s.pvp_type = 'Optional PvP' AND s.battleye = 'Green' AND mc.buy_offer > 0 THEN CAST(mc.buy_offer AS REAL) * (mc.buy_offers + mc.sell_offers) ELSE 0 END)
                        / NULLIF(SUM(CASE WHEN s.pvp_type = 'Optional PvP' AND s.battleye = 'Green' AND mc.buy_offer > 0 THEN mc.buy_offers + mc.sell_offers ELSE 0 END), 0), 0) AS opt_pvp_green_avg_buy,
                    ROUND(SUM(CASE WHEN s.pvp_type = 'Optional PvP' AND s.battleye = 'Green' AND mc.sell_offer > 0 THEN CAST(mc.sell_offer AS REAL) * (mc.buy_offers + mc.sell_offers) ELSE 0 END)
                        / NULLIF(SUM(CASE WHEN s.pvp_type = 'Optional PvP' AND s.battleye = 'Green' AND mc.sell_offer > 0 THEN mc.buy_offers + mc.sell_offers ELSE 0 END), 0), 0) AS opt_pvp_green_avg_sell
                FROM market_current mc
                JOIN servers s ON s.id = mc.server_id
                GROUP BY mc.item_id
            ) g
            JOIN (
                SELECT mc.item_id, mc.server_id, mc.buy_offer, mc.sell_offer,
                       mc.buy_offers + mc.sell_offers AS activity
                FROM market_current mc
                WHERE mc.buy_offers + mc.sell_offers = (
                    SELECT MAX(buy_offers + sell_offers)
                    FROM market_current mx
                    WHERE mx.item_id = mc.item_id
                )
                GROUP BY mc.item_id
            ) t ON t.item_id = g.item_id
            LEFT JOIN (
                SELECT mc.item_id, mc.server_id, mc.buy_offer, mc.sell_offer
                FROM market_current mc
                JOIN servers s ON s.id = mc.server_id AND s.pvp_type = 'Optional PvP'
                WHERE mc.buy_offers + mc.sell_offers = (
                    SELECT MAX(mc2.buy_offers + mc2.sell_offers)
                    FROM market_current mc2
                    JOIN servers s2 ON s2.id = mc2.server_id AND s2.pvp_type = 'Optional PvP'
                    WHERE mc2.item_id = mc.item_id
                )
                GROUP BY mc.item_id
            ) t1 ON t1.item_id = g.item_id
            LEFT JOIN (
                SELECT mc.item_id, mc.server_id, mc.buy_offer, mc.sell_offer
                FROM market_current mc
                JOIN servers s ON s.id = mc.server_id AND s.pvp_type = 'Optional PvP' AND s.battleye = 'Green'
                WHERE mc.buy_offers + mc.sell_offers = (
                    SELECT MAX(mc2.buy_offers + mc2.sell_offers)
                    FROM market_current mc2
                    JOIN servers s2 ON s2.id = mc2.server_id AND s2.pvp_type = 'Optional PvP' AND s2.battleye = 'Green'
                    WHERE mc2.item_id = mc.item_id
                )
                GROUP BY mc.item_id
            ) t2 ON t2.item_id = g.item_id
        """)
        logger.debug("market_summary rebuilt")
    except sqlite3.Error as e:
        logger.error(f"Failed to rebuild market_summary: {e}")
        raise


def update_server_timestamps(conn, server_id: int, api_last_update: str, max_item_time: Optional[float]):
    """Update server timestamps after successful fetch."""
    try:
        conn.execute(
            """
            UPDATE servers
            SET api_last_update  = ?,
                market_last_fetch = ?
            WHERE id = ?
            """,
            (api_last_update, max_item_time, server_id),
        )
        logger.debug(f"Updated timestamps for server_id={server_id}")
    except sqlite3.Error as e:
        logger.error(f"Database error updating timestamps for server_id={server_id}: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(description="Fetch market data from tibiamarket.top")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--all", action="store_true", help="Fetch all servers")
    group.add_argument("--name", nargs="+", metavar="SERVER", help="Filter by server name(s)")
    group.add_argument("--region", nargs="+", choices=["EU", "NA", "SA", "OCE"], help="Filter by region(s)")
    group.add_argument("--pvp", nargs="+", metavar="TYPE",
                       help='Filter by PvP type(s): "Open PvP", "Optional PvP", "Retro Open PvP", "Retro Hardcore PvP"')
    group.add_argument("--battleye", nargs="+", choices=["Green", "Yellow"], help="Filter by BattlEye status")
    parser.add_argument("--force", action="store_true", help="Skip timestamp check and always fetch")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be fetched without fetching")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    args = parser.parse_args()

    # Adjust logging level if verbose
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    if not any([args.all, args.name, args.region, args.pvp, args.battleye]):
        parser.print_help()
        sys.exit(1)

    # Use context manager for database connection
    try:
        with get_db() as conn:
            _process_fetch(conn, args)
    except sqlite3.Error as e:
        logger.error(f"Database error: {e}")
        sys.exit(1)
    except requests.RequestException as e:
        logger.error(f"API request error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        sys.exit(1)


def _process_fetch(conn, args):
    """Internal fetch processing logic."""
    servers = select_servers(conn, args)
    if not servers:
        print("No servers matched your filter.")
        return

    print(f"Matched {len(servers)} server(s): {', '.join(s['name'] for s in servers)}")
    logger.info(f"Matched {len(servers)} server(s)")

    world_timestamps = fetch_world_data()

    to_fetch = []
    skipped = []
    not_in_api = []

    for server in servers:
        name = server["name"]
        api_ts = world_timestamps.get(name)

        if api_ts is None:
            not_in_api.append(name)
            logger.warning(f"Server '{name}' not found in API world data")
            continue

        if args.force:
            to_fetch.append((server, api_ts))
            continue

        db_ts = server["api_last_update"]
        if db_ts is None or api_ts != db_ts:
            to_fetch.append((server, api_ts))
        else:
            skipped.append(name)

    if skipped:
        print(f"Skipping {len(skipped)} server(s) with unchanged timestamps: {', '.join(skipped)}")
        logger.info(f"Skipping {len(skipped)} server(s) with unchanged timestamps")
    if not_in_api:
        print(f"Warning: {len(not_in_api)} server(s) not found in world_data API response: {', '.join(not_in_api)}")
    if not to_fetch:
        print("Nothing to fetch — all servers are up to date.")
        return

    print(f"\nWill fetch {len(to_fetch)} server(s):")
    for server, api_ts in to_fetch:
        db_ts = server["api_last_update"] or "never fetched"
        print(f"  {server['name']:20s}  api={api_ts}  db={db_ts}")

    if args.dry_run:
        print("\n[dry-run] No data written.")
        return

    print()
    fetched = 0
    failed = []

    for i, (server, api_ts) in enumerate(to_fetch):
        name = server["name"]
        server_id = server["id"]
        print(f"[{i + 1}/{len(to_fetch)}] Fetching {name}...", end=" ", flush=True)
        logger.info(f"Fetching {name} ({i + 1}/{len(to_fetch)})")

        try:
            items = fetch_market_values(name)
        except requests.RequestException as exc:
            print(f"FAILED ({exc})")
            logger.error(f"Failed to fetch {name}: {exc}")
            failed.append(name)
            items = None

        if items is not None:
            full_data_items = [it for it in items if it.get("is_full_data")]
            max_item_time = max((it["time"] for it in full_data_items), default=None)

            # Database operations with transaction
            try:
                ensure_items_exist(conn, items)
                upsert_market_current(conn, server_id, items)
                # Uncomment to enable history tracking:
                # insert_market_history(conn, server_id, items)
                update_server_timestamps(conn, server_id, api_ts, max_item_time)
                rebuild_market_summary(conn)
                conn.commit()
                logger.info(f"Successfully processed {name}: {len(full_data_items)} items")
                print(f"OK — {len(full_data_items)} full-data items (max time: {max_item_time})")
                fetched += 1
            except sqlite3.Error as e:
                conn.rollback()
                print(f"FAILED (DB error: {e})")
                logger.error(f"Database error processing {name}: {e}")
                failed.append(name)

        if i < len(to_fetch) - 1:
            print(f"Waiting {REQUEST_DELAY} seconds before next request...")
            time.sleep(REQUEST_DELAY)

    print(f"\nDone. Fetched: {fetched}, Skipped: {len(skipped)}, Failed: {len(failed)}")
    logger.info(f"Fetch complete. Fetched: {fetched}, Skipped: {len(skipped)}, Failed: {len(failed)}")
    if failed:
        print(f"Failed servers: {', '.join(failed)}")


if __name__ == "__main__":
    main()
