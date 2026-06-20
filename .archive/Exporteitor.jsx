import { useState, useMemo, useEffect, Fragment } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Search, Package } from 'lucide-react'
import { useServers } from '../hooks/useServers'
import { useExportOpportunities } from '../hooks/useExportOpportunities'
import { useStashExportPlan } from '../hooks/useStashExportPlan'
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api'
import { formatPrice } from '../utils/formatters'

// Column config for the "Best Server" stash breakdown table.
// Every column is sortable; numeric columns filter by a minimum value, text
// columns filter by a substring match.
const STASH_COLUMNS = [
  { key: 'item_name', label: 'Item', type: 'text', align: 'left' },
  { key: 'quantity', label: 'Qty', type: 'number', align: 'right' },
  { key: 'source_buy_price', label: 'Origen Buy', sub: 'Tu servidor', subColor: 'text-gray-500', type: 'number', align: 'right', borderLeft: true },
  { key: 'source_sell_price', label: 'Origen Sell', type: 'number', align: 'right' },
  { key: 'dest_buy_price', label: 'Destino Buy', sub: 'Mejor servidor', subColor: 'text-green-500', type: 'number', align: 'right', borderLeft: true },
  { key: 'dest_sell_price', label: 'Destino Sell', type: 'number', align: 'right' },
  { key: 'global_avg_buy', label: 'Global Buy', sub: 'Promedio', subColor: 'text-purple-500', type: 'number', align: 'right', borderLeft: true },
  { key: 'global_avg_sell', label: 'Global Sell', type: 'number', align: 'right' },
  { key: 'npc_price', label: 'NPC', type: 'number', align: 'right', borderLeft: true },
  { key: 'liquidity_score', label: 'Liquidity', type: 'number', align: 'right' },
  { key: 'recommended_strategy', label: 'Strategy', type: 'text', align: 'right' },
  { key: 'weighted_value', label: 'Weighted Value', type: 'number', align: 'right' },
  { key: 'profit_instant', label: 'Profit', type: 'number', align: 'right' },
]

