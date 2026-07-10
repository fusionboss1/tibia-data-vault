# Tibiamarket.top API Reference

External API documentation for the market data source used by Tibia Data Vault.

- **Base URL:** `https://api.tibiamarket.top` (configurable via `TIBIA_MARKET_API_URL`)
- **Swagger docs:** <https://api.tibiamarket.top/docs#/>
- **OpenAPI spec:** <https://api.tibiamarket.top/openapi.json>

## Endpoints Used by This Project

### GET `/world_data`

Returns last-update timestamps for all game worlds. Used to check whether a server's data has changed before fetching.

**Query parameters:**

| Param | Required | Default | Description |
| ---- | -------- | ------- | ----------- |
| `servers` | no | all | Comma-separated server names to filter by |

**Response:**

```json
[
  { "name": "Antica", "last_update": "2024-01-15T12:00:00" },
  { "name": "Secura", "last_update": "2024-01-15T12:00:00" }
]
```

| Field | Type | Description |
| ----- | ---- | ----------- |
| `name` | string | Server (world) name |
| `last_update` | string (date-time) | ISO timestamp of the last market scan |

**Used by:** `scripts/fetch_market.py` — `fetch_world_data()`

---

### GET `/market_values`

Returns the current market snapshot for a single server. Paginates with `skip` and `limit`.

**Query parameters:**

| Param | Required | Default | Description |
| ---- | -------- | ------- | ----------- |
| `server` | yes | — | Server name (e.g. `"Antica"`) |
| `item_ids` | no | all | Comma-separated list of item IDs to filter by |
| `max_sell_price` | no | — | Maximum sell price filter |
| `min_buy_price` | no | — | Minimum buy price filter |
| `max_buy_price` | no | — | Maximum buy price filter |
| `min_sell_price` | no | — | Minimum sell price filter |
| `max_flippers` | no | — | Maximum number of flippers filter |
| `min_flippers` | no | — | Minimum number of flippers filter |
| `skip` | no | 0 | Number of records to skip (pagination) |
| `limit` | no | 100 | Page size (project uses 5000) |

**Response (array of `MarketValues`):**

```json
[
  {
    "id": 3041,
    "time": 1705312800,
    "is_full_data": true,
    "buy_offer": 1500,
    "sell_offer": 1800,
    "buy_offers": 12,
    "sell_offers": 8,
    "month_average_sell": 1750,
    "month_average_buy": 1400,
    "month_sold": 45,
    "month_bought": 30,
    "active_traders": 15,
    "month_highest_sell": 2000,
    "month_lowest_buy": 1200,
    "month_lowest_sell": 1600,
    "month_highest_buy": 1700,
    "day_average_sell": 1800,
    "day_average_buy": 1500,
    "day_sold": 5,
    "day_bought": 3,
    "day_highest_sell": 1900,
    "day_lowest_sell": 1700,
    "day_highest_buy": 1600,
    "day_lowest_buy": 1400,
    "total_immediate_profit": 200,
    "total_immediate_profit_info": ""
  }
]
```

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `id` | int | — | Tibia item ID |
| `time` | float | — | Unix timestamp of the data snapshot |
| `is_full_data` | bool | false | Whether this row has complete market data |
| `buy_offer` | int | -1 | Best buy offer price (gold) |
| `sell_offer` | int | -1 | Best sell offer price (gold) |
| `buy_offers` | int | -1 | Number of active buy offers |
| `sell_offers` | int | -1 | Number of active sell offers |
| `month_average_sell` | int | -1 | 30-day average sell price |
| `month_average_buy` | int | -1 | 30-day average buy price |
| `month_sold` | int | -1 | Total sold in past 30 days |
| `month_bought` | int | -1 | Total bought in past 30 days |
| `active_traders` | int | -1 | Number of active traders |
| `month_highest_sell` | int | -1 | Highest sell price in past 30 days |
| `month_lowest_buy` | int | -1 | Lowest buy price in past 30 days |
| `month_lowest_sell` | int | -1 | Lowest sell price in past 30 days |
| `month_highest_buy` | int | -1 | Highest buy price in past 30 days |
| `day_average_sell` | int | -1 | 24-hour average sell price |
| `day_average_buy` | int | -1 | 24-hour average buy price |
| `day_sold` | int | -1 | Total sold in past 24 hours |
| `day_bought` | int | -1 | Total bought in past 24 hours |
| `day_highest_sell` | int | -1 | Highest sell price in past 24 hours |
| `day_lowest_sell` | int | -1 | Lowest sell price in past 24 hours |
| `day_highest_buy` | int | -1 | Highest buy price in past 24 hours |
| `day_lowest_buy` | int | -1 | Lowest buy price in past 24 hours |
| `total_immediate_profit` | int | -1 | Calculated immediate profit |
| `total_immediate_profit_info` | string | "" | Info about the profit calculation |

> **Note:** The project currently only stores `buy_offer`, `sell_offer`, `buy_offers`, `sell_offers`, and `time`. All other fields (monthly/daily stats, trader counts, profit calculations) are discarded on import. Rows with `is_full_data: false` are also skipped.

**Used by:** `scripts/fetch_market.py` — `fetch_market_values()`

---

### GET `/item_metadata`

Returns metadata for a single item by ID, or all items if no ID is given.

**Query parameters:**

| Param | Required | Default | Description |
| ---- | -------- | ------- | ----------- |
| `item_id` | no | -1 (all) | Tibia item ID |

**Response (array of `ItemMetaData`):**

