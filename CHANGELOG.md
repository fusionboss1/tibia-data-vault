# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed — Market Browser Request State

- Prevented aborted or superseded market requests from incorrectly clearing the latest loading state or replacing current errors and results
- Cleared dependent market detail data when a new item, server, search, category, or sort request begins
- Hid stale market rows while updated detail data is loading or has failed

### Fixed — Weekly Delivery NPC Price Column

- **`src/components/market/MarketItemList.jsx`** — corrected the Weekly Delivery mode column label to "NPC Buy" (was mislabeled "NPC Sell" while showing `best_npc_buy_price`)
- **`backend/routes/market.py`** — `browse_market`'s `ALLOWED_SORT` now accepts `best_npc_buy_price` (was `best_npc_sell_price`), so sorting by that column actually applies instead of silently falling back to `top_activity`

### Changed — Market Query Performance

- **`backend/routes/market.py`** — `get_item_servers` and `get_server_items` now compute the average Tibia Coin buy/sell price once per query via a shared `TC_PRICES_CTE` and join, instead of re-running a correlated subquery for every output row

### Fixed — Market Data Fetch Truncation

- **`scripts/fetch_market.py`** — raised `fetch_market_values` `page_size` from 5000 to 10000 after confirming live worlds (e.g. Antica, 5041 items) already exceeded the old cap, causing silent data truncation; added a warning log if the page size is ever hit again
- Removed the now-unused `REQUEST_DELAY` import left over from a prior change

## [0.7.0] - 2026-06-27

### Added — Market Browser (`src/pages/MarketBrowser.jsx`)

New page accessible from the sidebar (TrendingUp icon) with two modes switchable via a toggle.

#### Global Mode

- Browses all items across all servers with filtering, sorting, and pagination
- Left panel: sortable paginated item list with search, category dropdown, PvP type buttons, BattlEye buttons, and "Exclude blocked" checkbox
- Right panel: per-server price breakdown for the selected item, with stat cards reflecting active filters
- **Backend** (`backend/routes/market.py`): new `GET /api/market/browse` endpoint; new `GET /api/market/categories` endpoint returning distinct item categories
- **Hook** (`src/hooks/useMarketBrowser.js`): manages search debounce, pagination, sort state, item selection, per-item server data fetch, and `filteredStats` derived from active server filters
- **Components**: `MarketItemList.jsx` (paginated sortable item list), `MarketItemDetail.jsx` (stat cards + per-server price table)

#### Server Mode

- Browse all items with active offers on a specific server
- Left panel (server list): search, PvP type buttons, BattlEye buttons, "Exclude blocked" checkbox, "My server" picker, "Only compatible servers" toggle
- Right panel (item list): item search, category dropdown, sortable table with Buy / Sell / Global Sell / Offers columns; Sell price highlights green when it is cheaper than the global average
- **Transfer compatibility filter**: when a home server is selected, "Only compatible servers" hides servers incompatible for transfer in either direction — rules based on PvP type order and BattlEye (Yellow cannot transfer to Green)
- **Backend**: new `GET /api/market/server-items` endpoint — returns items with active offers on a server, supports `search`, `category`, `sort_by`, `sort_dir`; includes `global_avg_sell` from `market_summary`
- **Hook** (`src/hooks/useServerBrowser.js`): `PVP_ORDER`, `canTransfer`, and `isTransferCompatible` defined at module scope for stability; manages server list, compatibility filtering, item list fetch, category, `excludeBlocked`, `myServer`, `onlyCompatible`
- **Components**: `MarketServerList.jsx`, `MarketServerDetail.jsx`
- Order book panel is a placeholder for future `tibiamarket.top` integration — no external API calls made

### Added — `useDebounce` Hook (`src/hooks/useDebounce.js`)

- Shared hook replacing copy-pasted `setTimeout` debounce patterns in all four data hooks
- Exports `DEBOUNCE_MS` as a single constant — change one number to adjust debounce timing app-wide
- Removed inline `useRef` + `setTimeout` blocks from `useMarketBrowser`, `useServerBrowser`, `useMarketData`, and `useStashExportPlan`

