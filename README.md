# Tibia Data Vault

A web application for browsing and managing Tibia game server data.

## Version

Current version: **0.6.0** — Bounty Calculator beta deployed to `https://tibia-bounty-calc.netlify.app` on `feature/bounty-calculator`. See [CHANGELOG.md](CHANGELOG.md) for the full list of changes.

## Features

- **Bounty Calculator** *(beta — live at [tibia-bounty-calc.netlify.app](https://tibia-bounty-calc.netlify.app))*: Real-time decision tool for Bounty Tasks — no backend required, runs entirely in the browser
  - Fill any of the 3 task option cards; each reacts instantly without needing the others filled
  - Inputs per card: creature name (optional), spot XP/h (kk), kill rate (kills/h), kills required, tier
  - Compares effective XP/h — `(spotXP × T + taskReward) / T` — so sessions of different lengths are always compared fairly
  - **TAKE IT** on the single best option if it beats the benchmark; **SKIP** on all filled cards if none do
  - Separate event (No event / Bewitched / Double XP / Bewitched+Double XP) and stamina (Green / Orange) selectors
  - Boost XP toggle — adds a flat +0.75 or +0.50 after `event × stamina` (not multiplied by event)
  - Active multiplier shown as a highlighted % badge, updates live as you change any selector
  - Editable benchmark XP/h (defaults to 7.2kk — Roshamuul West)
  - Simplified result per card: effective XP/h with task, task duration, net vs benchmark
  - Mobile-friendly: sidebar collapses to a top icon bar, cards stack in a single column

- **Stash Inventory Manager**: Track your in-game stash with rich pricing signals
  - Import items from server log text (paste Retrieved log lines)
  - Flat sortable table — click any column header to sort
  - Per-item pricing signals: NPC buy price, server market buy/sell, global avg buy/sell (all/Optional PvP/Optional PvP+Green BattlEye), top-server reference, vs Global %, data age
  - **Liquidity Score (0–100)**: composite of market breadth, depth, and data freshness
  - Summary cards: stash value (buy/sell), global avg buy/sell totals, top-server buy total
  - Filters: search, category, server, price filter scope, liquidity threshold, weekly-delivery-only toggle
  - Ambiguous and unmatched item names reported after import

- **Exporteitor** *(under rework — temporarily unavailable)*: Export opportunity analyzer for Optional PvP servers; being redesigned from scratch on the `feature/rework` branch

- **Weekly Delivery Panel**: Delivery-item lookup and sell/keep decision helper
  - Imports the full delivery pool from TibiaPal into a separate table
  - Shows NPC price, imported demand label, local server price, and global average price
  - Helps decide whether to sell to NPC, list on the market, or export

- **Global Market Dashboard**: Real-time market statistics for key Tibia items
  - Average buy/sell prices across all servers
  - Server coverage and offer counts
  - Price ranges and spread calculations
  - Key items: Tibia Coins, Gold Token, Silver Token

- **Server Browser**: Browse and filter Tibia game servers with detailed information

- **Advanced Filtering**: Filter servers by name, region, PvP type, BattlEye status, and notes

- **Real-time Data**: Data fetched from SQLite database via Flask API

- **Modern UI**: Responsive design with TailwindCSS and Lucide icons

## Tech Stack

### Backend

- **Python 3.x**
- **Flask**: REST API server
- **Flask-CORS**: Cross-origin resource sharing
- **Pydantic**: Data validation and serialization
- **python-dotenv**: Environment variable management
- **SQLite**: Data storage

### Frontend

- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **TailwindCSS**: Styling
- **Lucide React**: Icons
- **PropTypes**: Runtime type validation
- **@tanstack/react-virtual**: Virtual scrolling for large lists

## Project Structure

```text
tibia-data-vault/
├── backend/                # Python backend package
│   ├── __init__.py
│   ├── api.py              # App setup, error handlers, blueprint registration (~100 lines)
│   ├── config.py           # Centralized configuration with env var support
│   ├── db.py               # Database connection management
│   ├── models.py           # Pydantic data models
│   ├── routes/             # Flask Blueprints — one file per endpoint domain
│   │   ├── health.py       # GET /api/health
│   │   ├── servers.py      # GET /api/servers, /api/servers/<id>
│   │   ├── items.py        # GET /api/items, /api/items/<id>
│   │   ├── market.py       # GET /api/market/*
│   │   ├── delivery.py     # GET /api/delivery/items
│   │   ├── export.py       # GET /api/export/opportunities
│   │   └── inventory.py    # GET|POST /api/inventory/*, GET /api/export/stash-plan
├── scripts/                # CLI entry points
│   ├── fetch_market.py     # Market data fetcher from tibiamarket.top
│   ├── import_weekly_delivery_items.py  # TibiaPal delivery pool importer
│   ├── migrate.py          # Database migration tool (core tables)
│   └── migrate_inventory.py  # Migration for stash_inventory, stash_log_imports, market_summary
├── services/               # Business logic services (future expansion)
│   └── __init__.py
├── tests/                  # Test files and sample data
├── api.py                  # Backward compatibility wrapper
├── run.py                  # Orchestrator to start both API and frontend
├── generate_item_prices.py # Generates output_cache.json with custom item prices for the Tibia client
├── output_cache.json       # Generated output — copy to Tibia character settings folder
├── item_metadata.json      # Local cache of item metadata fetched from tibiamarket.top API
├── tibia_data.db           # SQLite database
├── .env                    # Environment configuration
├── requirements.txt        # Python dependencies
├── index.html              # HTML entry point
├── package.json            # Node.js dependencies
├── src/                    # React frontend source
│   ├── pages/              # Page-level components (lean composition only)
│   │   ├── Dashboard.jsx
│   │   ├── Servers.jsx
│   │   ├── Inventory.jsx
│   │   ├── WeeklyDelivery.jsx
│   │   └── BountyCalculator.jsx  # Standalone, no backend dependency
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Generic components (LoadingSpinner, ErrorMessage, etc.)
│   │   ├── dashboard/      # Dashboard-specific components
│   │   ├── servers/        # Server browser components
│   │   ├── inventory/      # Inventory-specific components
│   │   │   ├── InventoryFilters.jsx
│   │   │   ├── InventoryTable.jsx  # Virtual scrolling, React.memo
│   │   │   └── ImportModal.jsx
│   │   ├── delivery/       # Weekly delivery components
│   │   │   ├── DeliveryFilters.jsx  # React.memo
│   │   │   └── DeliveryTable.jsx   # React.memo
│   │   └── layout/         # Layout components (Sidebar, ErrorBoundary)
│   ├── hooks/              # Custom React hooks
│   │   ├── useServers.js
│   │   ├── useMarketData.js    # 300ms debounced fetching
│   │   ├── useInventory.js     # Inventory data + import logic
│   │   ├── useInventoryTable.js  # Client-side inventory table state + derived data
│   │   ├── useExportOpportunities.js
│   │   ├── useFilters.js
│   │   └── useWeeklyDeliveryItems.js
│   │   # note: useStashExportPlan.js archived with Exporteitor rework
│   ├── contexts/           # Shared React context providers
│   │   └── ServersContext.jsx  # Single shared /api/servers fetch
│   ├── utils/              # Utility functions
│   │   ├── formatters.js   # Shared pure helpers + cached NUMBER_FMT
│   │   └── inventory.js    # Liquidity scoring, field mapping, filtering, sorting, totals
│   ├── constants/          # Application constants
│   │   ├── api.js
│   │   ├── filters.js
│   │   └── items.js
│   ├── App.jsx             # Lazy page mounting + ServersProvider
│   ├── main.jsx
│   └── index.css
├── .venv/                  # Python virtual environment
└── node_modules/           # Node.js dependencies
```

## Installation

### Prerequisites

- Python 3.x
- Node.js (v18 or higher)
- pnpm (install with `npm install -g pnpm`)

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd tibia-data-vault
   ```

2. **Set up Python virtual environment**

   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Unix/Linux/MacOS
   source .venv/bin/activate
   ```

3. **Install Python dependencies**

   ```bash
   pip install -r requirements.txt
   ```

   Or manually:

   ```bash
   pip install flask flask-cors pydantic requests python-dotenv
   ```

4. **Install Node.js dependencies**

   ```bash
   pnpm install
   ```

## Usage

### Starting the Application

Run the startup script to start both the API and frontend:

```bash
python run.py
```

This will:

- Start the Flask API on `http://localhost:5000` (or `TIBIA_API_PORT` from `.env`)
- Start the React frontend on `http://localhost:3000`

### Fetching Market Data

Use `scripts/fetch_market.py` to pull market data from the [tibiamarket.top API](https://api.tibiamarket.top) into the local database.

```bash
# Fetch specific servers
python -m scripts.fetch_market --name Antica Secura

# Import the weekly delivery pool from TibiaPal
python -m scripts.import_weekly_delivery_items

# Set up inventory tables (required before using Inventory Manager)
python -m scripts.migrate_inventory

# Fetch by region
python -m scripts.fetch_market --region EU

# Fetch by PvP type
python -m scripts.fetch_market --pvp "Open PvP"

# Fetch by BattlEye status
python -m scripts.fetch_market --battleye Green

# Fetch all servers
python -m scripts.fetch_market --all

# Preview without writing
python -m scripts.fetch_market --region SA --dry-run

# Force re-fetch even if timestamps match
python -m scripts.fetch_market --name Antica --force

# Enable verbose logging
python -m scripts.fetch_market --all --verbose
```

The script checks the API's `world_data` endpoint first and **skips servers whose data hasn't changed** since the last fetch, comparing against `servers.api_last_update` in the DB.

New item IDs returned by the API are automatically fetched from `/item_metadata` and inserted into the `items` table. A local `item_metadata.json` cache at the project root is checked first to reduce API calls.

### Generating Item Prices for the Tibia Client

`generate_item_prices.py` reads your weekly delivery item list, cross-references global market data, and generates `output_cache.json` — a file you manually copy into your Tibia character settings folder to set custom item prices.

```bash
python generate_item_prices.py
```

The script will ask:

1. **Server type** — which market averages to use (Global / Optional PvP / Optional PvP Green BattlEye)
2. **Confidence threshold** (0.0–1.0, default 0.3) — how strict to be about data quality; higher = fewer items but more accurate

Items are excluded if their market price doesn't beat the NPC buy price, or if their confidence score is too low. Output is written to `output_cache.json`.

### Manual Startup

Alternatively, start services separately:

**Terminal 1 - API:**

```bash
# Option 1: Direct module execution (recommended)
python -m backend.api

# Option 2: Backward compatible wrapper
python api.py
```

**Terminal 2 - Frontend:**

```bash
pnpm dev
```

### Environment Configuration

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Available environment variables:

- `TIBIA_DB_PATH` — Database file path (default: `./tibia_data.db`)
- `TIBIA_API_HOST` — API bind host (default: `0.0.0.0`)
- `TIBIA_API_PORT` — API port (default: `5000`)
- `TIBIA_API_DEBUG` — Flask debug mode (default: `false`)
- `TIBIA_MARKET_API_URL` — External API base URL
- `TIBIA_REQUEST_TIMEOUT` — API request timeout in seconds
- `TIBIA_REQUEST_DELAY` — Delay between per-server requests
- `TIBIA_LOG_LEVEL` — Logging level (DEBUG, INFO, WARNING, ERROR)

## API Endpoints

### Health & Status

#### GET /api/health

Health check endpoint with database connectivity status.

**Response:**

```json
{
  "success": true,
  "data": {
    "database": {
      "connected": true,
      "tables": ["items", "servers", "market_current", "market_history"],
      "record_counts": {
        "servers": 100,
        "items": 2500
      }
    }
  },
  "message": "Service is healthy"
}
```

### Servers

#### GET /api/servers

Returns all servers with optional filtering.

**Query Parameters:**

- `region` — Filter by region (EU, NA, SA, OCE)
- `pvp_type` — Filter by PvP type
- `battleye` — Filter by BattlEye status (Green, Yellow)

**Response:**

```json
{
  "success": true,
  "data": {
    "servers": [
      {
        "id": 1,
        "name": "Antica",
        "region": "EU",
        "pvp_type": "Open PvP",
        "battleye": "protected",
        "notes": "Oldest server",
        "release_date": "1997-01-07",
        "market_last_fetch": 1234567890,
        "api_last_update": "2024-01-01T00:00:00"
      }
    ]
  },
  "count": 1
}
```

#### GET /api/servers/:id

Returns a specific server by ID.

### Items

#### GET /api/items

Returns all items with optional filtering and pagination.

**Query Parameters:**

- `category` — Filter by item category
- `tier` — Filter by item tier
- `search` — Search by name (partial match)
- `limit` — Maximum records (default: 100)
- `offset` — Pagination offset (default: 0)

#### GET /api/items/:id

Returns a specific item by ID.

### Market Data

#### GET /api/market/current

Returns current market data with optional filtering.

**Query Parameters:**

- `server_id` — Filter by server ID
- `item_id` — Filter by item ID
- `limit` — Maximum records (default: 1000)

#### GET /api/market/history

Returns historical market data.

**Query Parameters:**

- `server_id` — Filter by server ID
- `item_id` — Filter by item ID
- `limit` — Maximum records (default: 1000)

#### GET /api/market/stats

Returns market statistics summary including:

- Total current/history record counts
- Server coverage (items per server)
- Last update timestamps per server

#### GET /api/market/global-key-items

Returns aggregated global market data for key items (Tibia Coins, Gold Token, Silver Token).

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "item_id": 1,
        "item_name": "Tibia Coins",
        "server_count": 95,
        "avg_buy": 42500,
        "avg_sell": 43000,
        "min_buy": 40000,
        "max_buy": 45000,
        "total_buy_offers": 15000,
        "total_sell_offers": 12000
      }
    ],
    "total_servers": 100,
    "last_updated": "2026-05-26T19:00:00"
  }
}
```

### Inventory

#### GET /api/inventory

Returns stash inventory with full pricing signals.

**Query Parameters:**

- `search` — Partial item name match
- `category` — Filter by item category
- `server_id` — Server ID for live market prices
- `weekly_only` — `1` to show only active weekly delivery items
- `price_filter` — `all` | `opt_pvp` | `opt_pvp_green` (controls which precomputed avg columns are returned; default `all`)

**Response fields per item:** `id`, `item_id`, `item_name`, `quantity`, `category`, `tier`, `best_npc_buy_price`, `best_npc_sell_price`, `market_buy_offer`, `market_sell_offer`, `server_buy_orders`, `server_sell_orders`, `price_age_hours`, `global_servers`, `active_servers`, `global_avg_buy`, `global_avg_sell`, `opt_pvp_avg_buy`, `opt_pvp_avg_sell`, `opt_pvp_green_avg_buy`, `opt_pvp_green_avg_sell`, `vs_global_pct`, `top_server_name`, `top_server_buy`, `top_server_sell`, `opt_pvp_top_server_name`, `opt_pvp_top_server_buy`, `opt_pvp_top_server_sell`, `opt_pvp_green_top_server_name`, `opt_pvp_green_top_server_buy`, `opt_pvp_green_top_server_sell`, `total_value`, `total_value_sell`

#### GET /api/inventory/categories

Returns distinct categories of items currently in the stash.

#### POST /api/inventory/import

Parses server log text and **replaces** quantities for matched items in `stash_inventory` (upsert by `item_id` — not additive).

**Request body:**

```json
{ "log_text": "19:00:00 Retrieved 3x Gold Coin.\n..." }
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items_imported": 17,
    "unmatched_names": ["Unknown Item"],
    "ambiguous_names": ["Cookbook"]
  },
  "message": "Imported 17 items, 1 unmatched, 1 ambiguous (best guess used)"
}
```

### Export Opportunities

#### GET /api/export/opportunities

Returns export opportunities from a source server to Optional PvP servers.

**Query Parameters:**

- `source_server_id` — Source server ID (required)
- `item_name` — Filter by item name (optional, partial match)

**Response:**

```json
{
  "success": true,
  "data": {
    "source_server_id": 7,
    "source_server_name": "Bravoria",
    "opportunities": [
      {
        "item_id": 123,
        "item_name": "Prismatic Ring",
        "item_category": "Rings",
        "source_price": 199975,
        "source_buy_offers": 5,
        "source_sell_offers": 3,
        "avg_sell_price": 169693.23,
        "avg_buy_price": 129895.00,
        "profit_sell_pct": -15.14,
        "profit_buy_pct": -35.04,
        "total_activity": 1388,
        "target_server_count": 22,
        "target_servers": [
          {
            "server_id": 2,
            "server_name": "Antica",
            "sell_price": 165000,
            "buy_price": 125000,
            "buy_offers": 30,
            "sell_offers": 25
          }
        ]
      }
    ]
  },
  "count": 1394
}
```

**Notes:**

- Only returns items with positive profit margins on listing (sell_price)
- Excludes blocked servers (servers.notes = 'blocked')
- Only considers Optional PvP servers as targets
- Source server is excluded from target list
- Calculates both listing profit (avg_sell_price) and instant sell profit (avg_buy_price)

## Database Schema

### Tables

#### `servers`

- `id`: Primary key
- `name`: Server name (NOT NULL, UNIQUE)
- `region`: Geographic region (NOT NULL)
- `pvp_type`: PvP type (NOT NULL)
- `battleye`: BattlEye protection status
- `notes`: Additional notes
- `release_date`: Server release date
- `market_last_fetch`: Unix timestamp of last market data fetch
- `api_last_update`: ISO timestamp of last API update

#### `items`

- `id`: Primary key
- `name`: Item name (NOT NULL)
- `category`: Item category (NOT NULL)
- `tier`: Item tier with CHECK (tier >= 0)
- `wiki_name`: Wiki reference name
- `best_npc_sell_price`: Best NPC sell price with CHECK (>= 0)
- `best_npc_sell_npcs`: JSON array of NPCs
- `best_npc_buy_price`: Best NPC buy price with CHECK (>= 0)
- `best_npc_buy_npcs`: JSON array of NPCs

#### `market_current`

- `item_id`: Foreign key to items (NOT NULL)
- `server_id`: Foreign key to servers (NOT NULL)
- `time`: Timestamp (NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- `buy_offer`: Buy price (NOT NULL, DEFAULT 0, CHECK >= 0)
- `sell_offer`: Sell price (NOT NULL, DEFAULT 0, CHECK >= 0)
- `buy_offers`: Number of buy offers (NOT NULL, DEFAULT 0, CHECK >= 0)
- `sell_offers`: Number of sell offers (NOT NULL, DEFAULT 0, CHECK >= 0)
- Primary key: (item_id, server_id)
- Foreign keys with ON DELETE CASCADE

#### `market_history`

- Same columns as `market_current` plus `id` (auto-increment)
- Records historical snapshots
- Foreign keys with ON DELETE CASCADE

#### `stash_inventory`

Created by `scripts/migrate_inventory.py`.

- `id`: Primary key (auto-increment)
- `item_id`: FK to `items` (ON DELETE SET NULL)
- `item_name`: TEXT NOT NULL COLLATE NOCASE — denormalized item name
- `quantity`: INTEGER DEFAULT 0 CHECK >= 0
- `last_import_id`: FK to `stash_log_imports` (ON DELETE SET NULL)
- `updated_at`: DATETIME DEFAULT now
- Unique index on `item_name COLLATE NOCASE`

#### `stash_log_imports`

Created by `scripts/migrate_inventory.py`. Audit log of raw import pastes (stored but not currently queried by the API).

- `id`: Primary key (auto-increment)
- `raw_text`: TEXT NOT NULL — full pasted log
- `imported_at`: DATETIME DEFAULT now
- `lines_parsed`: INTEGER DEFAULT 0
- `items_found`: INTEGER DEFAULT 0
- `notes`: TEXT (optional)

#### `market_summary`

Precomputed per-item global market aggregates, rebuilt by `scripts/fetch_market.py` after each server fetch via `INSERT OR REPLACE`. **Must be pre-created before first use** — run `scripts/migrate_inventory.py`.

All averages are **activity-weighted** (`SUM(price × activity) / SUM(activity)`, where activity = `buy_offers + sell_offers`).

- `item_id`: Primary key (FK to `items`)
- `global_servers`: Total servers carrying this item
- `active_servers`: Servers with `buy_offers + sell_offers > 0`
- `top_server_id / top_server_buy / top_server_sell / top_activity`: Most active server globally (ties broken by MIN server_id)
- `global_avg_buy / global_avg_sell`: Activity-weighted averages, all servers
- `opt_pvp_avg_buy / opt_pvp_avg_sell`: Activity-weighted averages, Optional PvP servers only
- `opt_pvp_green_avg_buy / opt_pvp_green_avg_sell`: Activity-weighted averages, Optional PvP + Green BattlEye
- `opt_pvp_top_server_id / _buy / _sell`: Most active Optional PvP server per item
- `opt_pvp_green_top_server_id / _buy / _sell`: Most active Optional PvP + Green BattlEye server per item
- `updated_at`: Last rebuild timestamp

#### `weekly_delivery_items`

- `item_id`: Primary key (FK to `items`)
- `is_active`: Whether item is currently in the delivery pool
- `source_order`: Position in source delivery list
- `source_market_value`: Market value label from TibiaPal
- `notes`: Free-text notes
- `added_at / updated_at`: Timestamps

### Indexes

- `idx_market_history_item_time` — For item price history queries
- `idx_market_history_server_time` — For server-specific history
- `idx_market_history_item_server_time` — For combined filtering
- `idx_market_current_server` — For server market overview
- `idx_items_category` — For category filtering
- `idx_items_tier` — For tier filtering
- `idx_servers_region` — For region filtering

## Frontend Architecture

The frontend follows React best practices with a modular, component-based architecture.

### Design Principles

**Separation of Concerns:**

- **Pages** (`src/pages/`) - High-level route components
- **Components** (`src/components/`) - Reusable UI building blocks organized by feature
- **Hooks** (`src/hooks/`) - Custom hooks for data fetching and state management
- **Utils** (`src/utils/`) - Pure utility functions (formatters, helpers)
- **Constants** (`src/constants/`) - Centralized configuration and static data

### Key Features

**Custom Hooks:**

- `useServers()` - Fetches server data with loading/error states
- `useServersContext()` - Consumes shared server data from `ServersContext` (no extra fetch)
- `useMarketData()` - Fetches market data with 300ms debounce on filter changes
- `useInventory()` - Inventory data fetching, categories, and import logic
- `useFilters(items)` - Manages filter state with memoized filtering logic
- `useWeeklyDeliveryItems()` - Fetches weekly delivery items with local and global pricing

**Context Providers:**

- `ServersContext` / `ServersProvider` — Fetches `/api/servers` once at app level; all pages consume the same data without re-fetching

**Reusable Components:**

- **Common**: `LoadingSpinner`, `ErrorMessage`, `FilterInput`, `FilterSelect`
- **Dashboard**: `MarketItemCard`, `QuickActionCard`
- **Servers**: `ServerFilters`, `ServerTable`
- **Inventory**: `InventoryFilters`, `InventoryTable`, `ImportModal`
- **Delivery**: `DeliveryFilters`, `DeliveryTable`
- **Layout**: `Sidebar`, `ErrorBoundary`

**Performance Optimizations:**

- `React.memo` - `InventoryTable`, `DeliveryTable`, `DeliveryFilters` skip re-renders when props are unchanged
- `useMemo` - Memoizes expensive computations (filtering, field name derivations, calculations)
- `useCallback` - Stabilizes function references to prevent child re-renders
- **Virtual scrolling** (`@tanstack/react-virtual`) - Inventory table renders only visible rows (~15–20) regardless of total item count
- **Lazy page mounting** - Pages are only mounted on first visit; not all rendered upfront
- **Cached formatters** - `Intl.NumberFormat` instance created once per module, reused on every render

**Type Safety & Error Handling:**

- PropTypes validation on all components
- ErrorBoundary catches React errors and prevents crashes
- Graceful error states in all data-fetching hooks

## Development

### Building for Production

```bash
pnpm build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
pnpm preview
```

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
