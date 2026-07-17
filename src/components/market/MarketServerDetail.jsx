import PropTypes from 'prop-types'
import { Search, X, ChevronUp, ChevronDown, ChevronsUpDown, Clock, Server } from 'lucide-react'
import ErrorMessage from '../common/ErrorMessage'

const fmt = (n) => n != null && n > 0 ? n.toLocaleString() : '—'

function SortIcon({ col, sortBy, sortDir }) {
  if (sortBy !== col) return <ChevronsUpDown className="w-3 h-3 text-gray-500" />
  return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-emerald-400" /> : <ChevronDown className="w-3 h-3 text-emerald-400" />
}

SortIcon.propTypes = { col: PropTypes.string.isRequired, sortBy: PropTypes.string.isRequired, sortDir: PropTypes.string.isRequired }

function OrderBookPlaceholder({ item }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-500 border border-dashed border-gray-600 rounded-lg mx-4 mb-4">
      <Clock className="w-8 h-8 opacity-40" />
      <div className="text-center">
        <p className="text-sm font-medium text-gray-400">Order Book — Coming Soon</p>
        <p className="text-xs mt-1">Live {item?.name} offers from tibiamarket.top</p>
      </div>
    </div>
  )
}

OrderBookPlaceholder.propTypes = { item: PropTypes.object }

function MarketServerDetail({ server, items, loading, error, itemSearch, setItemSearch, category, setCategory, categories, sortBy, sortDir, onSort, selectedItem, onSelectItem }) {
  if (!server) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3 p-8">
        <Server className="w-12 h-12 opacity-30" />
        <p className="text-sm">Select a server to see its market</p>
      </div>
    )
  }

  const cols = [
    { key: 'name', label: 'Item' },
    { key: 'buy_offer', label: 'Buy' },
    { key: 'tc_buy_offer', label: 'Buy TC' },
    { key: 'sell_offer', label: 'Sell' },
    { key: 'tc_sell_offer', label: 'Sell TC' },
    { key: 'global_avg_sell', label: 'Global Sell' },
    { key: 'activity', label: 'Offers' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">{server.name}</h2>
            <p className="text-xs text-gray-400">{server.pvp_type} · BattlEye {server.battleye ?? '—'} · {server.region}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder="Search items…"
                className="bg-gray-700 border border-gray-600 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
              />
              {itemSearch && (
                <button onClick={() => setItemSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedItem && <OrderBookPlaceholder item={selectedItem} />}

      <div className="flex-1 overflow-auto">
        {error && <div className="p-4"><ErrorMessage message={error} /></div>}

        {!loading && !error && items.length === 0 && (
          <p className="px-4 py-8 text-sm text-gray-500 text-center">No active offers on this server</p>
        )}

        {!loading && !error && items.length > 0 && (
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
              {items.map(item => {
                const isSelected = selectedItem?.item_id === item.item_id
                return (
                  <tr
                    key={item.item_id}
                    onClick={() => onSelectItem(isSelected ? null : item)}
                    className={`border-b border-gray-700/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-600/20 border-l-2 border-l-blue-500' : 'hover:bg-gray-700/40'
                    }`}
                  >
                    <td className="px-3 py-2 text-white font-medium capitalize max-w-[160px] truncate">{item.name}</td>
                    <td className="px-3 py-2 text-emerald-400 text-right whitespace-nowrap">{fmt(item.buy_offer)}</td>
                    <td className="px-3 py-2 text-cyan-400 text-right whitespace-nowrap">{fmt(item.tc_buy_offer)}</td>
                    <td className={`px-3 py-2 text-right whitespace-nowrap ${
                      item.global_avg_sell > 0 && item.sell_offer > 0 && item.sell_offer < item.global_avg_sell
                        ? 'text-emerald-400 font-medium'
                        : 'text-amber-400'
                    }`}>{fmt(item.sell_offer)}</td>
                    <td className="px-3 py-2 text-violet-400 text-right whitespace-nowrap">{fmt(item.tc_sell_offer)}</td>
                    <td className="px-3 py-2 text-gray-500 text-right whitespace-nowrap">{fmt(item.global_avg_sell)}</td>
                    <td className="px-3 py-2 text-gray-400 text-right">{item.buy_offers}↑ {item.sell_offers}↓</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

MarketServerDetail.propTypes = {
  server: PropTypes.object,
  items: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  itemSearch: PropTypes.string.isRequired,
  setItemSearch: PropTypes.func.isRequired,
  category: PropTypes.string.isRequired,
  setCategory: PropTypes.func.isRequired,
  categories: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortDir: PropTypes.string.isRequired,
  onSort: PropTypes.func.isRequired,
  selectedItem: PropTypes.object,
  onSelectItem: PropTypes.func.isRequired,
}

export default MarketServerDetail