### Added — New API Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/market/browse` | Paginated item list with optional server filters and global averages |
| `GET /api/market/categories` | Distinct item categories present in the market |
| `GET /api/market/server-items` | All items with active offers on a specific server |

### Fixed

- `GET /api/market/categories` — excluded `NULL` categories from the response; items with no category no longer produce a blank dropdown entry
- `GET /api/market/browse` — count query now runs before `ORDER BY` is appended, avoiding unnecessary sort work on the count pass
- `MarketServerDetail` — "cheaper than global" green highlight now appears on the **Sell** column (the local price) instead of the Global Sell column
- `useServerBrowser` — eliminated a double network request when switching servers while a search was active; the fetch now waits for the debounce to settle before firing

### Changed — `GET /api/market/item-servers`

- Now accepts `pvp_type`, `battleye`, `exclude_blocked`, and `region` query params instead of hardcoding Optional PvP

## [0.6.0] - 2026-06-26

*Branch: `feature/bounty-calculator` — deployed to `https://tibia-bounty-calc.netlify.app` for beta testing.*

### Added — Bounty Calculator (`src/pages/BountyCalculator.jsx`)

New standalone page — no backend required, runs entirely in the browser.

#### Core logic

- 3-card layout, one card per task option the game offers on a reroll
- Inputs per card: creature name (optional), spot XP/h in kk, kill rate (kills/hour), kills required (300–600), tier (Bronze / Silver / Gold)
- Verdict formula: `effPerHour = (spotXP × T + taskReward) / T` — spreads the task bonus over the session time for a fair comparison regardless of session length
- Cards react instantly as soon as filled — no need to fill all 3
- Among filled cards, the one with the highest `effPerHour` is chosen as the best candidate
- **TAKE IT** shown on the best card only if it beats the benchmark effective XP/h
- **SKIP** shown on all filled cards if none of them beat the benchmark
- Simplified result section per card: effective XP/h with task, task duration (minutes), net XP vs benchmark (+/- in kk)

#### Multiplier settings

- Event selector: No event (×1), Bewitched (×1.5), Double XP (×2), Bewitched + Double XP (×3)
- Stamina selector: Green (×1.5), Orange (×1)
- Boost XP toggle: adds a flat +0.75 (green) or +0.50 (orange) after `event × stamina` — not multiplied by the event
- Final formula: `multiplier = event × stamina + boostBonus`
- Prominent amber badge shows the active combined multiplier as a percentage (e.g. 375%)
- Editable benchmark XP/h (defaults to 7.2kk — Roshamuul West); shows effective benchmark rate after multipliers

#### UX & layout

- Inline field guidance: every label has a short hint, placeholders explain what to enter, tier buttons show their XP reward range directly below them
- Short friendly hint above the cards explains TAKE IT / SKIP in plain language — no separate instructions card
- Mobile: sidebar collapses to a fixed top icon bar; cards stack in a single column; content gets top padding to clear the bar
- Desktop (≥768px): 3-column card grid; sidebar remains on the left; all settings visible without scrolling

### Added — Netlify Deployment (`netlify.toml`)

- New `netlify.toml` at project root: build command `pnpm run build`, publish dir `dist`, SPA redirect rule (`/* → /index.html`)
- Live URL: `https://tibia-bounty-calc.netlify.app` — auto-deploys on push to `feature/bounty-calculator`
- `VITE_API_URL=http://0.0.0.0` set in Netlify environment to disable the localhost fallback in `src/constants/api.js` and prevent Android local network permission prompts

### Changed — Beta Branch Isolation (`src/App.jsx`, `src/constants/features.js`)

- All features except `BOUNTY_CALCULATOR` disabled (`DASHBOARD`, `SERVERS`, `WEEKLY_DELIVERY`, `INVENTORY` all `false`)
- All disabled page imports removed from `App.jsx` — bundle contains only Bounty Calculator code; eliminates all backend API calls
- Default page set to `bounty`

