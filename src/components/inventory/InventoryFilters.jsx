import PropTypes from 'prop-types'
import { Search, RefreshCw, Upload } from 'lucide-react'

function InventoryFilters({
  search, onSearch,
  priceFilter, onPriceFilter,
  minLiquidity, onMinLiquidity,
  weeklyOnly, onWeeklyOnly,
  selectedCategory, onCategory, categories,
  selectedServerId, onServerId, servers,
  loading, onRefresh,
  onImport,
}) {
  return (
    <div className="flex gap-3 mb-6 flex-wrap">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
        />
      </div>
      <select
        value={priceFilter}
        onChange={e => onPriceFilter(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
      >
        <option value="all">Global avg (all servers)</option>
        <option value="opt_pvp">Optional PvP only</option>
        <option value="opt_pvp_green">Optional PvP + Green BattlEye</option>
      </select>
      <select
        value={minLiquidity}
        onChange={e => onMinLiquidity(Number(e.target.value))}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
      >
        <option value={0}>All liquidity</option>
        <option value={40}>Medium+ (≥40)</option>
        <option value={70}>High only (≥70)</option>
      </select>
      <label className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer select-none hover:border-gray-500 transition-colors">
        <input
          type="checkbox"
          checked={weeklyOnly}
          onChange={e => onWeeklyOnly(e.target.checked)}
          className="accent-yellow-400 w-4 h-4"
        />
        <span className="text-sm text-gray-200 whitespace-nowrap">Weekly delivery</span>
      </label>
      <select
        value={selectedCategory}
        onChange={e => onCategory(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
      >
        <option value="">All categories</option>
        {categories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
      <select
        value={selectedServerId}
        onChange={e => onServerId(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
      >
        <option value="">NPC prices only</option>
        {servers.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button
        onClick={onRefresh}
        className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
        title="Refresh"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
      <button
        onClick={onImport}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
      >
        <Upload className="w-4 h-4" />
        Import Log
      </button>
    </div>
  )
}

InventoryFilters.propTypes = {
  search: PropTypes.string.isRequired,
  onSearch: PropTypes.func.isRequired,
  priceFilter: PropTypes.string.isRequired,
  onPriceFilter: PropTypes.func.isRequired,
  minLiquidity: PropTypes.number.isRequired,
  onMinLiquidity: PropTypes.func.isRequired,
  weeklyOnly: PropTypes.bool.isRequired,
  onWeeklyOnly: PropTypes.func.isRequired,
  selectedCategory: PropTypes.string.isRequired,
  onCategory: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedServerId: PropTypes.string.isRequired,
  onServerId: PropTypes.func.isRequired,
  servers: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
}

export default InventoryFilters