function Exporteitor() {
  const { servers, loading: serversLoading } = useServers()
  const [sourceServerId, setSourceServerId] = useState('')
  const [itemNameFilter, setItemNameFilter] = useState('')
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [sortBy, setSortBy] = useState('profit')
  
  // View mode
  const [viewMode, setViewMode] = useState('browse') // 'browse', 'plan', or 'export_stash'
  const [tibiaCoinsPrice, setTibiaCoinsPrice] = useState(35000) // Price per TC in gold
  
  // Additional filters
  const [minProfit, setMinProfit] = useState(0)
  const [minActivity, setMinActivity] = useState(0)
  const [minServers, setMinServers] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState('')
  
  // Export stash filters
  const [minCoverage, setMinCoverage] = useState(0)
  const [battleyeFilter, setBattleyeFilter] = useState('all')
  const [selectedItems, setSelectedItems] = useState([]) // [] = no items selected, array = specific items
  const [selectedServers, setSelectedServers] = useState(new Set()) // Set of selected server IDs for comparison

  // Stash breakdown table sorting + filtering
  const [stashSort, setStashSort] = useState({ field: 'weighted_value', dir: 'desc' })
  const [stashFilters, setStashFilters] = useState({})

  // Per-item server prices tooltip (Global Buy/Sell hover)
  const [itemServersCache, setItemServersCache] = useState({})
  const [hoveredCell, setHoveredCell] = useState(null) // { itemId, type: 'buy' | 'sell' }

  const fetchItemServers = async (itemId) => {
    if (itemServersCache[itemId]) return
    setItemServersCache(prev => ({ ...prev, [itemId]: { loading: true, data: [] } }))
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MARKET_ITEM_SERVERS}?item_id=${itemId}`)
      const json = await res.json()
      setItemServersCache(prev => ({ ...prev, [itemId]: { loading: false, data: json.data?.servers || [] } }))
    } catch (err) {
      setItemServersCache(prev => ({ ...prev, [itemId]: { loading: false, data: [] } }))
    }
  }

  // Tooltip listing the top 10 servers for an item, ranked by the hovered metric.
  const renderServerTooltip = (item, type) => {
    const entry = itemServersCache[item.item_id]
    const priceKey = type === 'buy' ? 'buy_offer' : 'sell_offer'
    const sorted = entry && entry.data
      ? [...entry.data]
          .filter(s => (s[priceKey] || 0) > 0)
          .sort((a, b) => (b[priceKey] || 0) - (a[priceKey] || 0))
          .slice(0, 10)
      : []
    return (
      <div className="absolute z-50 top-full right-0 mt-1 w-72 bg-gray-900 border border-gray-600 rounded-lg shadow-xl p-3 text-left cursor-default">
        <div className="text-xs font-semibold text-white mb-2 capitalize">
          Top servers · {type === 'buy' ? 'Buy' : 'Sell'} · {item.item_name}
        </div>
        {(!entry || entry.loading) && (
          <div className="text-xs text-gray-400 py-2">Loading…</div>
        )}
        {entry && !entry.loading && sorted.length === 0 && (
          <div className="text-xs text-gray-500 py-2">No market data on Optional PvP servers.</div>
        )}
        {sorted.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left font-normal pb-1">#</th>
                <th className="text-left font-normal pb-1">Server</th>
                <th className="text-right font-normal pb-1">Buy</th>
                <th className="text-right font-normal pb-1">Sell</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.server_id} className="text-gray-300">
                  <td className="py-0.5 text-gray-500">{i + 1}</td>
                  <td className="py-0.5">{s.server_name}</td>
                  <td className={`py-0.5 text-right ${type === 'buy' ? 'text-green-400 font-semibold' : 'text-gray-400'}`}>
                    {s.buy_offer > 0 ? formatPrice(s.buy_offer) : '—'}
                  </td>
                  <td className={`py-0.5 text-right ${type === 'sell' ? 'text-blue-400 font-semibold' : 'text-gray-400'}`}>
                    {s.sell_offer > 0 ? formatPrice(s.sell_offer) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }
  
  const { opportunities, sourceServerName, loading, error } = useExportOpportunities(
    sourceServerId, 
    '' // Don't filter on backend, do it client-side
  )
  
  const { 
    servers: rankedServers, 
    topServerItems, 
    transferCostGold,
    tibiaCoinPrice,
    totalStashItems,
    loading: stashPlanLoading, 
    error: stashPlanError 
  } = useStashExportPlan(minCoverage, battleyeFilter, selectedItems, sourceServerId)
  
  // Toggle item selection
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      // If item is in array, remove it
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId)
      }
      // Add item to selection
      return [...prev, itemId]
    })
  }

  const toggleAllItems = () => {
    setSelectedItems(prev => {
      if (prev.length === 0) {
        // Select all items
        return topServerItems.map(item => item.item_id)
      } else {
        // Deselect all items
        return []
      }
    })
  }

  const selectedItemsSet = useMemo(() => new Set(selectedItems), [selectedItems])

  const isItemSelected = (itemId) => selectedItemsSet.has(itemId)

  const toggleServerSelection = (serverId) => {
    setSelectedServers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(serverId)) {
        newSet.delete(serverId)
      } else {
        newSet.add(serverId)
      }
      return newSet
    })
  }

  const isServerSelected = (serverId) => {
    return selectedServers.has(serverId)
  }

  // True when no items are selected
  const nothingSelected = selectedItems.length === 0

  // When nothing is selected, zero out the card totals so they reflect the empty selection.
  const displayServers = useMemo(() => {
    if (!nothingSelected) return rankedServers
    return rankedServers.map(s => ({
      ...s,
      total_instant_value: 0,
      total_listing_value: 0,
      total_npc_value: 0,
      gross_profit_weighted: 0,
      net_profit_weighted: 0,
      net_profit_instant: 0,
      net_profit_listing: 0,
      roi_pct: 0,
      market_coverage_pct: 0,
      items_with_market_activity: 0,
      avg_liquidity_score: 0,
      total_activity: 0,
    }))
  }, [rankedServers, nothingSelected])

  // Selected-item totals computed client-side so deselecting items updates the
  // numbers instantly without removing rows/panels.
  const selectedTotals = useMemo(() => {
    const selected = topServerItems.filter(item => selectedItemsSet.has(item.item_id))
    const totalInstant = selected.reduce((sum, i) => sum + (i.instant_value || 0), 0)
    const totalListing = selected.reduce((sum, i) => sum + (i.listing_value || 0), 0)
    const totalWeighted = selected.reduce((sum, i) => sum + (i.weighted_value || 0), 0)
    const totalNpc = selected.reduce((sum, i) => sum + ((i.npc_price || 0) * (i.quantity || 0)), 0)
    return {
      count: selected.length,
      totalInstant,
      totalListing,
      totalWeighted,
      totalNpc,
      netWeighted: totalWeighted - totalNpc - transferCostGold,
      netInstant: totalInstant - totalNpc - transferCostGold,
    }
  }, [topServerItems, selectedItemsSet, transferCostGold])

  // Toggle sorting for a stash breakdown column
  const handleStashSort = (field) => {
    setStashSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' }
    )
  }

  const setStashFilter = (key, value) => {
    setStashFilters(prev => ({ ...prev, [key]: value }))
  }

  // Apply per-column filters + sorting to the breakdown items
  const displayedStashItems = useMemo(() => {
    let rows = [...topServerItems]

    // Filtering
    STASH_COLUMNS.forEach(col => {
      const raw = stashFilters[col.key]
      const val = (raw ?? '').toString().trim()
      if (!val) return
      if (col.type === 'number') {
        const min = parseFloat(val)
        if (!isNaN(min)) rows = rows.filter(r => (Number(r[col.key]) || 0) >= min)
      } else {
        const lower = val.toLowerCase()
        rows = rows.filter(r => {
          const cell = (r[col.key] ?? '').toString().toLowerCase()
          const cat = col.key === 'item_name' ? (r.category ?? '').toString().toLowerCase() : ''
          return cell.includes(lower) || cat.includes(lower)
        })
      }
    })

    // Sorting
    const { field, dir } = stashSort
    const col = STASH_COLUMNS.find(c => c.key === field)
    if (col) {
      rows.sort((a, b) => {
        if (col.type === 'number') {
          const av = Number(a[field]) || 0
          const bv = Number(b[field]) || 0
          return dir === 'asc' ? av - bv : bv - av
        }
        const av = (a[field] ?? '').toString().toLowerCase()
        const bv = (b[field] ?? '').toString().toLowerCase()
        return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }

    return rows
  }, [topServerItems, stashFilters, stashSort])

  const availableServers = useMemo(() => {
    return servers
      .filter(s => s.pvp_type === 'Optional PvP' && (!s.notes || s.notes !== 'blocked'))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [servers])

  // Get selected server info for data freshness
  const selectedServer = useMemo(() => {
    return servers.find(s => s.id === parseInt(sourceServerId))
  }, [servers, sourceServerId])

  // Calculate data age
  const dataAge = useMemo(() => {
    if (!selectedServer?.api_last_update) return null
    
    const lastUpdate = new Date(selectedServer.api_last_update)
    const now = new Date()
    const diffMs = now - lastUpdate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    return 'just now'
  }, [selectedServer])


  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(opportunities.map(opp => opp.item_category))
    return Array.from(cats).sort()
  }, [opportunities])

  const sortedOpportunities = useMemo(() => {
    // Filter out negative profit opportunities and apply filters
    let filtered = opportunities.filter(opp => {
      if (opp.profit_sell_pct <= 0) return false
      if (opp.profit_sell_pct < minProfit) return false
      if (opp.total_activity < minActivity) return false
      if (opp.target_server_count < minServers) return false
      if (categoryFilter && opp.item_category !== categoryFilter) return false
      // Client-side item name filter
      if (itemNameFilter && !opp.item_name.toLowerCase().includes(itemNameFilter.toLowerCase())) return false
      return true
    })
    
    switch (sortBy) {
      case 'activity':
        return filtered.sort((a, b) => b.total_activity - a.total_activity)
      case 'profit':
        return filtered.sort((a, b) => b.profit_sell_pct - a.profit_sell_pct)
      case 'profit_instant':
        return filtered.sort((a, b) => b.profit_buy_pct - a.profit_buy_pct)
      case 'name':
        return filtered.sort((a, b) => a.item_name.localeCompare(b.item_name))
      case 'price_low':
        return filtered.sort((a, b) => a.source_price - b.source_price)
      case 'price_high':
        return filtered.sort((a, b) => b.source_price - a.source_price)
      case 'servers':
        return filtered.sort((a, b) => b.target_server_count - a.target_server_count)
      default:
        return filtered
    }
  }, [opportunities, sortBy, minProfit, minActivity, minServers, categoryFilter, itemNameFilter])

  // Calculate export plan
  const exportPlan = useMemo(() => {
    if (!sourceServerId || opportunities.length === 0) return null

    // Group opportunities by target server and calculate total profit per server
    const serverProfits = {}
    
    opportunities.forEach(opp => {
      if (opp.profit_sell_pct <= 0) return // Skip unprofitable items
      
      opp.target_servers.forEach(target => {
        if (!serverProfits[target.server_id]) {
          serverProfits[target.server_id] = {
            serverId: target.server_id,
            serverName: target.server_name,
            items: [],
            totalProfit: 0,
            totalInvestment: 0
          }
        }
        
        // Calculate profit for this item on this target server
        const profit = target.sell_price - opp.source_price
        if (profit > 0) {
          serverProfits[target.server_id].items.push({
            itemId: opp.item_id,
            itemName: opp.item_name,
            itemCategory: opp.item_category,
            sourcePrice: opp.source_price,
            targetSellPrice: target.sell_price,
            targetBuyPrice: target.buy_price,
            profitPerItem: profit,
            profitPct: (profit / opp.source_price * 100)
          })
          serverProfits[target.server_id].totalProfit += profit
          serverProfits[target.server_id].totalInvestment += opp.source_price
        }
      })
    })

    // Find best target server (highest total profit potential)
    const bestServer = Object.values(serverProfits)
      .sort((a, b) => b.totalProfit - a.totalProfit)[0]

    if (!bestServer) return null

    // Calculate transfer cost
    const transferCostGold = 750 * tibiaCoinsPrice
    
    // Sort items by profit per item
    const sortedItems = bestServer.items.sort((a, b) => b.profitPerItem - a.profitPerItem)
    
    return {
      targetServer: bestServer.serverName,
      targetServerId: bestServer.serverId,
      items: sortedItems,
      totalItems: sortedItems.length,
      totalInvestment: bestServer.totalInvestment,
      grossProfit: bestServer.totalProfit,
      transferCost: transferCostGold,
      netProfit: bestServer.totalProfit - transferCostGold,
      roi: ((bestServer.totalProfit - transferCostGold) / bestServer.totalInvestment * 100)
    }
  }, [opportunities, sourceServerId, tibiaCoinsPrice])

  const toggleRow = (itemId) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedRows(newExpanded)
  }


  const getProfitColor = (profitPct) => {
    if (profitPct >= 30) return 'text-green-400'
    if (profitPct >= 15) return 'text-yellow-400'
    if (profitPct >= 0) return 'text-gray-400'
    return 'text-red-400'
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Exporteitor</h1>
        <p className="text-gray-400">Find profitable export opportunities between Optional PvP servers (excluding blocked servers)</p>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-300">View Mode:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('browse')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'browse'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Browse Opportunities
              </button>
              <button
                onClick={() => setViewMode('plan')}
                disabled={!sourceServerId}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  viewMode === 'plan'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Calculate Export Plan
              </button>
              <button
                onClick={() => setViewMode('export_stash')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'export_stash'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Package className="w-4 h-4" />
                Export My Stash
              </button>
            </div>
          </div>
          
          {/* Data Freshness Indicator */}
          {sourceServerId && selectedServer && dataAge && (
            <div 
              className="flex items-center gap-2 text-sm"
              title={`Last market scan: ${new Date(selectedServer.api_last_update).toLocaleString()}`}
            >
              <div className={`w-2 h-2 rounded-full ${
                dataAge.includes('minute') || dataAge === 'just now' 
                  ? 'bg-green-400' 
                  : dataAge.includes('hour')
                  ? 'bg-yellow-400'
                  : 'bg-red-400'
              }`}></div>
              <span className="text-gray-400">
                <span className="hidden sm:inline">Data updated </span>
                <span className="text-white font-medium">{dataAge}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Filters & Settings</h3>
          {viewMode !== 'export_stash' && (minProfit > 0 || minActivity > 0 || minServers > 0 || categoryFilter || itemNameFilter) && (
            <button
              onClick={() => {
                setMinProfit(0)
                setMinActivity(0)
                setMinServers(0)
                setCategoryFilter('')
                setItemNameFilter('')
              }}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
        
        {viewMode === 'export_stash' ? (
          // Filters for Export My Stash mode
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source Server (Your Stash)
              </label>
              <select
                value={sourceServerId}
                onChange={(e) => setSourceServerId(e.target.value)}
                disabled={serversLoading}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select your server...</option>
                {availableServers.map(server => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Used for arbitrage profit calculation</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                BattlEye Filter
              </label>
              <select
                value={battleyeFilter}
                onChange={(e) => setBattleyeFilter(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Optional PvP Servers</option>
                <option value="green">Green BattlEye Only</option>
                <option value="yellow">Yellow BattlEye Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Coverage %
              </label>
              <input
                type="number"
                value={minCoverage}
                onChange={(e) => setMinCoverage(Number(e.target.value))}
                min="0"
                max="100"
                step="5"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum % of your inventory that must have demand</p>
            </div>
          </div>
        ) : (
          // Filters for Browse and Plan modes
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source Server
                </label>
                <select
                  value={sourceServerId}
                  onChange={(e) => setSourceServerId(e.target.value)}
                  disabled={serversLoading}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select your server...</option>
                  {availableServers.map(server => (
                    <option key={server.id} value={server.id}>
                      {server.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Item Name
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={itemNameFilter}
                    onChange={(e) => setItemNameFilter(e.target.value)}
                    placeholder="Search items..."
                    disabled={!sourceServerId || viewMode === 'plan'}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  disabled={!sourceServerId || viewMode === 'plan'}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min Profit % (List)
                </label>
                <input
                  type="number"
                  value={minProfit}
                  onChange={(e) => setMinProfit(Number(e.target.value))}
                  min="0"
                  step="5"
                  disabled={!sourceServerId || viewMode === 'plan'}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min Activity (Offers)
                </label>
                <input
                  type="number"
                  value={minActivity}
                  onChange={(e) => setMinActivity(Number(e.target.value))}
                  min="0"
                  step="10"
                  disabled={!sourceServerId || viewMode === 'plan'}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min Servers Available
                </label>
                <input
                  type="number"
                  value={minServers}
                  onChange={(e) => setMinServers(Number(e.target.value))}
                  min="0"
                  step="1"
                  disabled={!sourceServerId || viewMode === 'plan'}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tibia Coins Price (gp)
                </label>
                <input
                  type="number"
                  value={tibiaCoinsPrice}
                  onChange={(e) => setTibiaCoinsPrice(Number(e.target.value))}
                  min="1000"
                  step="1000"
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="35000"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {!sourceServerId && (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-lg">Select a source server to view export opportunities</p>
        </div>
      )}

      {sourceServerId && loading && (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-400 mt-4">Loading opportunities...</p>
        </div>
      )}

      {sourceServerId && error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">Error: {error}</p>
        </div>
      )}

      {sourceServerId && !loading && !error && opportunities.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-lg">No opportunities found</p>
        </div>
      )}

      {/* Export Plan View */}
      {sourceServerId && !loading && !error && opportunities.length > 0 && viewMode === 'plan' && exportPlan && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-lg p-6 border border-blue-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">Export Plan Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Target Server</div>
                <div className="text-white font-semibold text-lg">{exportPlan.targetServer}</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Total Items</div>
                <div className="text-white font-semibold text-lg">{exportPlan.totalItems}</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Investment</div>
                <div className="text-white font-semibold text-lg">{formatPrice(exportPlan.totalInvestment)} gp</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">ROI</div>
                <div className={`font-semibold text-lg ${exportPlan.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {exportPlan.roi.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Gross Profit</div>
                <div className="text-green-400 font-semibold text-xl">{formatPrice(exportPlan.grossProfit)} gp</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Transfer Cost (750 TC)</div>
                <div className="text-red-400 font-semibold text-xl">-{formatPrice(exportPlan.transferCost)} gp</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Net Profit</div>
                <div className={`font-semibold text-xl ${exportPlan.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPrice(exportPlan.netProfit)} gp
                </div>
              </div>
            </div>
          </div>

          {/* Shopping List */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="bg-gray-700 px-6 py-4">
              <h3 className="text-xl font-semibold text-white">Shopping List</h3>
              <p className="text-gray-400 text-sm mt-1">Items to buy on {sourceServerName}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-750">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Item</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Buy Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Sell Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Profit/Item</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Profit %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {exportPlan.items.map((item) => (
                    <tr key={item.itemId} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{item.itemName}</div>
                        <div className="text-xs text-gray-500">{item.itemCategory}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatPrice(item.sourcePrice)} gp
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatPrice(item.targetSellPrice)} gp
                      </td>
                      <td className="px-4 py-3 text-right text-green-400 font-semibold">
                        +{formatPrice(item.profitPerItem)} gp
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={getProfitColor(item.profitPct)}>
                          +{item.profitPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Browse Opportunities View */}
      {sourceServerId && !loading && !error && opportunities.length > 0 && viewMode === 'browse' && (
        <>
          <div className="bg-gray-800 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="text-gray-300">
              <span className="font-semibold">{sortedOpportunities.length}</span> opportunities
              {sortedOpportunities.length !== opportunities.length && (
                <span className="text-gray-500"> (filtered from {opportunities.length})</span>
              )}
              {sourceServerName && <span className="text-gray-500 ml-2">from {sourceServerName}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="profit">Profit % (List) ↓</option>
                <option value="profit_instant">Profit % (Instant) ↓</option>
                <option value="activity">Activity ↓</option>
                <option value="servers">Server Count ↓</option>
                <option value="price_low">Price (Low to High)</option>
                <option value="price_high">Price (High to Low)</option>
                <option value="name">Item Name (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Source Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Avg Sell (List)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Avg Buy (Instant)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Profit %
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Servers
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sortedOpportunities.map((opp) => {
                  const isExpanded = expandedRows.has(opp.item_id)
                  const profitSellColor = getProfitColor(opp.profit_sell_pct)
                  const profitBuyColor = getProfitColor(opp.profit_buy_pct)
                  
                  return (
                    <Fragment key={opp.item_id}>
                      <tr className="hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{opp.item_name}</div>
                          <div className="text-xs text-gray-500">{opp.item_category}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {formatPrice(opp.source_price)} gp
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-gray-300">{formatPrice(opp.avg_sell_price)} gp</div>
                          <div className={`text-xs ${profitSellColor}`}>+{opp.profit_sell_pct.toFixed(1)}%</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-gray-300">{formatPrice(opp.avg_buy_price)} gp</div>
                          <div className={`text-xs ${profitBuyColor}`}>+{opp.profit_buy_pct.toFixed(1)}%</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`font-semibold ${profitSellColor}`}>
                            <div className="flex items-center justify-end gap-1">
                              {opp.profit_sell_pct >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              {opp.profit_sell_pct.toFixed(1)}%
                            </div>
                          </div>
                          <div className={`text-xs ${profitBuyColor}`}>
                            ({opp.profit_buy_pct.toFixed(1)}% instant)
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {opp.total_activity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {opp.target_server_count}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleRow(opp.item_id)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="8" className="px-4 py-4 bg-gray-750">
                            <div className="text-sm">
                              <h4 className="text-white font-semibold mb-3">Target Server Prices</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {opp.target_servers.map((server) => (
                                  <div
                                    key={server.server_id}
                                    className="bg-gray-700 rounded p-3"
                                  >
                                    <div className="text-white font-medium mb-1">
                                      {server.server_name}
                                    </div>
                                    <div className="text-gray-300 text-sm">
                                      Sell: {formatPrice(server.sell_price)} gp
                                    </div>
                                    <div className="text-gray-300 text-sm">
                                      Buy: {formatPrice(server.buy_price)} gp
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {server.buy_offers + server.sell_offers} offers
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Export My Stash View */}
      {viewMode === 'export_stash' && (
        <>
          {stashPlanLoading && (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
              <p className="text-gray-400 mt-4">Calculating best servers for your inventory...</p>
            </div>
          )}

          {stashPlanError && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
              <p className="text-red-400">Error: {stashPlanError}</p>
            </div>
          )}

          {!stashPlanLoading && !stashPlanError && topServerItems.length === 0 && (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 text-lg">No stash inventory found</p>
              <p className="text-gray-500 text-sm mt-2">Import your stash from the Inventory page first</p>
            </div>
          )}

          {!stashPlanLoading && !stashPlanError && topServerItems.length > 0 && (
            <div className="space-y-6">
              {/* Summary Info */}
              <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Your Stash Analysis</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {totalStashItems} unique items • Transfer cost: {formatPrice(transferCostGold)} gp (750 TC @ {formatPrice(tibiaCoinPrice)} gp)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Showing top {rankedServers.length} servers</p>
                    <p className="text-xs text-gray-500">Ranked by net profit (after transfer cost)</p>
                  </div>
                </div>

                {/* Selected items totals (computed client-side) */}
                <div className="mt-3 pt-3 border-t border-green-500/20 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Selected Items</p>
                    <p className="text-white font-semibold">
                      {selectedTotals.count} / {topServerItems.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Instant Value</p>
                    <p className="text-green-400 font-semibold">{formatPrice(selectedTotals.totalInstant)} gp</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Weighted Value</p>
                    <p className="text-cyan-400 font-semibold">{formatPrice(selectedTotals.totalWeighted)} gp</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Net Profit (Weighted)</p>
                    <p className={`font-bold ${selectedTotals.netWeighted > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedTotals.netWeighted > 0 ? '+' : ''}{formatPrice(selectedTotals.netWeighted)} gp
                    </p>
                  </div>
                </div>
                {selectedTotals.count === 0 && (
                  <p className="text-xs text-yellow-400 mt-2">
                    No items selected — check items below to include them in the calculation.
                  </p>
                )}
              </div>

              {/* Server Rankings */}
              {displayServers.length === 0 && (
                <div className="bg-gray-800 rounded-lg p-8 text-center border border-yellow-500/30">
                  <p className="text-yellow-400 text-lg">No profitable servers found</p>
                  <p className="text-gray-500 text-sm mt-2">
                    {selectedItems.length === 0
                      ? 'Select items below to see profitable export destinations'
                      : 'The selected items are not profitable to export from your source server'}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayServers.slice(0, 6).map((server, idx) => (
                  <div
                    key={server.server_id}
                    className={`bg-gray-800 rounded-lg p-5 border-2 transition-all hover:scale-105 ${
                      isServerSelected(server.server_id)
                        ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                        : idx === 0
                        ? 'border-green-500 shadow-lg shadow-green-500/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isServerSelected(server.server_id)}
                          onChange={() => toggleServerSelection(server.server_id)}
                          className="w-5 h-5 cursor-pointer rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                        />
                        <div>
                          <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            {idx === 0 && <span className="text-2xl">🏆</span>}
                            {idx === 1 && <span className="text-xl">🥈</span>}
                            {idx === 2 && <span className="text-xl">🥉</span>}
                            #{idx + 1} {server.server_name}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">
                            {server.battleye} BattlEye
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {/* Strategy Tabs */}
                      <div className="flex gap-1 mb-2">
                        <div className="flex-1 bg-gray-700 rounded px-2 py-1 text-center">
                          <div className="text-xs text-gray-400">Instant</div>
                          <div className="text-green-400 font-semibold text-xs">
                            {formatPrice(server.total_instant_value || 0)} gp
                          </div>
                        </div>
                        <div className="flex-1 bg-gray-700 rounded px-2 py-1 text-center">
                          <div className="text-xs text-gray-400">Listing</div>
                          <div className="text-blue-400 font-semibold text-xs">
                            {formatPrice(server.total_listing_value || 0)} gp
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Weighted Value:</span>
                        <span className="text-purple-400 font-semibold">
                          {formatPrice((server.gross_profit_weighted || 0) + (server.total_npc_value || 0))} gp
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">NPC Baseline:</span>
                        <span className="text-gray-500">
                          {formatPrice(server.total_npc_value || 0)} gp
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Transfer Cost:</span>
                        <span className="text-red-400">
                          -{formatPrice(transferCostGold)} gp
                        </span>
                      </div>

                      <div className="border-t border-gray-700 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300 font-medium">Net Profit (Weighted):</span>
                          <span
                            className={`font-bold text-lg ${
                              (server.net_profit_weighted || 0) > 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {(server.net_profit_weighted || 0) > 0 ? '+' : ''}
                            {formatPrice(server.net_profit_weighted || 0)} gp
                          </span>
                        </div>
                        
                        {/* Show instant/listing profits as comparison */}
                        <div className="mt-1 text-xs space-y-0.5">
                          <div className="flex justify-between text-gray-500">
                            <span>Instant only:</span>
                            <span className={server.net_profit_instant > 0 ? 'text-green-400' : 'text-red-400'}>
                              {server.net_profit_instant > 0 ? '+' : ''}{formatPrice(server.net_profit_instant || 0)} gp
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>Listing only:</span>
                            <span className={server.net_profit_listing > 0 ? 'text-blue-400' : 'text-red-400'}>
                              {server.net_profit_listing > 0 ? '+' : ''}{formatPrice(server.net_profit_listing || 0)} gp
                            </span>
                          </div>
                        </div>
                        
                        {server.roi_pct !== null && (
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">ROI:</span>
                            <span
                              className={`text-xs font-semibold ${
                                server.roi_pct > 0 ? 'text-green-400' : 'text-red-400'
                              }`}
                            >
                              {server.roi_pct > 0 ? '+' : ''}
                              {server.roi_pct}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700">
                        <div>
                          <p className="text-xs text-gray-500">Market Coverage</p>
                          <p className="text-blue-400 font-semibold">
                            {server.market_coverage_pct || server.coverage_pct || 0}%
                          </p>
                          <p className="text-xs text-gray-600">
                            {server.items_with_market_activity || server.items_with_demand}/{server.total_items} items
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Avg Liquidity</p>
                          <p className={`font-semibold ${
                            (server.avg_liquidity_score || 0) >= 60 ? 'text-green-400' : 
                            (server.avg_liquidity_score || 0) >= 30 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {server.avg_liquidity_score || 0}/100
                          </p>
                          <p className="text-xs text-gray-600">
                            {(server.total_activity || server.total_buy_offers || 0).toLocaleString()} offers
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Server Comparison View */}
              {selectedServers.size > 0 && (
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 px-6 py-4 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                          <span className="text-2xl">📊</span>
                          Server Comparison ({selectedServers.size} selected)
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Compare metrics across selected servers
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedServers(new Set())}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-750">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Metric</th>
                          {displayServers
                            .filter(s => selectedServers.has(s.server_id))
                            .map(server => (
                              <th key={server.server_id} className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">
                                {server.server_name}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        <tr>
                          <td className="px-4 py-3 text-gray-300 font-medium">Net Profit (Weighted)</td>
                          {displayServers
                            .filter(s => selectedServers.has(s.server_id))
                            .map(server => (
                              <td key={server.server_id} className="px-4 py-3 text-right">
                                <span className={`font-bold ${(server.net_profit_weighted || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {(server.net_profit_weighted || 0) > 0 ? '+' : ''}{formatPrice(server.net_profit_weighted || 0)} gp
                                </span>
                              </td>
                            ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-300 font-medium">Net Profit (Instant)</td>
                          {displayServers
                            .filter(s => selectedServers.has(s.server_id))
                            .map(server => (
                              <td key={server.server_id} className="px-4 py-3 text-right">
                                <span className={server.net_profit_instant > 0 ? 'text-green-400' : 'text-red-400'}>
                                  {server.net_profit_instant > 0 ? '+' : ''}{formatPrice(server.net_profit_instant || 0)} gp
                                </span>
                              </td>
                            ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-300 font-medium">Net Profit (Listing)</td>
                          {displayServers
                            .filter(s => selectedServers.has(s.server_id))
                            .map(server => (
                              <td key={server.server_id} className="px-4 py-3 text-right">
                                <span className={server.net_profit_listing > 0 ? 'text-blue-400' : 'text-red-400'}>
                                  {server.net_profit_listing > 0 ? '+' : ''}{formatPrice(server.net_profit_listing || 0)} gp
                                </span>
                              </td>
                            ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-300 font-medium">Instant Value</td>
                          {displayServers
                            .filter(s => selectedServers.has(s.server_id))
                            .map(server => (
                              <td key={server.server_id} className="px-4 py-3 text-right text-green-400 font-semibold">
                                {formatPrice(server.total_instant_value || 0)} gp
                              </td>
                            ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-300 font-medium">Listing Value</td>
                          {displayServers
                            .filter(s => selectedServers.has(s.server_id))
                            .map(server => (
                              <td key={server.server_id} className="px-4 py-3 text-right text-blue-400 font-semibold">
                                {formatPrice(server.total_listing_value || 0)} gp
                              </td>
                            ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-300 font-medium">Weighted Value</td>
                          {displayServers
                            .filter(s => selectedServers.has(s.server_id))
                            .map(server => (
                              <td key={server.server_id} className="px-4 py-3 text-right text-purple-400 font-semibold">
                                {formatPrice((server.gross_profit_weighted || 0) + (server.total_npc_value || 0))} gp
                              </td>
                            ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-300 font-medium">ROI</td>
                          {displayServers
                            .filter(s => selectedServers.has(s.server_id))
                            .map(server => (
                              <td key={server.server_id} className="px-4 py-3 text-right">
                                <span className={`font-semibold ${server.roi_pct > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {server.roi_pct > 0 ? '+' : ''}{server.roi_pct}%
                                </span>
                              </td>
                            ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-300 font-medium">Market Coverage</td>
                          {displayServers
                            .filter(s => selectedServers.has(s.server_id))
                            .map(server => (
                              <td key={server.server_id} className="px-4 py-3 text-right text-blue-400 font-semibold">
                                {server.market_coverage_pct || server.coverage_pct || 0}%
                              </td>
                            ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-300 font-medium">Avg Liquidity</td>
                          {displayServers
                            .filter(s => selectedServers.has(s.server_id))
                            .map(server => (
                              <td key={server.server_id} className="px-4 py-3 text-right">
                                <span className={`font-semibold ${
                                  (server.avg_liquidity_score || 0) >= 60 ? 'text-green-400' : 
                                  (server.avg_liquidity_score || 0) >= 30 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {server.avg_liquidity_score || 0}/100
                                </span>
                              </td>
                            ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-300 font-medium">BattlEye</td>
                          {displayServers
                            .filter(s => selectedServers.has(s.server_id))
                            .map(server => (
                              <td key={server.server_id} className="px-4 py-3 text-right text-gray-300">
                                {server.battleye}
                              </td>
                            ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Best Server Detailed Breakdown */}
              {topServerItems.length > 0 && (() => {
                const selectedServerIds = Array.from(selectedServers)
                const breakdownServer = rankedServers.length > 0 && (selectedServerIds.length > 0
                  ? rankedServers.find(s => s.server_id === selectedServerIds[0]) || rankedServers[0]
                  : rankedServers[0])
                return (
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className={`bg-gradient-to-r ${selectedServerIds.length > 0 ? 'from-blue-900/40 to-purple-900/40' : 'from-green-900/40 to-blue-900/40'} px-6 py-4 border-b border-gray-700`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                          <span className="text-2xl">{selectedServerIds.length > 0 ? '📋' : '🏆'}</span>
                          {selectedServerIds.length > 0 ? 'Selected Server' : 'Best Server'}: {breakdownServer?.server_name || 'No servers available'}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Detailed item breakdown • Click a column to sort, type below headers to filter
                          {displayedStashItems.length !== topServerItems.length && (
                            <span className="text-green-400"> • {displayedStashItems.length} of {topServerItems.length} shown</span>
                          )}
                          {selectedServerIds.length > 0 && (
                            <span className="text-blue-400"> • Showing first selected server</span>
                          )}
                          {!breakdownServer && (
                            <span className="text-yellow-400"> • No profitable servers found for selected items</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">
                          {selectedItems.length} / {topServerItems.length} items selected
                        </span>
                        <button
                          onClick={toggleAllItems}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {selectedItems.length === 0 ? 'Select All' : 'Deselect All'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-750">
                        {/* Sortable header row */}
                        <tr>
                          <th className="px-2 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedItems.length === topServerItems.length && topServerItems.length > 0}
                              onChange={toggleAllItems}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </th>
                          {STASH_COLUMNS.map(col => {
                            const active = stashSort.field === col.key
                            return (
                              <th
                                key={col.key}
                                onClick={() => handleStashSort(col.key)}
                                className={`px-4 py-3 text-xs font-medium uppercase cursor-pointer select-none hover:text-white ${
                                  col.align === 'left' ? 'text-left' : 'text-right'
                                } ${active ? 'text-white' : 'text-gray-300'} ${
                                  col.borderLeft ? 'border-l border-gray-600' : ''
                                }`}
                              >
                                <div className={`flex items-center gap-1 ${col.align === 'left' ? 'justify-start' : 'justify-end'}`}>
                                  <span>{col.label}</span>
                                  {active && (
                                    stashSort.dir === 'asc'
                                      ? <ChevronUp className="w-3 h-3" />
                                      : <ChevronDown className="w-3 h-3" />
                                  )}
                                </div>
                                {col.sub && (
                                  <div className={`font-normal ${col.subColor || 'text-gray-500'}`}>{col.sub}</div>
                                )}
                              </th>
                            )
                          })}
                        </tr>
                        {/* Filter row */}
                        <tr className="bg-gray-800">
                          <th className="px-2 py-2"></th>
                          {STASH_COLUMNS.map(col => (
                            <th
                              key={col.key}
                              className={`px-2 py-2 ${col.borderLeft ? 'border-l border-gray-600' : ''}`}
                            >
                              <input
                                type={col.type === 'number' ? 'number' : 'text'}
                                value={stashFilters[col.key] ?? ''}
                                onChange={(e) => setStashFilter(col.key, e.target.value)}
                                placeholder={col.type === 'number' ? 'min' : 'search'}
                                className="w-full bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 border border-gray-600 focus:border-green-500 focus:outline-none"
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {displayedStashItems.map((item) => {
                          const liquidityColor = item.liquidity_score >= 70 ? 'text-green-400' : 
                                                 item.liquidity_score >= 40 ? 'text-yellow-400' : 'text-red-400'
                          const strategyBadge = {
                            'instant': { text: 'Instant', color: 'bg-green-600' },
                            'listing': { text: 'Listing', color: 'bg-blue-600' },
                            'hybrid': { text: 'Hybrid', color: 'bg-purple-600' },
                            'npc': { text: 'NPC', color: 'bg-gray-600' }
                          }[item.recommended_strategy] || { text: 'Unknown', color: 'bg-gray-600' }
                          
                          const selected = isItemSelected(item.item_id)
                          
                          return (
                            <tr 
                              key={item.item_id} 
                              className={`hover:bg-gray-750 transition-colors ${!selected ? 'opacity-40' : ''}`}
                            >
                              <td className="px-2 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleItemSelection(item.item_id)}
                                  className="w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-white font-medium capitalize">{item.item_name}</div>
                                <div className="text-xs text-gray-500">{item.category}</div>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-300 font-semibold">
                                {item.quantity.toLocaleString()}
                              </td>
                              
                              {/* ORIGEN (Source Server) */}
                              <td className="px-4 py-3 text-right border-l border-gray-700">
                                {item.source_buy_price > 0 ? (
                                  <div>
                                    <div className="text-orange-400">{formatPrice(item.source_buy_price)} gp</div>
                                    <div className="text-xs text-gray-500">{item.source_buy_offers} offers</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {item.source_sell_price > 0 ? (
                                  <div>
                                    <div className="text-orange-300">{formatPrice(item.source_sell_price)} gp</div>
                                    <div className="text-xs text-gray-500">{item.source_sell_offers} offers</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              
                              {/* DESTINO (Destination Server) */}
                              <td className="px-4 py-3 text-right border-l border-gray-700">
                                {item.dest_buy_price > 0 ? (
                                  <div>
                                    <div className="text-green-400 font-semibold">{formatPrice(item.dest_buy_price)} gp</div>
                                    <div className="text-xs text-gray-500">{item.dest_buy_offers} offers</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {item.dest_sell_price > 0 ? (
                                  <div>
                                    <div className="text-green-300">{formatPrice(item.dest_sell_price)} gp</div>
                                    <div className="text-xs text-gray-500">{item.dest_sell_offers} offers</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              
                              {/* GLOBAL (Market Summary) */}
                              <td
                                className="px-4 py-3 text-right border-l border-gray-700 relative"
                                onMouseEnter={() => { setHoveredCell({ itemId: item.item_id, type: 'buy' }); fetchItemServers(item.item_id) }}
                                onMouseLeave={() => setHoveredCell(null)}
                              >
                                {item.global_avg_buy > 0 ? (
                                  <div className="text-purple-400 underline decoration-dotted decoration-gray-600 cursor-help">
                                    {formatPrice(item.global_avg_buy)} gp
                                  </div>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                                {hoveredCell?.itemId === item.item_id && hoveredCell?.type === 'buy' && renderServerTooltip(item, 'buy')}
                              </td>
                              <td
                                className="px-4 py-3 text-right relative"
                                onMouseEnter={() => { setHoveredCell({ itemId: item.item_id, type: 'sell' }); fetchItemServers(item.item_id) }}
                                onMouseLeave={() => setHoveredCell(null)}
                              >
                                {item.global_avg_sell > 0 ? (
                                  <div className="text-purple-300 underline decoration-dotted decoration-gray-600 cursor-help">
                                    {formatPrice(item.global_avg_sell)} gp
                                  </div>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                                {hoveredCell?.itemId === item.item_id && hoveredCell?.type === 'sell' && renderServerTooltip(item, 'sell')}
                              </td>
                              
                              {/* NPC */}
                              <td className="px-4 py-3 text-right border-l border-gray-700">
                                {item.npc_price > 0 ? (
                                  <span className="text-gray-400">{formatPrice(item.npc_price)} gp</span>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              
                              {/* LIQUIDITY */}
                              <td className="px-4 py-3 text-right">
                                <span className={`font-semibold ${liquidityColor}`}>
                                  {item.liquidity_score}
                                </span>
                              </td>
                              
                              {/* STRATEGY */}
                              <td className="px-4 py-3 text-right">
                                <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${strategyBadge.color}`}>
                                  {strategyBadge.text}
                                </span>
                              </td>
                              
                              {/* WEIGHTED VALUE */}
                              <td className="px-4 py-3 text-right">
                                {item.weighted_value > 0 ? (
                                  <span className="text-cyan-400 font-semibold">
                                    {formatPrice(item.weighted_value)} gp
                                  </span>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              
                              {/* PROFIT */}
                              <td className="px-4 py-3 text-right">
                                <div>
                                  {item.profit_instant !== undefined && item.profit_instant !== 0 ? (
                                    <div className={`font-semibold ${item.profit_instant > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {item.profit_instant > 0 ? '+' : ''}{formatPrice(item.profit_instant)} gp
                                    </div>
                                  ) : (
                                    <span className="text-gray-600">—</span>
                                  )}
                                  {item.profit_pct_instant !== null && item.profit_pct_instant !== undefined && (
                                    <div className="text-xs text-gray-500">
                                      ({item.profit_pct_instant > 0 ? '+' : ''}{item.profit_pct_instant}%)
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                )
              })()}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Exporteitor