### Fixed — Verdict Logic

- **Multiple TAKE IT verdicts**: lifted result state to parent; parent selects single best, passes verdict down per slot
- **Unfair comparison across different session lengths**: switched from `spotTotal` (raw XP accumulated) to `effPerHour` (XP per hour including task bonus)
- **All-skip never triggered**: fixed condition from `delta >= 0` to `effPerHour > metaEffPerHour`
- **Boost XP applied as multiplier instead of flat addition**: corrected formula from `(stamina + boost) × event` to `stamina × event + boost`

## [0.5.0] - 2026-06-23

*Branches merged: `feature/rework` → `master`. All changes below were developed on `feature/rework` and are now part of the main release.*

### Refactored — Inventory Page Simplification

- Stripped all derived/computed fields from the Inventory page — only raw data returned by the tibiamarket.top API is shown
- **Backend (`backend/routes/inventory.py`)** — removed all `market_summary` JOINs and derived columns (`global_avg_*`, `opt_pvp_*`, `top_server_*`, `active_servers`, `global_servers`, `top_activity`, `vs_global_pct`, `price_age_hours`, `total_value`, `total_value_sell`, `grand_total_value`)
- **Frontend** — reduced `InventoryTable` to 6 columns (Item, Qty, NPC Buy, NPC Sell, Mkt Buy, Mkt Sell); removed `priceFilter` and `minLiquidity` dropdowns from `InventoryFilters`; removed `fieldMap`, totals, and liquidity logic from `useInventoryTable` and `inventory.js`
- Table panel now fills viewport height dynamically (`calc(100vh - 220px)`) instead of a fixed `max-h`

### Fixed — Feature Flags Normalization

- All sidebar navigation items now consistently use the feature flags system
- Added `DASHBOARD` flag to `src/constants/features.js` (previously hardcoded)
- Added `feature` property to all `NAV_ITEMS` in `src/components/layout/Sidebar.jsx`:
  - Dashboard → `feature: 'DASHBOARD'`
  - Server Browser → `feature: 'SERVERS'`
  - Weekly Delivery → `feature: 'WEEKLY_DELIVERY'`
  - Stash Inventory → `feature: 'INVENTORY'` (already had this)
- Wrapped all route renders in `src/App.jsx` with `isFeatureEnabled()` checks
- Removed stale `EXPORTEITOR` flag from `FEATURES` object (feature already archived)
- Toggling any flag in `features.js` now properly hides/shows both the sidebar item and the route

### Fixed — Table Row Border Flash on Filter Change

- `transition-colors` on table rows was animating **border color** in addition to background, causing a brief white flash on row divider lines when filtering adds or removes rows
- Scoped to `transition-[background-color]` in all affected table components so only the hover background animates; borders snap instantly:
  - **`src/components/servers/ServerTable.jsx`** — triggered when clearing region filter back to "All regions"
  - **`src/components/inventory/InventoryTable.jsx`** — same issue on virtual rows; applied same fix

### Fixed — Table Column Width Shifting on Filter

- All tables used `table-layout: auto` (browser default), which recalculates column widths based on content every time the data changes — causing columns to "dance" when filtering
- Switched to `table-layout: fixed` with explicit `<colgroup>` widths on all three table components:
  - **`src/components/servers/ServerTable.jsx`** — 8 columns with fixed pixel widths
  - **`src/components/inventory/InventoryTable.jsx`** — 15 columns with fixed pixel widths; wide columns use `hidden xl:table-column` on `<col>` elements to avoid reserving space below the `xl` breakpoint; added `truncate` to item name and top server cells
  - **`src/components/delivery/DeliveryTable.jsx`** — 7 columns with fixed pixel widths; added `truncate` to item name cell
- Column widths now stay constant regardless of which rows are visible

### Added — Dashboard Market Card Filters

