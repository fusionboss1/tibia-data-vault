# Tibia Data Vault

A web application for browsing and managing Tibia game server data.

## Version

Current version: 0.2.0

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.

## Features

- **Exporteitor**: Advanced export opportunity analyzer for Optional PvP servers
  - **Browse Mode**: Discover profitable items to export between servers
    - Filter by item name, category, minimum profit %, activity, and server count
    - Sort by profit (list/instant), activity, server count, price, or name
    - View detailed target server prices and market activity
    - Real-time data freshness indicator
  - **Export Plan Mode**: Automated export calculator
    - Auto-selects best target server based on total profit potential
    - Calculates ROI with transfer costs (750 Tibia Coins)
    - Generates complete shopping list with profit analysis
    - Shows gross profit, transfer cost, and net profit
  - Only shows profitable opportunities (positive profit margins)
  - Excludes blocked servers from all calculations
  - Client-side filtering for instant search results
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

## Project Structure

```
tibia-data-vault/
├── backend/                # Python backend package
│   ├── __init__.py
│   ├── api.py              # Flask API server (main implementation)
│   ├── config.py           # Centralized configuration with env var support
│   ├── db.py               # Database connection management
│   ├── models.py           # Pydantic data models
├── scripts/                # CLI entry points
│   ├── fetch_market.py     # Market data fetcher from tibiamarket.top
│   └── migrate.py          # Database migration tool
├── services/               # Business logic services (future expansion)
│   └── __init__.py
├── tests/                  # Test files and sample data
├── api.py                  # Backward compatibility wrapper
├── run.py                  # Orchestrator to start both API and frontend
├── tibia_data.db           # SQLite database
├── .env                    # Environment configuration
├── requirements.txt        # Python dependencies
├── index.html              # HTML entry point
├── package.json            # Node.js dependencies
├── src/                    # React frontend source
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Generic components (LoadingSpinner, ErrorMessage, etc.)
│   │   ├── dashboard/      # Dashboard-specific components
│   │   ├── servers/        # Server browser components
│   │   ├── layout/         # Layout components (Sidebar)
│   │   └── ErrorBoundary.jsx
│   ├── pages/              # Page-level components
│   │   ├── Dashboard.jsx
│   │   ├── Servers.jsx
│   │   └── Exporteitor.jsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useServers.js
│   │   ├── useMarketData.js
│   │   ├── useExportOpportunities.js
│   │   └── useFilters.js
│   ├── utils/              # Utility functions
│   │   └── formatters.js
│   ├── constants/          # Application constants
│   │   ├── api.js
│   │   ├── filters.js
│   │   └── items.js
│   ├── App.jsx
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
python scripts/fetch_market.py --name Antica Secura

# Fetch by region
python scripts/fetch_market.py --region EU

# Fetch by PvP type
python scripts/fetch_market.py --pvp "Open PvP"

# Fetch by BattlEye status
python scripts/fetch_market.py --battleye Green

# Fetch all servers
python scripts/fetch_market.py --all

# Preview without writing
python scripts/fetch_market.py --region SA --dry-run

# Force re-fetch even if timestamps match
python scripts/fetch_market.py --name Antica --force

# Enable verbose logging
python scripts/fetch_market.py --all --verbose
```

The script checks the API's `world_data` endpoint first and **skips servers whose data hasn't changed** since the last fetch, comparing against `servers.api_last_update` in the DB.

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
- `useMarketData()` - Fetches market data with loading/error states
- `useFilters(items)` - Manages filter state with memoized filtering logic

**Reusable Components:**
- **Common**: `LoadingSpinner`, `ErrorMessage`, `FilterInput`, `FilterSelect`
- **Dashboard**: `MarketItemCard`, `QuickActionCard`
- **Servers**: `ServerFilters`, `ServerTable`
- **Layout**: `Sidebar`, `ErrorBoundary`

**Performance Optimizations:**
- `React.memo` - Prevents unnecessary re-renders of pure components
- `useMemo` - Memoizes expensive computations (filtering, calculations)
- `useCallback` - Stabilizes function references to prevent re-renders

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
