import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { useServers } from '../hooks/useServers'
import { useExportOpportunities } from '../hooks/useExportOpportunities'

function Exporteitor() {
  const { servers, loading: serversLoading } = useServers()
  const [sourceServerId, setSourceServerId] = useState('')
  const [itemNameFilter, setItemNameFilter] = useState('')
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [sortBy, setSortBy] = useState('profit')
  
  // View mode
  const [viewMode, setViewMode] = useState('browse') // 'browse' or 'plan'
  const [tibiaCoinsPrice, setTibiaCoinsPrice] = useState(35000) // Price per TC in gold
  
  // Additional filters
  const [minProfit, setMinProfit] = useState(0)
  const [minActivity, setMinActivity] = useState(0)
  const [minServers, setMinServers] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState('')
  
  const { opportunities, sourceServerName, loading, error } = useExportOpportunities(
    sourceServerId, 
    '' // Don't filter on backend, do it client-side
  )

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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US').format(Math.round(price))
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
          {(minProfit > 0 || minActivity > 0 || minServers > 0 || categoryFilter || itemNameFilter) && (
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
                    <>
                      <tr key={opp.item_id} className="hover:bg-gray-750">
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
                        <tr key={`${opp.item_id}-details`}>
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
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default Exporteitor