- **`src/pages/Dashboard.jsx`** — added a filter bar above the Tibia Coin / Gold Token / Silver Token cards with PvP type buttons (All / Open PvP / Optional PvP / Retro Open PvP / Retro Hardcore PvP), BattlEye buttons (All / Green / Yellow), and an "Exclude blocked" checkbox
- **`src/hooks/useMarketData.js`** — extended to accept `pvpType`, `battleye`, and `excludeBlocked` params; passes them as query strings to the API; re-fetches on filter change with 300ms debounce
- **`backend/routes/market.py`** — `/api/market/global-key-items` now accepts `pvp_type`, `battleye`, and `exclude_blocked` query params, filtering both the aggregated prices and the `total_servers` coverage count accordingly

### Added — Item Price Generator Script (`generate_item_prices.py`)

- New standalone script at project root that generates a `output_cache.json` file for use as custom item prices in the Tibia game client
- Reads active items from `weekly_delivery_items`, looks up averages in `market_summary`, discards items where the market price doesn't exceed NPC price
- Calculates a confidence score per item (0–1) based on active server count, transaction activity, and buy/sell spread; items below the threshold are skipped
- Interactive prompts: server type (Global / Optional PvP / Optional PvP Green BattlEye) and confidence threshold
- Outputs only `customSalePrices` — no `primaryLootValueSources` — so the game keeps NPC buy value as the default source and only overrides specific items with global market-based prices

### Fixed — Market Fetch: New Item IDs Not Inserted (`scripts/fetch_market.py`)

- When the market API returned data for item IDs not yet in the local `items` table, those items were silently skipped
- Added `ensure_items_exist()` function: on each fetch, it detects unknown item IDs, fetches their metadata from the API (`/item_metadata`), and inserts them into the `items` table before upserting market data
- Added `item_metadata.json` at project root as a local cache — the script loads from it first and only calls the API for IDs not found in the file
- Added `ITEM_METADATA_PATH` to `backend/config.py` and exported from `backend/__init__.py`

### Deprecated — Exporteitor (pending full rework)

- `src/pages/Exporteitor.jsx` and `src/hooks/useStashExportPlan.js` have been archived (moved to `.archive/`)
- The page is no longer reachable from the sidebar while under rework
- Backend endpoints `GET /api/export/stash-plan` and `GET /api/market/item-servers` (added in a prior session) remain in `backend/api.py` and will be re-evaluated when the new Exporteitor is built
- The rework will redesign the full feature from scratch on this same branch

### Refactored — Backend Modularization (`backend/api.py` → Flask Blueprints)

`backend/api.py` was 1423 lines with all endpoints in a single file. It was split into a `backend/routes/` package using Flask Blueprints — one module per domain.

| New file | Endpoints moved |
| --- | --- |
| `backend/routes/health.py` | `GET /api/health` |
| `backend/routes/servers.py` | `GET /api/servers`, `GET /api/servers/<id>` |
| `backend/routes/items.py` | `GET /api/items`, `GET /api/items/<id>` |
| `backend/routes/market.py` | `GET /api/market/current`, `/history`, `/stats`, `/global-key-items`, `/item-servers` |
| `backend/routes/delivery.py` | `GET /api/delivery/items` |
| `backend/routes/export.py` | `GET /api/export/opportunities` |
| `backend/routes/inventory.py` | `GET /api/inventory`, `GET /api/inventory/categories`, `POST /api/inventory/import`, `GET /api/export/stash-plan` |

`backend/api.py` now contains only app setup, error handlers, and blueprint registration (~100 lines). All endpoint URLs are unchanged — no frontend changes required.

### Refactored — Frontend Modularization

Large monolithic page files were broken into focused, single-purpose pieces.

#### `src/pages/Inventory.jsx` (~554 lines → ~100 lines)

- Extracted data-fetching and import logic into `src/hooks/useInventory.js`
- Extracted filter bar into `src/components/inventory/InventoryFilters.jsx`
- Extracted sortable table into `src/components/inventory/InventoryTable.jsx`
- Extracted import modal into `src/components/inventory/ImportModal.jsx`
- Page now only composes these pieces together

#### `src/pages/Inventory.jsx` — further modularization

