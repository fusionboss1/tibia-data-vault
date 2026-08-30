import { useState } from 'react'
import { Search, X, Filter, Globe, Server, ClipboardList } from 'lucide-react'
import { useMarketBrowser } from '../hooks/useMarketBrowser'
import { useServerBrowser } from '../hooks/useServerBrowser'
import FilterButton from '../components/common/FilterButton'
import FilterSelect from '../components/common/FilterSelect'
import MarketItemList from '../components/market/MarketItemList'
import MarketItemDetail from '../components/market/MarketItemDetail'
import MarketServerList from '../components/market/MarketServerList'
import MarketServerDetail from '../components/market/MarketServerDetail'
import ErrorMessage from '../components/common/ErrorMessage'
import { PVP_TYPES, BATTLEYE_TYPES } from '../constants/filters'

const PVP_OPTIONS = PVP_TYPES.filter((t) => t !== 'All')
const BATTLEYE_OPTIONS = BATTLEYE_TYPES.filter((t) => t !== 'All')

function GlobalView({ mode = 'global' }) {
  const {
    search, setSearch,
    category, setCategory,
    pvpType, setPvpType,
    battleye, setBattleye,
    excludeBlocked, setExcludeBlocked,
    yasirOnly, setYasirOnly,
    sortBy, sortDir, handleSort,
    offset, setOffset,
    items, total, loading, error,
    categories,
    selectedItem, selectItem,
    serverData, serverLoading, serverError,
    filteredStats,
    PAGE_SIZE, totalPages, currentPage,
  } = useMarketBrowser(mode)

  const hasActiveFilters = search || category || pvpType || battleye || excludeBlocked || yasirOnly

  return (
    <>
      <div className="px-4 pb-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              className="bg-gray-700 border border-gray-600 rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-40">
            <FilterSelect label="" value={category || 'All'} onChange={(v) => setCategory(v === 'All' ? '' : v)} options={['All', ...categories]} allLabel="All Categories" />
          </div>

          <div className="w-px h-5 bg-gray-600 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400 shrink-0">PvP:</span>
            <div className="flex flex-wrap gap-1">
              <FilterButton label="All" active={pvpType === ''} onClick={() => setPvpType('')} />
              {PVP_OPTIONS.map((opt) => (
                <FilterButton key={opt} label={opt} active={pvpType === opt} onClick={() => setPvpType(pvpType === opt ? '' : opt)} />
              ))}
            </div>
          </div>

          <div className="w-px h-5 bg-gray-600 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">BattlEye:</span>
            <div className="flex gap-1">
              <FilterButton label="All" active={battleye === ''} onClick={() => setBattleye('')} />
              {BATTLEYE_OPTIONS.map((opt) => (
                <FilterButton key={opt} label={opt} active={battleye === opt} onClick={() => setBattleye(battleye === opt ? '' : opt)} />
              ))}
            </div>
          </div>

          <div className="w-px h-5 bg-gray-600 hidden sm:block" />

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={excludeBlocked} onChange={(e) => setExcludeBlocked(e.target.checked)} className="w-3.5 h-3.5 rounded accent-emerald-500" />
            <span className="text-xs text-gray-400">Exclude blocked</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={yasirOnly} onChange={(e) => setYasirOnly(e.target.checked)} className="w-3.5 h-3.5 rounded accent-emerald-500" />
            <span className="text-xs text-gray-400">Yasir only</span>
          </label>

          {hasActiveFilters && (
            <button onClick={() => { setSearch(''); setCategory(''); setPvpType(''); setBattleye(''); setExcludeBlocked(false); setYasirOnly(false) }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {error && <div className="px-4 pb-2 shrink-0"><ErrorMessage message={error} /></div>}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[420px] shrink-0 border-r border-gray-700 overflow-hidden flex flex-col">
          <MarketItemList
            items={items} total={total} loading={loading} selectedItem={selectedItem} onSelect={selectItem}
            sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
            currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => setOffset(p * PAGE_SIZE)}
            showNpcSellPrice={mode === 'weekly_delivery'}
          />
        </div>
        <div className="flex-1 overflow-hidden bg-gray-800/30">
          <MarketItemDetail item={selectedItem} serverData={serverData} loading={serverLoading} error={serverError} filteredStats={filteredStats} />
        </div>
      </div>
    </>
  )
}

function ServerView() {
  const {
    filteredServers, serversLoading, serversError,
    serverSearch, setServerSearch,
    pvpType, setPvpType,
    battleye, setBattleye,
    myServer, setMyServer,
    onlyCompatible, setOnlyCompatible,
    excludeBlocked, setExcludeBlocked,
    selectedServer, selectServer,
    items, itemsLoading, itemsError,
    itemSearch, setItemSearch,
    category, setCategory,
    categories,
    sortBy, sortDir, handleSort,
    selectedItem, setSelectedItem,
    servers,
  } = useServerBrowser()

  return (
    <>
      {serversError && <div className="px-4 pb-2 shrink-0"><ErrorMessage message={serversError} /></div>}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-60 shrink-0 border-r border-gray-700 overflow-hidden flex flex-col">
          <MarketServerList
            servers={filteredServers} allServers={servers ?? []} loading={serversLoading} selectedServer={selectedServer} onSelect={selectServer}
            serverSearch={serverSearch} setServerSearch={setServerSearch}
            pvpType={pvpType} setPvpType={setPvpType}
            battleye={battleye} setBattleye={setBattleye}
            excludeBlocked={excludeBlocked} setExcludeBlocked={setExcludeBlocked}
            myServer={myServer} setMyServer={setMyServer}
            onlyCompatible={onlyCompatible} setOnlyCompatible={setOnlyCompatible}
          />
        </div>
        <div className="flex-1 overflow-hidden bg-gray-800/30">
          <MarketServerDetail
            server={selectedServer} items={items} loading={itemsLoading} error={itemsError}
            itemSearch={itemSearch} setItemSearch={setItemSearch}
            category={category} setCategory={setCategory} categories={categories}
            sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
            selectedItem={selectedItem} onSelectItem={setSelectedItem}
          />
        </div>
      </div>
    </>
  )
}

function MarketBrowser() {
  const [mode, setMode] = useState('global')

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-3 border-b border-gray-700 bg-gray-800/80 shrink-0">
        <div className="flex items-center gap-4 mb-3">
          <h1 className="text-2xl font-bold text-white">Market Browser</h1>
          <div className="flex gap-1 bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setMode('global')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'global' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Globe className="w-3.5 h-3.5" /> Global
            </button>
            <button
              onClick={() => setMode('weekly_delivery')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'weekly_delivery' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Weekly Delivery
            </button>
            <button
              onClick={() => setMode('server')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'server' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Server className="w-3.5 h-3.5" /> Server
            </button>
          </div>
        </div>
      </div>

      {mode === 'global' ? <GlobalView /> : mode === 'weekly_delivery' ? <GlobalView mode="weekly_delivery" /> : <ServerView />}
    </div>
  )
}

export default MarketBrowser
