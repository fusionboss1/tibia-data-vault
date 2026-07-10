"""
export_planner.py — Analyze stash and recommend where to sell each item.

Decisions:
    - sell_to_npc: NPC buy price is the best option.
    - sell_at_home: Market on your home server is the best option.
    - export: Another Optional PvP server pays more than home + transfer cost.
    - borderline: Could sell at home but is slow or low profit.

Usage:
    python -m scripts.export_planner --home Bravoria
    python -m scripts.export_planner --home Bravoria --transfer-cost 750000 --min-profit 500000 --output plan.csv
"""

import argparse
import csv
import logging
import sys
from collections import defaultdict
from pathlib import Path
from typing import Optional

from backend import get_db
from backend.config import LOG_FORMAT, LOG_LEVEL

logging.basicConfig(level=getattr(logging, LOG_LEVEL), format=LOG_FORMAT)
logger = logging.getLogger(__name__)


# Tunable thresholds --------------------------------------------------------
SCORE_SELL_HOME = 1.0
SCORE_BORDERLINE = 0.3


def get_tibia_coin_price(home_server_id: int) -> int:
    """Return the current buy price of Tibia Coins on the home server."""
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT COALESCE(mc.buy_offer, 0) AS tc_price
            FROM market_current mc
            JOIN items i ON mc.item_id = i.id
            WHERE mc.server_id = ? AND i.name = 'Tibia Coins'
            """,
            (home_server_id,),
        ).fetchone()

    if not row or not row["tc_price"]:
        raise ValueError(
            "Tibia Coin market data not found for the home server. "
            "Run fetch_market for your home server first."
        )

    return row["tc_price"]


def load_stash_and_home_market(home_server: str):
    """
    Load stash items joined with home market data, NPC prices, and best
    Optional PvP target server info.
    """
    with get_db() as conn:
        home_server_id = conn.execute(
            "SELECT id FROM servers WHERE name = ?", (home_server,)
        ).fetchone()
        if not home_server_id:
            raise ValueError(f"Home server '{home_server}' not found in database.")
        home_server_id = home_server_id["id"]

        rows = conn.execute(
            """
            SELECT
                i.id AS item_id,
                i.name AS item_name,
                si.quantity,
                COALESCE(i.best_npc_buy_price, 0) AS npc_buy_price,
                COALESCE(mc.buy_offer, 0) AS home_buy,
                COALESCE(mc.sell_offer, 0) AS home_sell,
                COALESCE(mc.buy_offers, 0) AS buy_offers,
                COALESCE(mc.sell_offers, 0) AS sell_offers,
                ms.opt_pvp_avg_buy,
                ms.opt_pvp_top_server_id,
                ms.opt_pvp_top_server_buy,
                ts.name AS target_server_name
            FROM stash_inventory si
            JOIN items i ON si.item_id = i.id
            JOIN market_summary ms ON si.item_id = ms.item_id
            LEFT JOIN market_current mc
                ON si.item_id = mc.item_id AND mc.server_id = ?
            LEFT JOIN servers ts ON ms.opt_pvp_top_server_id = ts.id
            WHERE ms.opt_pvp_avg_buy IS NOT NULL AND ms.opt_pvp_avg_buy > 0
            """,
            (home_server_id,),
        ).fetchall()

    return home_server_id, [dict(row) for row in rows]


def classify_item(row: dict, transfer_cost: int, min_profit_percent: float) -> dict:
    """
    Apply the decision rules to one item and return an enriched row with
    recommendation and profit numbers.
    """
    home_buy = row["home_buy"]
    npc_buy = row["npc_buy_price"]
    target_buy = row.get("opt_pvp_top_server_buy") or 0
    target_server = row.get("target_server_name")

    home_value = max(home_buy, npc_buy)
    buy_offers = row["buy_offers"]
    sell_offers = row["sell_offers"]
    opt_pvp_avg = row["opt_pvp_avg_buy"]

    # Market liquidity score (only meaningful if there is a market buyer)
    if sell_offers == 0:
        ratio = buy_offers  # no competition, demand is the only factor
    else:
        ratio = buy_offers / sell_offers

    home_sell_score = ratio * (home_value / opt_pvp_avg) if opt_pvp_avg else 0

    # Export profit ratio makes sense across cheap and expensive items
    export_profit_per_item = target_buy - home_value
    if home_value > 0:
        export_profit_ratio = export_profit_per_item / home_value
    elif target_buy > 0:
        export_profit_ratio = float("inf")  # item is worthless at home, any target price is profit
    else:
        export_profit_ratio = 0

    # Decision rules
    if npc_buy > 0 and npc_buy >= target_buy and npc_buy >= home_buy:
        decision = "sell_to_npc"
        profit_per_item = npc_buy - home_buy  # usually 0 or small if market is lower
    elif home_buy >= target_buy:
        decision = "sell_at_home"
        profit_per_item = 0  # baseline: keep the item home, no extra profit
    elif export_profit_ratio > (min_profit_percent / 100):
        decision = "export"
        profit_per_item = export_profit_per_item
    elif home_sell_score >= SCORE_SELL_HOME:
        decision = "sell_at_home"
        profit_per_item = 0
    elif home_sell_score >= SCORE_BORDERLINE:
        decision = "borderline"
        profit_per_item = 0
    else:
        decision = "export"
        profit_per_item = export_profit_per_item

    row["home_value"] = home_value
    row["home_sell_score"] = round(home_sell_score, 3)
    row["profit_per_item"] = profit_per_item
    row["total_profit"] = profit_per_item * row["quantity"]
    row["export_profit_ratio"] = round(export_profit_ratio, 3)
    row["decision"] = decision
    row["target_server"] = target_server
    return row


def build_transfer_plan(items: list[dict], transfer_cost: int) -> list[dict]:
    """
    Group export items by their best target server and greedily pick the
    servers that pay for themselves.
    """
    by_server = defaultdict(list)
    for item in items:
        if item["decision"] == "export" and item["target_server"]:
            by_server[item["target_server"]].append(item)

    server_profits = []
    for server, server_items in by_server.items():
        gross = sum(i["total_profit"] for i in server_items)
        net = gross - transfer_cost
        server_profits.append({
            "server": server,
            "item_count": len(server_items),
            "total_quantity": sum(i["quantity"] for i in server_items),
            "gross_profit": gross,
            "net_profit": net,
            "items": server_items,
        })

    server_profits.sort(key=lambda x: x["net_profit"], reverse=True)

    plan = []
    for sp in server_profits:
        if sp["net_profit"] > 0:
            plan.append(sp)
        else:
            # Once the next server does not pay for itself, stop the greedy plan.
            break

    return plan


def print_summary(items: list[dict]) -> None:
    """Print a quick summary table by decision category."""
    counts = defaultdict(lambda: {"items": 0, "quantity": 0})
    for item in items:
        counts[item["decision"]]["items"] += 1
        counts[item["decision"]]["quantity"] += item["quantity"]

    print("\n=== Summary ===")
    print(f"{'Decision':<18} {'Items':>8} {'Quantity':>12}")
    print("-" * 40)
    for decision in ["sell_to_npc", "sell_at_home", "borderline", "export"]:
        c = counts[decision]
        print(f"{decision:<18} {c['items']:>8} {c['quantity']:>12}")


def print_table(title: str, items: list[dict], columns: list[tuple]) -> None:
    """Print a formatted table for a list of items."""
    if not items:
        return

    print(f"\n=== {title} ({len(items)} items) ===")
    headers = [col[0] for col in columns]
    widths = [max(len(col[0]), max(len(str(col[1](i))) for i in items)) for col in columns]

    header_line = "  ".join(h.ljust(w) for h, w in zip(headers, widths))
    print(header_line)
    print("-" * len(header_line))

    for item in items[:20]:  # cap at 20 rows for console output
        row = "  ".join(str(col[1](item)).ljust(w) for col, w in zip(columns, widths))
        print(row)


def save_csv(path: str, items: list[dict]) -> None:
    """Save the full item list to a CSV file."""
    if not items:
        return

    fieldnames = [
        "item_name", "quantity", "npc_buy_price", "home_buy", "home_sell",
        "buy_offers", "sell_offers", "opt_pvp_avg_buy", "opt_pvp_top_server_buy",
        "target_server", "home_value", "home_sell_score", "export_profit_ratio",
        "profit_per_item", "total_profit", "decision",
    ]

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(items)

    logger.info(f"Saved detailed plan to {path}")


def main():
    parser = argparse.ArgumentParser(
        description="Analyze your stash and build an export plan."
    )
    parser.add_argument("--home", required=True, help="Your home server name (e.g., Bravoria)")
    parser.add_argument("--transfer-tc", type=int, default=750,
                        help="World transfer cost in Tibia Coins (default: 750)")
    parser.add_argument("--transfer-cost", type=int, default=None,
                        help="Override the transfer cost in gold (skips TC lookup)")
    parser.add_argument("--min-profit-percent", type=float, default=10.0,
                        help="Minimum profit percent to prefer export over home (default: 10)")
    parser.add_argument("--output", type=str, help="Optional CSV file to write the full plan")
    args = parser.parse_args()

    logger.info(f"Loading stash and market data for home server: {args.home}")
    home_server_id, rows = load_stash_and_home_market(args.home)

    if args.transfer_cost is not None:
        transfer_cost_gold = args.transfer_cost
    else:
        tc_price = get_tibia_coin_price(home_server_id)
        transfer_cost_gold = args.transfer_tc * tc_price

    logger.info(f"Using transfer cost: {transfer_cost_gold:,} gp ({args.transfer_tc} TC × {tc_price:,} gp/TC)")

    classified = [classify_item(row, transfer_cost_gold, args.min_profit_percent) for row in rows]

    print_summary(classified)

    # Tables by decision
    sell_to_npc = [i for i in classified if i["decision"] == "sell_to_npc"]
    sell_at_home = [i for i in classified if i["decision"] == "sell_at_home"]
    borderline = [i for i in classified if i["decision"] == "borderline"]
    export = [i for i in classified if i["decision"] == "export"]

    print_table(
        "Sell to NPC",
        sorted(sell_to_npc, key=lambda x: x["total_profit"], reverse=True),
        [
            ("Item", lambda i: i["item_name"]),
            ("Qty", lambda i: i["quantity"]),
            ("NPC buy", lambda i: i["npc_buy_price"]),
            ("Home buy", lambda i: i["home_buy"]),
            ("Target buy", lambda i: i.get("opt_pvp_top_server_buy") or 0),
        ],
    )

    print_table(
        "Sell at home (market)",
        sorted(sell_at_home, key=lambda x: x["home_sell_score"], reverse=True),
        [
            ("Item", lambda i: i["item_name"]),
            ("Qty", lambda i: i["quantity"]),
            ("Home buy", lambda i: i["home_buy"]),
            ("Buyers", lambda i: i["buy_offers"]),
            ("Sellers", lambda i: i["sell_offers"]),
            ("Score", lambda i: i["home_sell_score"]),
        ],
    )

    print_table(
        "Borderline",
        sorted(borderline, key=lambda x: x["home_sell_score"], reverse=True),
        [
            ("Item", lambda i: i["item_name"]),
            ("Qty", lambda i: i["quantity"]),
            ("Home buy", lambda i: i["home_buy"]),
            ("Buyers", lambda i: i["buy_offers"]),
            ("Sellers", lambda i: i["sell_offers"]),
            ("Score", lambda i: i["home_sell_score"]),
        ],
    )

    print_table(
        "Export candidates",
        sorted(export, key=lambda x: x["total_profit"], reverse=True),
        [
            ("Item", lambda i: i["item_name"]),
            ("Qty", lambda i: i["quantity"]),
            ("Target", lambda i: i["target_server"] or "?"),
            ("Home value", lambda i: i["home_value"]),
            ("Target buy", lambda i: i.get("opt_pvp_top_server_buy") or 0),
            ("Profit/item", lambda i: i["profit_per_item"]),
            ("Total profit", lambda i: i["total_profit"]),
        ],
    )

    # Transfer plan
    plan = build_transfer_plan(classified, transfer_cost_gold)
    print("\n=== Recommended transfer plan (greedy, one by one) ===")
    print(f"Transfer cost used: {transfer_cost_gold:,} gp")
    if not plan:
        print("No server transfer is profitable with the current settings.")
    else:
        print(f"{'Server':<15} {'Items':>6} {'Gross profit':>14} {'Net profit':>14}")
        print("-" * 55)
        for sp in plan:
            print(f"{sp['server']:<15} {sp['item_count']:>6} {sp['gross_profit']:>14,} {sp['net_profit']:>14,}")
        total_net = sum(sp["net_profit"] for sp in plan)
        print(f"\nTotal estimated net profit across {len(plan)} transfer(s): {total_net:,} gp")

    if args.output:
        save_csv(args.output, classified)


if __name__ == "__main__":
    main()