- Extracted pure inventory helpers (`liquidityScore`, `liquidityColor`, `deriveMarketFields`, `filterInventoryItems`, `sortInventoryItems`, `calculateInventoryTotals`) to `src/utils/inventory.js`
- Extracted table state and derived data (search, liquidity filter, sort, filtered items, totals) into new `src/hooks/useInventoryTable.js`
- `InventoryTable` now imports `liquidityScore`/`liquidityColor` directly from utils instead of receiving them as props
- Component now only imports UI pieces and delegates all data logic to hooks

#### `src/pages/WeeklyDelivery.jsx` (~391 lines → ~97 lines)

- Extracted filter/stats bar into `src/components/delivery/DeliveryFilters.jsx`
- Extracted sortable table into `src/components/delivery/DeliveryTable.jsx`
- Moved all pure helper functions (`formatSignedPrice`, `getDeliveryMargin`, `getDeliverySuggestedAction`, `getSourceMarketValueColor`) to `src/utils/formatters.js`
- Page now only composes these pieces together

### Added — Performance Improvements

#### 1. Lazy Page Mounting (`src/App.jsx`)

- Pages are no longer all mounted on app load
- A page component is only created the first time the user navigates to it
- After that first visit it stays mounted but hidden, so switching back is instant
- Eliminates all API calls from unvisited pages on startup

#### 2. Shared Server Data (`src/contexts/ServersContext.jsx`) — new file

- Created `ServersContext` that calls `useServers()` exactly once
- Wrapped the entire app with `ServersProvider` in `App.jsx`
- `src/pages/Servers.jsx`, `src/pages/WeeklyDelivery.jsx`, `src/pages/Inventory.jsx` now consume `useServersContext()` instead of calling `useServers()` independently
- Removed internal server-fetching logic from `src/hooks/useInventory.js`
- Eliminates 2–3 redundant `/api/servers` calls that previously fired simultaneously on load

#### 3. Virtual Scrolling on Inventory Table (`src/components/inventory/InventoryTable.jsx`)

- Installed `@tanstack/react-virtual` (v3)
- The `<tbody>` now only renders the rows visible in the viewport (~15–20 at a time)
- Padding rows above and below maintain correct scroll position
- Sticky `<thead>` remains visible while scrolling
- Drastically reduces DOM size for inventories with hundreds of items

#### 4. Debounced Market Data Fetching (`src/hooks/useMarketData.js`)

- Added a 300ms debounce before the `/api/market/global-key-items` fetch fires
- Rapid filter changes on the Dashboard (e.g. clicking PvP type then BattlEye) now wait until the user stops clicking before sending a request
- Prevents one API call per button click when multiple filters are changed quickly

#### 5. `React.memo` on Table Components

- `src/components/inventory/InventoryTable.jsx` — wrapped with `React.memo`
- `src/components/delivery/DeliveryTable.jsx` — wrapped with `React.memo`
- `src/components/delivery/DeliveryFilters.jsx` — wrapped with `React.memo`
- Components now skip re-rendering when their props have not changed

#### 6. Memoized Field Name Derivations (`src/pages/Inventory.jsx`)

- The 5 dynamic field names (`avgBuyField`, `avgSellField`, `topServerNameField`, `topServerBuyField`, `topServerSellField`) that depend on `priceFilter` are now wrapped in a single `useMemo`
- Previously recomputed on every render, which cascaded into unnecessary re-filtering of the full item list

#### 7. Cached Number Formatter

- `new Intl.NumberFormat('en-US')` is now a module-level constant `NUMBER_FMT` in:
  - `src/components/inventory/InventoryTable.jsx`
  - `src/components/delivery/DeliveryTable.jsx`
  - `src/components/delivery/DeliveryFilters.jsx`
  - `src/utils/formatters.js` (shared by `formatNumber`, `formatPrice`, `formatSignedPrice`)
- Previously a new formatter object was created on every number rendered in every row

## [0.4.0] - 2026-05-27

### Added — Feature Flags System

