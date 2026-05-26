# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-05-26

### Added
- **Exporteitor Feature** — Advanced export opportunity analyzer for Optional PvP servers
  - **Browse Mode** — Discover and analyze profitable export opportunities
    - View all profitable items to export from source server to Optional PvP targets
    - Filter by item name (client-side, instant search), category, minimum profit %, minimum activity, and minimum server count
    - Sort by profit % (list/instant), activity, server count, price (low/high), or item name
    - Expandable rows showing detailed target server prices (sell/buy) and market activity
    - Only displays items with positive profit margins (losses excluded)
    - Real-time data freshness indicator with color-coded status (green/yellow/red)
  - **Export Plan Mode** — Automated export calculator with ROI analysis
    - Auto-selects optimal target server based on highest total profit potential
    - Calculates complete transfer economics with 750 Tibia Coins cost
    - Configurable Tibia Coins price (default: 35,000 gp)
    - Generates comprehensive shopping list sorted by profit per item
    - Displays summary metrics: total items, investment, gross profit, transfer cost, net profit, ROI %
    - Shows both listing profit (sell_offer) and instant sell profit (buy_offer) for each item
  - **Smart Server Filtering** — Only Optional PvP servers, excludes blocked servers
  - **Data Freshness Display** — Shows when market data was last scanned with tooltip
  - **Responsive UI** — Mobile-friendly design with collapsible filters
  - **Clear Filters Button** — Quick reset for all active filters
- **New API Endpoint** — `GET /api/export/opportunities`
  - Query parameters: `source_server_id` (required), `item_name` (optional)
  - Returns profitable export opportunities with detailed pricing and target server data
  - Calculates average sell/buy prices across Optional PvP servers
  - Computes profit margins for both listing and instant selling strategies
  - Excludes blocked servers and source server from target list
  - Sorted by total market activity (descending)
- **New React Components**
  - `src/pages/Exporteitor.jsx` — Main Exporteitor page with dual view modes
  - `src/hooks/useExportOpportunities.js` — Custom hook for fetching export data
- **Updated Navigation** — Added Exporteitor to sidebar with Package icon

### Changed
- **Client-Side Filtering** — Item name filter now works client-side for instant results (no API lag)
- **API Response Format** — Export opportunities include both `avg_sell_price` and `avg_buy_price`
- **Source Price Logic** — Uses `sell_offer` (what you pay to buy) instead of `buy_offer`

### Technical Details
- Transfer cost calculation: 750 TC × configurable TC price
- Profit calculation: `(target_price - source_price) / source_price × 100`
- Only processes items with `sell_offer > 0` on source server
- Target servers must have `sell_offer > 0` OR `buy_offer > 0`
- Color-coded profit indicators: Green (≥30%), Yellow (≥15%), Gray (≥0%), Red (<0%)
- Data age calculation: Shows minutes/hours/days since last API update

## [0.1.1] - 2026-05-26

### Added
- **Global Market Prices Dashboard** — New dashboard feature displaying global market statistics
  - Shows average buy/sell prices for key items (Tibia Coins, Gold Token, Silver Token)
  - Aggregates data across all servers with coverage statistics
  - Displays total offers, price ranges, and spread percentages
  - Added `GET /api/market/global-key-items` endpoint for aggregated market data

### Changed
- **Major Frontend Refactoring** — Complete reorganization following React best practices
  - Created organized folder structure:
    - `src/components/` — Reusable UI components (common, dashboard, servers, layout)
    - `src/pages/` — Page-level components (Dashboard, Servers)
    - `src/hooks/` — Custom React hooks (useServers, useMarketData, useFilters)
    - `src/utils/` — Utility functions (formatters)
    - `src/constants/` — Application constants (API config, filters, items)
  - Extracted 10 reusable components:
    - `LoadingSpinner`, `ErrorMessage`, `FilterInput`, `FilterSelect`
    - `ServerFilters`, `ServerTable`, `MarketItemCard`, `QuickActionCard`
    - `Sidebar` (moved to layout), `ErrorBoundary`
  - Created 3 custom hooks for data fetching and state management
  - Added PropTypes validation to all components
  - Implemented ErrorBoundary for crash prevention
  - Performance optimizations: React.memo, useMemo, useCallback
  - Reduced component sizes: Dashboard (193→56 lines), Servers (288→52 lines)
  - Centralized constants and utilities (API config, formatters, color mappings)
- **Major Backend Refactoring** — Complete reorganization for maintainability and best practices
  - Created `backend/` package with modular architecture
    - `config.py` — Centralized configuration with environment variable support via `python-dotenv`
    - `db.py` — Database connection management with context managers (`get_db()`)
    - `models.py` — Pydantic models for data validation (`Server`, `Item`, `MarketCurrent`, `MarketHistory`)
    - `api.py` — Flask API implementation moved from root
  - Moved CLI scripts to `scripts/` directory
    - `fetch_market.py` → `scripts/fetch_market.py`
    - `migrate_schema.py` → `scripts/migrate.py`
  - Created `services/` directory for future business logic extraction
  - Added `api.py` backward compatibility wrapper in root for existing workflows
