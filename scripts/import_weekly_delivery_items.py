"""Import weekly delivery items from TibiaPal into the local SQLite database.

Usage examples:
    python scripts/import_weekly_delivery_items.py
    python scripts/import_weekly_delivery_items.py --source-url https://tibiapal.com/deliveries
    python scripts/import_weekly_delivery_items.py --dry-run
    python scripts/import_weekly_delivery_items.py --verbose

The importer scrapes the delivery item list, resolves the local item IDs from the
`items` table, and stores the active weekly delivery pool in `weekly_delivery_items`.
"""

from __future__ import annotations

import argparse
import html
import logging
import re
import sqlite3
import sys
from dataclasses import dataclass
from typing import Optional

import requests

from backend import get_db, LOG_FORMAT, LOG_LEVEL

DEFAULT_SOURCE_URL = "https://tibiapal.com/deliveries"
TABLE_ID = "deliveries_table_everything"
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}

logging.basicConfig(level=getattr(logging, LOG_LEVEL), format=LOG_FORMAT)
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DeliverySourceItem:
    order: int
    name: str
    npc_price: Optional[int]
    market_value: Optional[str]


_TAG_RE = re.compile(r"<[^>]+>")
_TABLE_RE = re.compile(
    rf'<table[^>]*id=["\']{TABLE_ID}["\'][^>]*>(.*?)</table>', re.IGNORECASE | re.DOTALL
)
_ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.IGNORECASE | re.DOTALL)
_CELL_RE = re.compile(r"<t[dh][^>]*>(.*?)</t[dh]>", re.IGNORECASE | re.DOTALL)


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def clean_text(value: str) -> str:
    text = html.unescape(_TAG_RE.sub("", value))
    return re.sub(r"\s+", " ", text).strip()


def parse_price(value: str) -> Optional[int]:
    digits = re.sub(r"[^0-9]", "", clean_text(value))
    if not digits:
        return None
    return int(digits)


def fetch_source_html(url: str) -> str:
    logger.info(f"Fetching delivery source: {url}")
    response = requests.get(url, headers=REQUEST_HEADERS, timeout=30)
    response.raise_for_status()
    return response.text


def extract_delivery_items(source_html: str) -> list[DeliverySourceItem]:
    table_match = _TABLE_RE.search(source_html)
    if not table_match:
        raise ValueError(f"Could not find delivery table with id={TABLE_ID!r}")

    table_html = table_match.group(1)
    rows = _ROW_RE.findall(table_html)
    if not rows:
        raise ValueError("Delivery table has no rows")

    items: list[DeliverySourceItem] = []
    order = 1

    for row_html in rows[1:]:
        cells = _CELL_RE.findall(row_html)
        if len(cells) < 4:
            continue

        name = clean_text(cells[1])
        market_value = clean_text(cells[3])
        npc_price = parse_price(cells[2])

        if not name:
            continue

        items.append(
            DeliverySourceItem(
                order=order,
                name=name,
                npc_price=npc_price,
                market_value=market_value or None,
            )
        )
        order += 1

    if not items:
        raise ValueError("No delivery items could be parsed from the source page")

    return items


def ensure_delivery_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS weekly_delivery_items (
            item_id INTEGER PRIMARY KEY,
            is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
            source_order INTEGER,
            source_market_value TEXT,
            notes TEXT,
            added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        )
        """
    )

    existing_columns = {row[1] for row in conn.execute("PRAGMA table_info(weekly_delivery_items)")}
    if "source_order" not in existing_columns:
        conn.execute("ALTER TABLE weekly_delivery_items ADD COLUMN source_order INTEGER")
    if "source_market_value" not in existing_columns:
        conn.execute("ALTER TABLE weekly_delivery_items ADD COLUMN source_market_value TEXT")


def load_item_lookup(conn: sqlite3.Connection) -> dict[str, int]:
    cursor = conn.execute("SELECT id, name, wiki_name FROM items")
    lookup: dict[str, int] = {}

    for row in cursor.fetchall():
        item_id = row["id"]
        for candidate in (row["name"], row["wiki_name"]):
            if not candidate:
                continue
            key = normalize_name(candidate)
            lookup.setdefault(key, item_id)

    return lookup


def resolve_item_id(name: str, lookup: dict[str, int]) -> Optional[int]:
    exact_key = normalize_name(name)
    return lookup.get(exact_key)


def upsert_delivery_items(
    conn: sqlite3.Connection,
    source_items: list[DeliverySourceItem],
    lookup: dict[str, int],
) -> tuple[int, list[str]]:
    missing_items: list[str] = []
    resolved_ids: list[int] = []
    processed = 0

    for source_item in source_items:
        item_id = resolve_item_id(source_item.name, lookup)
        if item_id is None:
            missing_items.append(source_item.name)
            continue

        resolved_ids.append(item_id)
        conn.execute(
            """
            INSERT INTO weekly_delivery_items (
                item_id,
                is_active,
                source_order,
                source_market_value,
                added_at,
                updated_at
            ) VALUES (?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(item_id) DO UPDATE SET
                is_active = 1,
                source_order = excluded.source_order,
                source_market_value = excluded.source_market_value,
                updated_at = CURRENT_TIMESTAMP
            """,
            (item_id, source_item.order, source_item.market_value),
        )
        processed += 1

    if resolved_ids:
        placeholders = ",".join("?" for _ in resolved_ids)
        conn.execute(
            f"""
            UPDATE weekly_delivery_items
            SET is_active = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE item_id NOT IN ({placeholders})
            """,
            resolved_ids,
        )
    else:
        logger.warning("No source items matched local items; skipping deactivation pass")

    return processed, missing_items


def main() -> int:
    parser = argparse.ArgumentParser(description="Import TibiaPal weekly delivery items into SQLite")
    parser.add_argument("--source-url", default=DEFAULT_SOURCE_URL, help="Delivery list URL to scrape")
    parser.add_argument("--dry-run", action="store_true", help="Parse the source but do not write to the database")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        source_html = fetch_source_html(args.source_url)
        source_items = extract_delivery_items(source_html)
    except (requests.RequestException, ValueError) as exc:
        logger.error(f"Failed to load delivery source: {exc}")
        print(f"Error: {exc}")
        return 1

    print(f"Parsed {len(source_items)} delivery items from {args.source_url}")
    logger.info(f"Parsed {len(source_items)} delivery items from {args.source_url}")

    if args.dry_run:
        for item in source_items[:10]:
            print(f"  {item.order:>3}. {item.name} | NPC {item.npc_price or 'N/A'} | {item.market_value or 'N/A'}")
        if len(source_items) > 10:
            print(f"  ... {len(source_items) - 10} more items")
        return 0

    try:
        with get_db() as conn:
            ensure_delivery_schema(conn)
            lookup = load_item_lookup(conn)
            processed, missing_items = upsert_delivery_items(conn, source_items, lookup)

            conn.commit()
            print(f"Imported {processed} delivery items into weekly_delivery_items")
            if missing_items:
                print("Warning: some delivery items could not be matched to local items.")
                for name in missing_items[:25]:
                    print(f"  - {name}")
                if len(missing_items) > 25:
                    print(f"  ... and {len(missing_items) - 25} more")
            return 0

    except sqlite3.Error as exc:
        logger.error(f"Database error importing delivery items: {exc}")
        print(f"Error: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