- **Centralized feature configuration** (`src/constants/features.js`)
  - `FEATURES` object controls which features are visible in production
  - `isFeatureEnabled()` helper for conditional rendering
  - Currently disabled: `INVENTORY` (Stash Inventory still in development)
  - Released features: `SERVERS`, `EXPORTEITOR`, `WEEKLY_DELIVERY`
- **Conditional navigation** — Sidebar filters items based on feature flags
- **Conditional routing** — App.jsx only renders routes for enabled features

### Added — Weekly Delivery Feature

- **Weekly Delivery Panel** (`src/pages/WeeklyDelivery.jsx`) — Delivery-item lookup and sell/keep decision helper
  - Shows NPC price, imported demand label from TibiaPal, local server price, and global average price
  - Helps decide whether to sell to NPC, list on the market, or export
  - Server selector to compare prices across different worlds
  - Search filter for item names (client-side)
  - Sortable by source order or item name
- **Weekly Delivery Import Script** (`scripts/import_weekly_delivery_items.py`)
  - Scrapes delivery pool from TibiaPal website
  - Resolves item names to local database IDs using normalized matching
  - Upserts active items into `weekly_delivery_items` table
  - Deactivates items no longer in the delivery pool
  - Supports `--dry-run`, `--verbose`, and custom `--source-url`
- **New API Endpoint** — `GET /api/delivery/items`
  - Query params: `server_id` (for local prices), `search` (item name), `active_only` (default: true)
  - Returns: NPC prices, local server market prices, global averages, demand/supply estimates
- **New React Hook** — `useWeeklyDeliveryItems.js` for data fetching

### Technical Changes — Python Import Refactoring

- **Scripts now run as modules** — Changed from `python scripts/fetch_market.py` to `python -m scripts.fetch_market`
- Created `scripts/__init__.py` to make `scripts` a proper Python package
- Removed all `sys.path.insert` workarounds from scripts (`fetch_market.py`, `migrate.py`, `import_weekly_delivery_items.py`)
- Running scripts directly from inside `scripts/` folder no longer works — must run from project root

### Added — Inventory Manager

#### Core Feature

- **Stash Inventory Tracker** (`src/pages/Inventory.jsx`) — Full inventory management page
  - Parses Tibia server log output to import items and quantities into the stash
  - Flat sortable table showing all stash items with pricing signals
  - Summary cards: estimated stash value (NPC/market buy), market sell total, global avg buy/sell totals, top server buy total

#### Import System

- **Log Import Modal** — Paste server log text to update stash quantities
  - Regex-based parser: `^\d{2}:\d{2}:\d{2}\s+Retrieved\s+(\d+)x\s+(.+?)\s*\.$`
  - Priority-based item name matching:
    1. Items with an NPC buy price (most tradeable)
    2. Items in the "Creature Products" category
    3. Items with the most market activity
  - Reports `unmatched_names` (no DB match) and `ambiguous_names` (multiple viable candidates after tiebreaking) in the result banner
- **New API Endpoint** — `POST /api/inventory/import`
  - Accepts `{ log_text }` body (JSON)
  - **Replaces** quantities for matched items in `stash_inventory` (upsert by `item_id` — not additive)
  - Returns `StashImportResult` with `items_imported` (int), `unmatched_names` (list), `ambiguous_names` (list)
- **New Pydantic Models** — `StashImportRequest`, `StashImportResult`, `StashInventoryItem` in `backend/models.py`

#### Pricing Accuracy Signals

All signals are precomputed in `market_summary` and joined at query time — no expensive subqueries at runtime.

- **Per-server prices** — `market_buy_offer`, `market_sell_offer` from selected server
- **Server order counts** — `server_buy_orders`, `server_sell_orders` (local market depth)
- **Global server coverage** — `active_servers / global_servers` (breadth of trading)
- **Activity-weighted global averages** — weighted by `buy_offers + sell_offers` per server:
  - `global_avg_buy` / `global_avg_sell` — all servers
  - `opt_pvp_avg_buy` / `opt_pvp_avg_sell` — Optional PvP servers only
  - `opt_pvp_green_avg_buy` / `opt_pvp_green_avg_sell` — Optional PvP + Green BattlEye only
