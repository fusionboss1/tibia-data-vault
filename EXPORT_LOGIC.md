# Export Logic

This document describes the decision rules for planning a world transfer from a dead home server to a more active Optional PvP server.

## Goal

Empty your stash by moving items that are hard to sell at home to servers where they sell better, while leaving items that are already fine at home.

## Data we use

| Data | Source | Meaning |
| --- | --- | --- |
| Home market price | `market_current` on your server | Best buy offer currently posted on your server |
| NPC sell price | `items.best_npc_buy_price` | What an NPC pays you when you sell the item |
| Optional PvP average | `market_summary.opt_pvp_avg_buy` | Average best buy offer across all Optional PvP servers |
| Best target price | `market_summary.opt_pvp_top_server_buy` | Highest best buy offer on any Optional PvP server |
| Best target server | `market_summary.opt_pvp_top_server_id` | Server with the best buy offer |
| Demand at home | `market_current.buy_offers` | How many buy offers exist on your server |
| Supply at home | `market_current.sell_offers` | How many sell offers exist on your server |
| Your stash | `stash_inventory` | Items and quantities you own |

> Note: `best_npc_buy_price` is the price **NPCs pay you**. The `best_npc_sell_price` column is what you pay to buy from NPCs and is not used here.

## Core idea

For every item we compute two values:

```python
home_value = max(home_buy_price, npc_buy_price)
```

This is the best you can get without leaving your server. If a target server pays more than this by a meaningful margin, the item is an export candidate.

## Sell-at-home score

This score measures how liquid and well-priced an item is on your home server:

```python
ratio = buy_offers / sell_offers
if sell_offers == 0:
    ratio = buy_offers  # no competition, demand is all that matters

home_sell_score = ratio * (home_value / opt_pvp_avg_buy)
```

| Score range | Meaning |
| --- | --- |
| ≥ 1.0 | Good to sell at home |
| 0.3 – 1.0 | Borderline — might sell, but slowly |
| < 0.3 | Better to export |

## Per-item decision rules

```python
if npc_buy >= target_buy and npc_buy >= home_buy:
    decision = "sell_to_npc"

elif home_buy >= target_buy:
    decision = "sell_at_home"

else:
    export_profit_per_item = target_buy - home_value

    if home_value > 0:
        export_profit_ratio = export_profit_per_item / home_value
    elif target_buy > 0:
        export_profit_ratio = float("inf")  # item is worthless at home, any target price is profit
    else:
        export_profit_ratio = 0

    if export_profit_ratio > (min_profit_percent / 100):
        decision = "export"
    elif home_sell_score >= 1.0:
        decision = "sell_at_home"
    elif home_sell_score >= 0.3:
        decision = "borderline"
    else:
        decision = "export"
```

`min_profit_percent` is a percentage threshold. The default is **10%**. It means: only export an item if the target price is at least 10% higher than its best home value. This scales correctly for both cheap and expensive items.

## Transfer planning

After every item is classified, we group the export items by their best target server.

For each server:

```python
gross_profit = sum(profit_per_item * quantity for all items assigned to this server)
net_profit = gross_profit - transfer_cost
```

The transfer cost is computed from live data:

```python
transfer_cost_gold = transfer_cost_tc * tibia_coin_price_on_home_server
```

Default `transfer_cost_tc` is **750 TC**. The Tibia Coin price is read from `market_current` for the item named `Tibia Coins` on the home server.

## Greedy one-by-one transfer plan

1. Sort target servers by `net_profit` from highest to lowest.
2. Walk through the list and add a server to the plan only if its `net_profit` is positive.
3. Stop at the first server that does not pay for itself.

This gives you the balanced, incremental plan we discussed: do transfers one by one instead of planning 40 transfers at once.

## Single-transfer baseline

Before committing to multiple transfers, always compare against the simplest plan: transfer everything to the single best target server. The greedy multi-transfer plan is only better if its final total profit is clearly higher.

## Full flow summary

1. For each item, find the best home value (`max(home market, NPC)`).
2. Compare it to the best Optional PvP target price.
3. Decide: sell to NPC, sell at home, or export.
4. Group export items by target server.
5. Add servers one by one as long as each transfer pays for itself.
6. Compare against the single-best-server plan.

## Thresholds used

| Threshold | Default | Purpose |
| --- | --- | --- |
| Sell-at-home score | 1.0 | Strong enough to sell locally |
| Borderline score | 0.3 | Slow but possible local sale |
| Minimum export profit | 10% | Scales per-item profit correctly |
| Transfer cost in TC | 750 | Standard world transfer cost |

These can be tuned based on how aggressive or conservative you want the plan to be.
