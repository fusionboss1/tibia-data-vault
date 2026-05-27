import { useState, useEffect, useCallback } from 'react'
import { Upload, Search, AlertTriangle, Package, RefreshCw, X } from 'lucide-react'

const API_BASE = 'http://localhost:5000'

function Inventory() {
  const [inventory, setInventory] = useState([])
  const [categories, setCategories] = useState([])
  const [servers, setServers] = useState([])
  const [total, setTotal] = useState(0)
  const [grandTotalValue, setGrandTotalValue] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedServerId, setSelectedServerId] = useState('')
  const [weeklyOnly, setWeeklyOnly] = useState(false)
  const [priceFilter, setPriceFilter] = useState('opt_pvp')
  const [minLiquidity, setMinLiquidity] = useState(0)
  const [sortKey, setSortKey] = useState('item_name')
  const [sortDir, setSortDir] = useState('asc')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [logText, setLogText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState(null)

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedCategory) params.set('category', selectedCategory)
      if (selectedServerId) params.set('server_id', selectedServerId)
      if (weeklyOnly) params.set('weekly_only', '1')
      if (priceFilter !== 'all') params.set('price_filter', priceFilter)
      const res = await fetch(`${API_BASE}/api/inventory?${params}`)
      const json = await res.json()
      if (json.success) {
        setInventory(json.data.inventory)
        setTotal(json.data.total_items)
        setGrandTotalValue(json.data.grand_total_value || 0)
      } else {
        setError(json.error || 'Failed to load inventory')
      }
    } catch {
      setError('Could not reach the API')
    } finally {
      setLoading(false)
    }
  }, [search, selectedCategory, selectedServerId, weeklyOnly, priceFilter])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/inventory/categories`)
      const json = await res.json()
      if (json.success) setCategories(json.data.categories)
    } catch {
      // non-critical
    }
  }, [])

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/servers`)
      const json = await res.json()
      if (json.success) setServers(json.data.servers)
    } catch {
      // non-critical
    }
  }, [])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  const handleImport = async () => {
    if (!logText.trim()) return
    setImporting(true)
    setImportResult(null)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/inventory/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_text: logText })
      })
      const json = await res.json()
      if (json.success) {
        setImportResult(json.data)
        setLogText('')
        setShowImport(false)
        await fetchInventory()
        await fetchCategories()
      } else {
        setError(json.error || 'Import failed')
      }
    } catch {
      setError('Could not reach the API')
    } finally {
      setImporting(false)
    }
  }

  const avgBuyField = priceFilter === 'opt_pvp_green' ? 'opt_pvp_green_avg_buy'
    : priceFilter === 'opt_pvp' ? 'opt_pvp_avg_buy'
    : 'global_avg_buy'
  const avgSellField = priceFilter === 'opt_pvp_green' ? 'opt_pvp_green_avg_sell'
    : priceFilter === 'opt_pvp' ? 'opt_pvp_avg_sell'
    : 'global_avg_sell'
  const topServerNameField = priceFilter === 'opt_pvp_green' ? 'opt_pvp_green_top_server_name'
    : priceFilter === 'opt_pvp' ? 'opt_pvp_top_server_name'
    : 'top_server_name'
  const topServerBuyField = priceFilter === 'opt_pvp_green' ? 'opt_pvp_green_top_server_buy'
    : priceFilter === 'opt_pvp' ? 'opt_pvp_top_server_buy'
    : 'top_server_buy'
  const topServerSellField = priceFilter === 'opt_pvp_green' ? 'opt_pvp_green_top_server_sell'
    : priceFilter === 'opt_pvp' ? 'opt_pvp_top_server_sell'
    : 'top_server_sell'

  const liquidityScore = (item) => {
    const breadth = (item.global_servers > 0 && item.active_servers != null)
      ? (item.active_servers / item.global_servers) : 0
    const depth = item.top_activity != null ? Math.min(item.top_activity / 100, 1) : 0
    const freshness = item.price_age_hours == null ? 0 : item.price_age_hours <= 24 ? 1 : item.price_age_hours <= 72 ? 0.5 : 0.1
    return Math.round(breadth * 40 + depth * 40 + freshness * 20)
  }

  const liquidityColor = (score) =>
    score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortIcon = (key) => {
    if (sortKey !== key) return <span className="text-gray-600 ml-1">⇅</span>
    return <span className="text-blue-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const sortItems = (items) => {
    return [...items].sort((a, b) => {
      let av, bv
      if (sortKey === 'liquidity') { av = liquidityScore(a); bv = liquidityScore(b) }
      else if (sortKey === 'global_avg_buy') { av = a[avgBuyField] ?? -1; bv = b[avgBuyField] ?? -1 }
      else if (sortKey === 'global_avg_sell') { av = a[avgSellField] ?? -1; bv = b[avgSellField] ?? -1 }
      else {
        const isStr = sortKey === 'item_name' || sortKey === 'top_server_name'
        av = a[sortKey] ?? (isStr ? '' : -1)
        bv = b[sortKey] ?? (isStr ? '' : -1)
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }

  const totals = inventory.reduce((acc, item) => {
    acc.buy += item.total_value || 0
    acc.sell += item.total_value_sell || 0
    acc.globalBuy += item[avgBuyField] > 0 ? item.quantity * item[avgBuyField] : 0
    acc.globalSell += item[avgSellField] > 0 ? item.quantity * item[avgSellField] : 0
    acc.topBuy += item[topServerBuyField] > 0 ? item.quantity * item[topServerBuyField] : 0
    return acc
  }, { buy: 0, sell: 0, globalBuy: 0, globalSell: 0, topBuy: 0 })

  const filteredItems = sortItems(
    inventory.filter(item => liquidityScore(item) >= minLiquidity)
  )

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Stash Inventory</h1>
          <p className="text-gray-400 text-sm mt-1">
            {total} item{total !== 1 ? 's' : ''} in stash
          </p>
        </div>
        <div className="flex items-center gap-4">
          {inventory.length > 0 && (
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-xs text-gray-400">Conservative (buy/NPC)</p>
                <p className="text-base font-bold text-yellow-400">{totals.buy.toLocaleString()} gp</p>
              </div>
              {selectedServerId && totals.sell > 0 && (
                <div>
                  <p className="text-xs text-gray-400">Server sell</p>
                  <p className="text-base font-bold text-orange-400">{totals.sell.toLocaleString()} gp</p>
                </div>
              )}
              {totals.topBuy > 0 && (
                <div>
                  <p className="text-xs text-gray-400">Top server buy</p>
                  <p className="text-base font-bold text-blue-400">{totals.topBuy.toLocaleString()} gp</p>
                </div>
              )}
              {totals.globalBuy > 0 && (
                <div>
                  <p className="text-xs text-gray-400">Global avg buy</p>
                  <p className="text-base font-bold text-gray-300">{totals.globalBuy.toLocaleString()} gp</p>
                </div>
              )}
              {totals.globalSell > 0 && (
                <div>
                  <p className="text-xs text-gray-400">Global avg sell</p>
                  <p className="text-base font-bold text-green-400">{totals.globalSell.toLocaleString()} gp</p>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => { setShowImport(true); setImportResult(null) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Log
          </button>
        </div>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div className={`mb-4 p-4 rounded-lg border flex items-start gap-3 ${
          importResult.unmatched_names.length > 0
            ? 'bg-yellow-900/30 border-yellow-700 text-yellow-300'
            : 'bg-green-900/30 border-green-700 text-green-300'
        }`}>
          {importResult.unmatched_names.length > 0
            ? <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            : <Package className="w-5 h-5 mt-0.5 shrink-0" />
          }
          <div>
            <p className="font-medium">
              Imported {importResult.items_imported} items successfully.
            </p>
            {importResult.unmatched_names.length > 0 && (
              <p className="text-sm mt-1">
                {importResult.unmatched_names.length} unmatched (not in items database):{' '}
                <span className="font-mono">{importResult.unmatched_names.join(', ')}</span>
              </p>
            )}
            {importResult.ambiguous_names?.length > 0 && (
              <p className="text-sm mt-1 text-orange-300">
                {importResult.ambiguous_names.length} ambiguous (best guess used — verify manually):{' '}
                <span className="font-mono">{importResult.ambiguous_names.join(', ')}</span>
              </p>
            )}
          </div>
          <button onClick={() => setImportResult(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-4 rounded-lg border bg-red-900/30 border-red-700 text-red-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Import Server Log</h2>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-400 text-sm mb-3">
                Paste your server log below. Only lines matching{' '}
                <code className="bg-gray-700 px-1 rounded text-yellow-300">HH:MM:SS Retrieved Nx item name.</code>{' '}
                will be processed. This will replace your current stash.
              </p>
              <textarea
                className="w-full h-64 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-blue-500"
                placeholder={'17:09:40 Retrieved 196x ancient stone.\n17:09:41 Retrieved 50x health potion.'}
                value={logText}
                onChange={e => setLogText(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setShowImport(false)}
                className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !logText.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                {importing
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importing...</>
                  : <><Upload className="w-4 h-4" /> Import</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={priceFilter}
          onChange={e => setPriceFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">Global avg (all servers)</option>
          <option value="opt_pvp">Optional PvP only</option>
          <option value="opt_pvp_green">Optional PvP + Green BattlEye</option>
        </select>
        <select
          value={minLiquidity}
          onChange={e => setMinLiquidity(Number(e.target.value))}
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
            onChange={e => setWeeklyOnly(e.target.checked)}
            className="accent-yellow-400 w-4 h-4"
          />
          <span className="text-sm text-gray-200 whitespace-nowrap">Weekly delivery</span>
        </label>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">All categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={selectedServerId}
          onChange={e => setSelectedServerId(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">NPC prices only</option>
          {servers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={fetchInventory}
          className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Empty state */}
      {!loading && inventory.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">No items in stash</p>
          <p className="text-sm mt-1">Import a server log to populate your inventory</p>
        </div>
      )}

      {/* Inventory table */}
      {filteredItems.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                {[
                    ['item_name', 'Item', 'text-left'],
                    ['quantity', 'Qty', 'text-right'],
                    ['best_npc_buy_price', 'NPC Buy', 'text-right'],
                    ['market_buy_offer', 'Mkt Buy', 'text-right'],
                    ['market_sell_offer', 'Mkt Sell', 'text-right'],
                    ['total_value', 'Total (Buy)', 'text-right'],
                    ['total_value_sell', 'Total (Sell)', 'text-right'],
                  ].map(([key, label, align]) => (
                    <th key={key} onClick={() => handleSort(key)}
                      className={`${align} px-4 py-3 cursor-pointer hover:text-white select-none`}>
                      {label}{sortIcon(key)}
                    </th>
                  ))}
                  {[
                    ['global_avg_buy', 'Glbl Avg Buy'],
                    ['global_avg_sell', 'Glbl Avg Sell'],
                    ['server_buy_orders', 'Orders'],
                    ['active_servers', 'Active'],
                    ['vs_global_pct', 'vs Global'],
                    ['liquidity', 'Liquidity'],
                    ['top_server_name', 'Top Server'],
                    ['price_age_hours', 'Age'],
                  ].map(([key, label]) => (
                    <th key={key} onClick={() => handleSort(key)}
                      className="text-right px-4 py-3 hidden xl:table-cell cursor-pointer hover:text-white select-none">
                      {label}{sortIcon(key)}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                      idx === filteredItems.length - 1 ? 'border-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-200 font-medium capitalize">
                      {item.item_name}
                      {item.tier > 0 && (
                        <span className="ml-2 text-xs text-yellow-400">Tier {item.tier}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-semibold tabular-nums">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                      {item.best_npc_buy_price != null
                        ? item.best_npc_buy_price.toLocaleString()
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-blue-400">
                      {item.market_buy_offer > 0
                        ? item.market_buy_offer.toLocaleString()
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-400">
                      {item.market_sell_offer > 0
                        ? item.market_sell_offer.toLocaleString()
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-yellow-400">
                      {item.total_value > 0
                        ? item.total_value.toLocaleString()
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-orange-400">
                      {item.total_value_sell > 0
                        ? item.total_value_sell.toLocaleString()
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell text-gray-300">
                      {item[avgBuyField] > 0 ? item[avgBuyField].toLocaleString() : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell text-green-300">
                      {item[avgSellField] > 0 ? item[avgSellField].toLocaleString() : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell">
                      {item.server_buy_orders != null
                        ? <span className="text-blue-400">{item.server_buy_orders}b</span>
                        : null
                      }
                      {item.server_buy_orders != null && item.server_sell_orders != null
                        ? <span className="text-gray-500"> / </span>
                        : null
                      }
                      {item.server_sell_orders != null
                        ? <span className="text-green-400">{item.server_sell_orders}s</span>
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell">
                      {item.active_servers != null
                        ? <span className={item.active_servers >= 30 ? 'text-green-400' : item.active_servers >= 10 ? 'text-yellow-400' : 'text-red-400'}>
                            {item.active_servers}/{item.global_servers}
                          </span>
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell">
                      {item.vs_global_pct != null
                        ? <span className={item.vs_global_pct > 20 ? 'text-green-400' : item.vs_global_pct < -20 ? 'text-red-400' : 'text-gray-300'}>
                            {item.vs_global_pct > 0 ? '+' : ''}{item.vs_global_pct}%
                          </span>
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell">
                      {(() => { const s = liquidityScore(item); return <span className={liquidityColor(s)}>{s}</span> })()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell">
                      {item[topServerNameField]
                        ? <span className="text-gray-200">
                            <span className="text-gray-400">{item[topServerNameField]}: </span>
                            <span className="text-blue-400">{item[topServerBuyField]?.toLocaleString() ?? '—'}</span>
                            <span className="text-gray-500"> / </span>
                            <span className="text-green-400">{item[topServerSellField]?.toLocaleString() ?? '—'}</span>
                          </span>
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell">
                      {item.price_age_hours != null
                        ? <span className={item.price_age_hours <= 24 ? 'text-green-400' : item.price_age_hours <= 72 ? 'text-yellow-400' : 'text-red-400'}>
                            {item.price_age_hours < 24 ? `${item.price_age_hours}h` : `${Math.floor(item.price_age_hours / 24)}d`}
                          </span>
                        : <span className="text-gray-600">—</span>
                      }
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Inventory