- **Top server reference** — most active server per item (buy/sell/name), with filtered variants:
  - `top_server_*` — global top
  - `opt_pvp_top_server_*` — Optional PvP top
  - `opt_pvp_green_top_server_*` — Optional PvP + Green BattlEye top
- **vs Global %** — deviation of selected server buy price vs `global_avg_buy` (always all-server average, regardless of `price_filter`)
- **Data age** — hours since last market fetch for the selected server (`price_age_hours`)
- **Liquidity Score (0–100)** — computed client-side from returned fields:
  - Breadth (40 pts): `active_servers / global_servers`
  - Depth (40 pts): `top_activity / 100` capped at 1.0
  - Freshness (20 pts): ≤24h = 1.0, ≤72h = 0.5, older = 0.1
  - Color-coded: green ≥70, yellow ≥40, red <40
  - Items with no market data (null `global_servers`) score 0 and pass the "All liquidity" filter

#### New Database Table — `market_summary`

Precomputed per-item global market aggregates, rebuilt after each server fetch in `scripts/fetch_market.py`.
**Must be created manually before first use** — `rebuild_market_summary()` uses `INSERT OR REPLACE` and does not auto-create the table. Run `scripts/migrate_inventory.py` or create it manually first.

Average prices use **activity-weighted means** (`SUM(price × activity) / SUM(activity)` where activity = `buy_offers + sell_offers`).

| Column | Type | Description |
| --- | --- | --- |
| `item_id` | INTEGER PK | FK to `items` |
| `global_servers` | INTEGER | Total servers with data |
| `active_servers` | INTEGER | Servers with buy_offers+sell_offers > 0 |
| `top_server_id` | INTEGER | Most active server (global) |
| `top_server_buy` | INTEGER | Buy price on top server |
| `top_server_sell` | INTEGER | Sell price on top server |
| `top_activity` | INTEGER | Activity count on top server |
| `global_avg_buy` | INTEGER | Activity-weighted avg buy, all servers |
| `global_avg_sell` | INTEGER | Activity-weighted avg sell, all servers |
| `opt_pvp_avg_buy` | INTEGER | Activity-weighted avg buy, Optional PvP |
| `opt_pvp_avg_sell` | INTEGER | Activity-weighted avg sell, Optional PvP |
| `opt_pvp_green_avg_buy` | INTEGER | Activity-weighted avg buy, Optional PvP + Green |
| `opt_pvp_green_avg_sell` | INTEGER | Activity-weighted avg sell, Optional PvP + Green |
| `opt_pvp_top_server_id` | INTEGER | Most active Optional PvP server |
| `opt_pvp_top_server_buy` | INTEGER | Buy price on top Optional PvP server |
| `opt_pvp_top_server_sell` | INTEGER | Sell price on top Optional PvP server |
| `opt_pvp_green_top_server_id` | INTEGER | Most active Optional PvP + Green server |
| `opt_pvp_green_top_server_buy` | INTEGER | Buy price on top Optional PvP + Green server |
| `opt_pvp_green_top_server_sell` | INTEGER | Sell price on top Optional PvP + Green server |
| `updated_at` | TIMESTAMP | Last rebuild time |

#### New Database Table — `stash_inventory`

Created by `scripts/migrate_inventory.py`.

| Column | Type | Description |
| --- | --- | --- |
| `id` | INTEGER PK | Auto-increment |
| `item_id` | INTEGER | FK to `items` (ON DELETE SET NULL) |
| `item_name` | TEXT NOT NULL COLLATE NOCASE | Denormalized item name |
| `quantity` | INTEGER DEFAULT 0 CHECK ≥ 0 | Current quantity in stash |
| `last_import_id` | INTEGER | FK to `stash_log_imports` (ON DELETE SET NULL) |
| `updated_at` | DATETIME DEFAULT now | Last import timestamp |

Unique index: `uq_stash_item_name ON stash_inventory (item_name COLLATE NOCASE)`

