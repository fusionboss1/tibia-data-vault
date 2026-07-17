import PropTypes from 'prop-types'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

const fmt = (n) => n != null ? n.toLocaleString() : '—'

function SortIcon({ col, sortBy, sortDir }) {
  if (sortBy !== col) return <ChevronsUpDown className="w-3 h-3 text-gray-500" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-emerald-400" />
    : <ChevronDown className="w-3 h-3 text-emerald-400" />
}

SortIcon.propTypes = {
  col: PropTypes.string.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortDir: PropTypes.string.isRequired,
}

function MarketItemList({ items, total, loading, selectedItem, onSelect, sortBy, sortDir, onSort, currentPage, totalPages, onPageChange, showNpcSellPrice = false }) {
  const cols = [
    { key: 'name', label: 'Item' },
    { key: 'global_avg_buy', label: 'Avg Buy' },
    { key: 'global_avg_sell', label: 'Avg Sell' },
    ...(showNpcSellPrice ? [{ key: 'best_npc_buy_price', label: 'NPC Buy' }] : []),
    { key: 'active_servers', label: 'Servers' },
    { key: 'top_activity', label: 'Activity' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700 shrink-0">
        {loading ? 'Loading…' : `${total.toLocaleString()} items`}
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr>
              {cols.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => onSort(key)}
                  className="px-3 py-2 text-left text-gray-400 font-medium cursor-pointer hover:text-white select-none whitespace-nowrap"
                >
                  <span className="flex items-center gap-1">
                    {label}
                    <SortIcon col={key} sortBy={sortBy} sortDir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="px-3 py-8 text-center text-gray-500">Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="px-3 py-8 text-center text-gray-500">No items found</td>
              </tr>
            ) : (
              items.map((item) => {
                const isSelected = selectedItem?.item_id === item.item_id
                return (
                  <tr
                    key={item.item_id}
                    onClick={() => onSelect(item)}
                    className={`border-b border-gray-700/50 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 border-l-2 border-l-blue-500'
                        : 'hover:bg-gray-700/40'
                    }`}
                  >
                    <td className="px-3 py-2 text-white font-medium capitalize max-w-[180px] truncate">
                      {item.name}
                    </td>
                    <td className="px-3 py-2 text-emerald-400 text-right whitespace-nowrap">
                      {fmt(item.global_avg_buy)}
                    </td>
                    <td className="px-3 py-2 text-amber-400 text-right whitespace-nowrap">
                      {fmt(item.global_avg_sell)}
                    </td>
                    {showNpcSellPrice && (
                      <td className="px-3 py-2 text-violet-400 text-right whitespace-nowrap">
                        {fmt(item.best_npc_buy_price)}
                      </td>
                    )}
                    <td className="px-3 py-2 text-gray-300 text-right">
                      {item.active_servers}
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-right">
                      {item.top_activity}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-700 shrink-0 text-xs text-gray-400">
          {/* onPageChange expects a 0-based page index; currentPage is 1-based,
              so prev = currentPage - 2 and next = currentPage are the correct 0-based indices */}
          <button
            onClick={() => onPageChange(currentPage - 2)}
            disabled={currentPage <= 1 || loading}
            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span>Page {currentPage} / {totalPages}</span>
          <button
            onClick={() => onPageChange(currentPage)}
            disabled={currentPage >= totalPages || loading}
            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

MarketItemList.propTypes = {
  items: PropTypes.array.isRequired,
  total: PropTypes.number.isRequired,
  loading: PropTypes.bool.isRequired,
  selectedItem: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortDir: PropTypes.string.isRequired,
  onSort: PropTypes.func.isRequired,
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  showNpcSellPrice: PropTypes.bool,
}

export default MarketItemList