- Database schema migration (`scripts/migrate.py`) for best practices:
  - **items table**: Added `NOT NULL` on `name`, `category`; `CHECK (>= 0)` on `tier`, `best_npc_sell_price`, `best_npc_buy_price`; cleaned `'[]'` values to `NULL` in NPC columns
  - **servers table**: Added `NOT NULL` on `name`, `region`, `pvp_type`; `UNIQUE` on `name`
  - **market_current table**: Added `NOT NULL` on all columns; `CHECK (>= 0)` on prices/counts; `DEFAULT 0`/`CURRENT_TIMESTAMP`; foreign keys with `ON DELETE CASCADE`
  - **market_history table**: Same constraints as `market_current`; foreign keys with `ON DELETE CASCADE`
  - Added comprehensive error handling with rollback and automatic backup restore on failure
- Enabled `PRAGMA foreign_keys = ON` globally for runtime FK enforcement
- Refactored `fetch_market.py` with production-ready improvements:
  - Context manager-based database connections (`with get_db() as conn`)
  - Comprehensive logging throughout with `--verbose` flag support
  - Transaction rollback on database errors with proper error handling
  - Centralized configuration via `backend.config`
- Refactored `run.py` orchestrator:
  - Fixed security issue: removed `shell=True` from subprocess calls
  - Added proper signal handling (`SIGINT`, `SIGTERM`, `SIGBREAK` on Windows)
  - Implemented graceful shutdown with `atexit` cleanup
  - Added `PYTHONPATH` configuration for module imports
  - Improved process termination (terminate → wait → kill if needed)

### Added
- **Environment Configuration** — `.env` file support with `python-dotenv`
  - `TIBIA_DB_PATH` — Database file location
  - `TIBIA_API_HOST` / `TIBIA_API_PORT` / `TIBIA_API_DEBUG` — API server settings
  - `TIBIA_MARKET_API_URL` — External API base URL
  - `TIBIA_REQUEST_TIMEOUT` / `TIBIA_REQUEST_DELAY` — Request timing controls
  - `TIBIA_LOG_LEVEL` — Logging verbosity (DEBUG, INFO, WARNING, ERROR)
- **New API Endpoints** — RESTful expansion
  - `GET /api/health` — Service health check with database connectivity status
  - `GET /api/servers/:id` — Single server lookup
  - `GET /api/items` — Items list with filtering (category, tier, search) and pagination
  - `GET /api/items/:id` — Single item lookup
  - `GET /api/market/current` — Current market data with server/item filtering
  - `GET /api/market/history` — Historical market data
  - `GET /api/market/stats` — Market statistics summary
- **Standardized API Response Format** — All endpoints return consistent structure:
  ```json
  {
    "success": true,
    "data": { ... },
    "count": 42,
    "message": "Optional message"
  }
  ```
- **Error Handling** — Comprehensive error handlers
  - 400 Bad Request with validation details
  - 404 Not Found for missing resources
  - 500 Database errors with sanitized messages
  - 503 Service Unhealthy when database is unreachable
- **Logging System** — Structured logging across all modules
  - Request logging middleware in API
  - Database operation logging
  - External API fetch logging with pagination details
  - Configurable via `TIBIA_LOG_LEVEL` environment variable
- **Database Context Managers** — `get_db()` context manager in `backend.db`
  - Automatic connection opening and closing
  - Foreign key enforcement enabled
  - `sqlite3.Row` factory for dict-like access
  - Exception handling with proper cleanup
- **`scripts/fetch_market.py`** — CLI tool to fetch market data from [tibiamarket.top API](https://api.tibiamarket.top)
  - Filter servers to scan by `--name`, `--region`, `--pvp`, `--battleye`, or `--all`
  - Checks `GET /world_data` first to retrieve the latest market scan timestamp per server
  - Skips servers whose `api_last_update` in the DB already matches the API timestamp (no new data)
  - Fetches `GET /market_values` with automatic pagination (`limit=5000`) for each stale server
  - Upserts `is_full_data=true` items into `market_current` (one current snapshot per item/server)
  - `market_history` insertion present but currently disabled (commented out)
  - Updates `servers.api_last_update` and `servers.market_last_fetch` (max item timestamp) after each successful fetch
  - `--force` flag bypasses timestamp check; `--dry-run` previews what would be fetched without writing
  - `--verbose` flag enables DEBUG level logging
  - 30-second delay between per-server requests to avoid rate limiting
- **Performance indexes** for optimized queries:
  - `idx_market_history_item_time` — `market_history(item_id, time)`
  - `idx_market_history_server_time` — `market_history(server_id, time)`
  - `idx_market_history_item_server_time` — `market_history(item_id, server_id, time)`
  - `idx_market_current_server` — `market_current(server_id)`
  - `idx_items_category` — `items(category)`
  - `idx_items_tier` — `items(tier)`
  - `idx_servers_region` — `servers(region)`
- **Dependencies** — Added to `requirements.txt`
  - `pydantic>=2.0.0` — Data validation
  - `python-dotenv>=1.0.0` — Environment variable management
  - `pytest>=8.0.0`, `pytest-cov>=4.1.0` — Testing (optional)
  - `black>=24.0.0`, `flake8>=7.0.0`, `mypy>=1.8.0` — Linting (optional)
- **Frontend Dependencies** — Added to `package.json`
  - `prop-types` — Runtime type checking for React components

## [0.1.0] - 2026-05-26

### Added
- Initial release of Tibia Data Vault
- Server browser with filtering capabilities
  - Filter by name, region, PvP type, BattlEye status, and notes
- Dashboard with feature overview
- Flask API with SQLite backend
  - GET /api/servers endpoint
- React frontend with Vite and TailwindCSS
- Responsive sidebar navigation
- Real-time data fetching from database