#### New Database Table — `stash_log_imports`

Created by `scripts/migrate_inventory.py`. Audit log of raw import pastes (currently stored but not queried by the API).

| Column | Type | Description |
| --- | --- | --- |
| `id` | INTEGER PK | Auto-increment |
| `raw_text` | TEXT NOT NULL | Full pasted log text |
| `imported_at` | DATETIME DEFAULT now | When import ran |
| `lines_parsed` | INTEGER DEFAULT 0 | Total lines scanned |
| `items_found` | INTEGER DEFAULT 0 | Items successfully matched |
| `notes` | TEXT | Optional free-text notes |

#### New API Endpoints

- **`GET /api/inventory`** — Returns paginated stash with all pricing signals
  - Query params: `search`, `category`, `server_id`, `weekly_only` (0/1), `price_filter` (`all`|`opt_pvp`|`opt_pvp_green`)
  - Returns per-item: NPC prices, server market prices, all global avg variants, all top-server variants, vs_global_pct, price_age_hours, total_value, total_value_sell
- **`GET /api/inventory/categories`** — Returns distinct categories present in stash
- **`POST /api/inventory/import`** — Import/update stash from server log text

#### Frontend Filters & Controls

- **Search** — partial item name match (live, debounced via useCallback)
- **Category selector** — filter to a single item category
- **Price filter dropdown** — switches which global avg set is used for display and totals:
  - `all` — Global avg (all servers)
  - `opt_pvp` — Optional PvP only
  - `opt_pvp_green` — Optional PvP + Green BattlEye *(default)*
- **Liquidity filter dropdown** — hide items below a score threshold: All / Medium+ (≥40) / High only (≥70)
- **Weekly delivery checkbox** — show only items present in `weekly_delivery_items` with `is_active = 1`
- **Server selector** — select which server's live prices to show

#### Frontend Table

- Flat single table (no category grouping)
- All columns sortable (click header to sort asc/desc, click again to reverse)
- Columns: Item, Qty, NPC Buy, Mkt Buy, Mkt Sell, Total (Buy), Total (Sell), Glbl Avg Buy, Glbl Avg Sell, Orders, Active, vs Global, Liquidity, Top Server, Age
- `hidden xl:table-cell` columns visible only on extra-large screens
- Full-width layout (`max-w-full`)

#### `scripts/fetch_market.py` Changes

- Added `rebuild_market_summary(conn)` — computes and upserts all global aggregates
  - Subquery `g`: per-item global + filtered activity-weighted averages
  - Subquery `t`: global top server (highest `buy_offers + sell_offers`, ties by MIN server_id)
  - Subquery `t1`: top Optional PvP server per item
  - Subquery `t2`: top Optional PvP + Green BattlEye server per item
  - Uses `INSERT OR REPLACE` — full row replacement per item
  - Called after every successful per-server upsert (incremental, not a full wipe)

#### New Migration Script — `scripts/migrate_inventory.py`

- Creates `stash_inventory` and `stash_log_imports` tables
- Run with: `python -m scripts.migrate_inventory`
- Safe to re-run (`CREATE TABLE IF NOT EXISTS`)

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

### Added — Global Market Dashboard

- **Global Market Prices Dashboard** — New dashboard feature displaying global market statistics
  - Shows average buy/sell prices for key items (Tibia Coins, Gold Token, Silver Token)
  - Aggregates data across all servers with coverage statistics
  - Displays total offers, price ranges, and spread percentages
  - Added `GET /api/market/global-key-items` endpoint for aggregated market data

### Changed — Major Refactoring

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

### Added — Infrastructure & Tooling

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

### Initial Release

- Initial release of Tibia Data Vault
- Server browser with filtering capabilities
  - Filter by name, region, PvP type, BattlEye status, and notes
- Dashboard with feature overview
- Flask API with SQLite backend
  - GET /api/servers endpoint
- React frontend with Vite and TailwindCSS
- Responsive sidebar navigation
- Real-time data fetching from database