```json
[
  {
    "id": 3041,
    "name": "magic light wand",
    "category": "Wands and Rods",
    "tier": 2,
    "wiki_name": "Magic Light Wand",
    "npc_sell": [
      {
        "name": "Black Bert",
        "location": "Thais City",
        "price": 5000,
        "currency_object_type_id": 0,
        "currency_quest_flag_display_name": ""
      }
    ],
    "npc_buy": [
      {
        "name": "Rashid",
        "location": "Various",
        "price": 3000,
        "currency_object_type_id": 0,
        "currency_quest_flag_display_name": ""
      }
    ]
  }
]
```

| Field | Type | Nullable | Description |
| ----- | ---- | -------- | ----------- |
| `id` | int | no | Tibia item ID |
| `name` | string | yes | Item name (lowercase in API) |
| `category` | string | yes | Item category |
| `tier` | int | no | Item tier (default -1 = no tier) |
| `wiki_name` | string | yes | Wiki display name |
| `npc_sell` | array | no | NPCs that **sell** this item to players |
| `npc_buy` | array | no | NPCs that **buy** this item from players |

**NPC entry fields (inside `npc_sell` and `npc_buy`):**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `name` | string | NPC name |
| `location` | string | NPC location |
| `price` | int | Price in gold |
| `currency_object_type_id` | int | Currency type (0 = gold) |
| `currency_quest_flag_display_name` | string | Quest flag display name (usually empty) |

> **Note:** The project currently computes `best_npc_sell_price` (min of `npc_sell` prices) and `best_npc_buy_price` (max of `npc_buy` prices) at fetch time and stores only the result. The raw `npc_sell` / `npc_buy` arrays are not persisted in the database.

**Used by:** `scripts/fetch_market.py` — `fetch_item_metadata()`

---

## Endpoints Not Currently Used

### GET `/item_history`

Returns price history for a specific item on a specific server.

| Param | Required | Default | Description |
| ---- | -------- | ------- | ----------- |
| `server` | yes | — | Server name |
| `item_id` | yes | — | Tibia item ID |
| `start_days_ago` | no | 30 | How many days back to start |
| `end_days_ago` | no | -1 (all) | How many days back to end |

Returns an array of `MarketValues` objects (same schema as `/market_values`), one per historical snapshot.

---

### GET `/events`

Returns tracked Tibia events (e.g. double XP, special events) by date.

| Param | Required | Default | Description |
| ---- | -------- | ------- | ----------- |
| `start_days_ago` | no | 30 | How many days back to start |
| `end_days_ago` | no | -1 (all) | How many days back to end |

Returns an array of `EventData`:

```json
[
  {
    "date": "2024-01-15T00:00:00",
    "events": ["Double XP Weekend", "Bewitched"]
  }
]
```

| Field | Type | Description |
| ----- | ---- | ----------- |
| `date` | string (date-time) | Event date |
| `events` | array of strings | Event names active on that date |

---

### GET `/item_activity`

Returns total active offers and verified trades for a given item across all worlds in the past 28 days, sorted by most trades.

| Param | Required | Default | Description |
| ---- | -------- | ------- | ----------- |
| `item_id` | yes | — | Tibia item ID |

Returns an array of `WorldActivity`:

```json
[
  {
    "name": "Antica",
    "total_trades": 145,
    "total_offers": 89
  }
]
```

| Field | Type | Description |
| ----- | ---- | ----------- |
| `name` | string | Server (world) name |
| `total_trades` | int | Verified trades in past 28 days |
| `total_offers` | int | Active offers in past 28 days |

---

### GET `/market_board`

Returns the full market board (order book) for a specific item on a specific server — all individual buy and sell orders.

| Param | Required | Default | Description |
| ---- | -------- | ------- | ----------- |
| `server` | yes | — | Server name |
| `item_id` | yes | — | Tibia item ID |

Returns a `MarketBoard`:

```json
{
  "id": 3041,
  "sellers": [
    { "name": "Player1", "amount": 10, "price": 1800, "time": 1705312800 }
  ],
  "buyers": [
    { "name": "Player2", "amount": 5, "price": 1500, "time": 1705312800 }
  ],
  "update_time": 1705312800
}
```

| Field | Type | Description |
| ----- | ---- | ----------- |
| `id` | int | Tibia item ID |
| `sellers` | array | Sell orders (see below) |
| `buyers` | array | Buy orders (see below) |
| `update_time` | float | Unix timestamp of last board update |

**Order entry fields (inside `sellers` and `buyers`):**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `name` | string | Trader name |
| `amount` | int | Quantity offered/requested |
| `price` | int | Price per unit (gold) |
| `time` | float | Unix timestamp of the order |

---

## Summary

| Endpoint | Used? | Purpose |
| -------- | ----- | ------- |
| `/world_data` | yes | Check if server data has changed before fetching |
| `/market_values` | yes | Fetch current market prices per server |
| `/item_metadata` | yes | Fetch metadata for new item IDs |
| `/item_history` | no | Historical price snapshots for a single item |
| `/events` | no | Tibia event calendar (double XP, etc.) |
| `/item_activity` | no | Per-world trade/offer activity for an item (28 days) |
| `/market_board` | no | Full order book (individual buy/sell orders) |

## Notes

- A local cache file (`item_metadata.json` at project root) is checked first to reduce API calls for `/item_metadata`.
- `is_full_data: false` rows from `/market_values` are skipped during import — only complete market data is stored.
- Requests are rate-limited with a configurable delay (`TIBIA_REQUEST_DELAY`, default 30 seconds between servers).
- The `/market_values` response contains 25+ fields, but the project only persists 5 (`buy_offer`, `sell_offer`, `buy_offers`, `sell_offers`, `time`). All monthly/daily stats, trader counts, and profit calculations are discarded.
