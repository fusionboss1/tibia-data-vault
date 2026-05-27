import { useMemo, useState } from 'react'
import { Search, TrendingDown, TrendingUp } from 'lucide-react'
import { useServers } from '../hooks/useServers'
import { useWeeklyDeliveryItems } from '../hooks/useWeeklyDeliveryItems'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'

function WeeklyDelivery() {
  const { servers, loading: serversLoading, error: serversError } = useServers()
  const [selectedServerId, setSelectedServerId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('source_order')

  // Fetch all items; filter client-side to avoid API lag on every keystroke
  const { deliveryItems, serverName, loading, error } = useWeeklyDeliveryItems(
    selectedServerId,
    ''
  )

  const filteredDeliveryItems = useMemo(() => {
    if (!searchTerm) return deliveryItems
    const term = searchTerm.toLowerCase()
    return deliveryItems.filter((item) =>
      item.item_name.toLowerCase().includes(term)
    )
  }, [deliveryItems, searchTerm])

  const availableServers = useMemo(() => {
    return [...servers].sort((a, b) => a.name.localeCompare(b.name))
  }, [servers])

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === '' || price <= 0) return '—'
    return new Intl.NumberFormat('en-US').format(Math.round(price))
  }

  const formatSignedPrice = (price) => {
    if (price === null || price === undefined || price === '') return '—'
    const rounded = Math.round(price)
    return `${rounded > 0 ? '+' : ''}${new Intl.NumberFormat('en-US').format(rounded)} gp`
  }

  const getMargin = (item) => {
    const npcPrice = item.npc_price || item.best_npc_buy_price || item.best_npc_sell_price || 0
    const localSell = item.server_sell_price || 0
    const globalSell = item.global_avg_sell_price || 0

    return {
      npcVsLocal: localSell - npcPrice,
      npcVsGlobal: globalSell - npcPrice,
    }
  }

  const getSuggestedAction = (item) => {
    const npcPrice = item.npc_price || item.best_npc_buy_price || item.best_npc_sell_price || 0
    const localSell = item.server_sell_price || 0
    const globalSell = item.global_avg_sell_price || 0
    const demand = item.estimated_demand || 0

    if (!npcPrice) return 'Check NPC price'
    if (!localSell) return 'Need server data'
    if (localSell <= npcPrice) return 'Sell to NPC'
    if (globalSell > localSell * 1.15 && demand > 0) return 'Export'
    if (demand > 0) return 'List on market'
    return 'Review'
  }

  const getSourceMarketValueColor = (value) => {
    switch ((value || '').toLowerCase()) {
      case 'very high':
        return 'bg-red-500/20 text-red-300'
      case 'high':
        return 'bg-orange-500/20 text-orange-300'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300'
      case 'low':
        return 'bg-blue-500/20 text-blue-300'
      default:
        return 'bg-gray-700 text-gray-300'
    }
  }

  const sortedDeliveryItems = useMemo(() => {
    const items = [...filteredDeliveryItems]

    switch (sortBy) {
      case 'source_order':
        return items.sort((a, b) => {
          const aOrder = a.source_order ?? Number.MAX_SAFE_INTEGER
          const bOrder = b.source_order ?? Number.MAX_SAFE_INTEGER
          if (aOrder !== bOrder) return aOrder - bOrder
          return a.item_name.localeCompare(b.item_name)
        })
      case 'demand':
        return items.sort((a, b) => (b.estimated_demand || 0) - (a.estimated_demand || 0))
      case 'npc_low':
        return items.sort((a, b) => (a.npc_price || 0) - (b.npc_price || 0))
      case 'local_margin':
        return items.sort((a, b) => {
          const aMargin = (a.server_sell_price || 0) - (a.npc_price || 0)
          const bMargin = (b.server_sell_price || 0) - (b.npc_price || 0)
          return bMargin - aMargin
        })
      case 'global_margin':
        return items.sort((a, b) => {
          const aMargin = (a.global_avg_sell_price || 0) - (a.npc_price || 0)
          const bMargin = (b.global_avg_sell_price || 0) - (b.npc_price || 0)
          return bMargin - aMargin
        })
      case 'name':
      default:
        return items.sort((a, b) => a.item_name.localeCompare(b.item_name))
    }
  }, [filteredDeliveryItems, sortBy])

  const stats = useMemo(() => {
    return filteredDeliveryItems.reduce(
      (acc, item) => {
        const npcPrice = item.npc_price || item.best_npc_buy_price || item.best_npc_sell_price || 0
        const localSell = item.server_sell_price || 0
        const globalSell = item.global_avg_sell_price || 0

        acc.total += 1
        if (localSell > 0) acc.withLocalData += 1
        if (globalSell > 0) acc.withGlobalData += 1
        if (npcPrice > 0 && localSell > npcPrice) acc.aboveNpc += 1
        acc.totalDemand += item.estimated_demand || 0
        return acc
      },
      { total: 0, withLocalData: 0, withGlobalData: 0, aboveNpc: 0, totalDemand: 0 }
    )
  }, [sortedDeliveryItems])

  if (loading && deliveryItems.length === 0) {
    return <LoadingSpinner message="Loading weekly delivery items..." />
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Weekly Delivery Tasks</h1>
        <p className="text-gray-400">
          Compare NPC value, your server price, and global market data for delivery pool items.
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 mb-6 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
            <div className="bg-gray-700/60 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Items in Pool</div>
              <div className="text-white text-2xl font-semibold">{stats.total}</div>
            </div>
            <div className="bg-gray-700/60 rounded-lg p-4">
              <div className="text-gray-400 text-sm">With Local Market Data</div>
              <div className="text-white text-2xl font-semibold">{stats.withLocalData}</div>
            </div>
            <div className="bg-gray-700/60 rounded-lg p-4">
              <div className="text-gray-400 text-sm">With Global Market Data</div>
              <div className="text-white text-2xl font-semibold">{stats.withGlobalData}</div>
            </div>
            <div className="bg-gray-700/60 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Above NPC Price</div>
              <div className="text-white text-2xl font-semibold">{stats.aboveNpc}</div>
            </div>
            <div className="bg-gray-700/60 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Estimated Demand</div>
              <div className="text-white text-2xl font-semibold">
                {new Intl.NumberFormat('en-US').format(stats.totalDemand)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Server</label>
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              disabled={serversLoading}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Global view only</option>
              {availableServers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
            {serverName && <p className="text-xs text-gray-500 mt-1">Showing data for {serverName}</p>}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <Search className="absolute left-3 top-10 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search delivery items..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="source_order">Source Order</option>
              <option value="name">Item Name</option>
              <option value="demand">Estimated Demand</option>
              <option value="npc_low">Lowest NPC Price</option>
              <option value="local_margin">Best Local Margin</option>
              <option value="global_margin">Best Global Margin</option>
            </select>
          </div>
        </div>

        {(serversError || error) && (
          <div className="space-y-3">
            {serversError && <ErrorMessage message={serversError} />}
            {error && <ErrorMessage message={error} />}
          </div>
        )}
      </div>

      {!loading && sortedDeliveryItems.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-lg">No delivery items found</p>
          <p className="text-gray-500 text-sm mt-2">
            Add active rows to the `weekly_delivery_items` table to populate this panel.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Delivery Pool Breakdown</h2>
              <p className="text-sm text-gray-400">NPC, local market, and global averages side by side.</p>
            </div>
            <div className="text-sm text-gray-400">
              {sortedDeliveryItems.length} item{sortedDeliveryItems.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    NPC Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Your Server
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Global Average
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Estimated Demand
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Margin vs NPC
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Suggested
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sortedDeliveryItems.map((item) => {
                  const margin = getMargin(item)
                  const action = getSuggestedAction(item)
                  const hasLocalData = (item.server_sell_price || 0) > 0 || (item.server_buy_price || 0) > 0
                  const npcPrice = item.npc_price || item.best_npc_buy_price || item.best_npc_sell_price || 0
                  const hasNpcPrice = npcPrice > 0
                  const localColor = !npcPrice
                    ? 'text-gray-400'
                    : (item.server_sell_price || 0) >= npcPrice
                    ? 'text-green-400'
                    : 'text-red-400'
                  const globalColor = !npcPrice
                    ? 'text-gray-400'
                    : (item.global_avg_sell_price || 0) >= npcPrice
                    ? 'text-green-400'
                    : 'text-red-400'
                  const localMargin = hasNpcPrice && hasLocalData ? margin.npcVsLocal : null
                  const globalMargin = hasNpcPrice && (item.global_avg_sell_price || 0) > 0 ? margin.npcVsGlobal : null

                  return (
                    <tr key={item.item_id} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{item.item_name}</div>
                        <div className="text-xs text-gray-500">{item.item_category}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSourceMarketValueColor(item.source_market_value)}`}>
                            TibiaPal: {item.source_market_value || 'Unknown'}
                          </span>
                          {item.source_order && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                              #{item.source_order}
                            </span>
                          )}
                        </div>
                        {item.notes && <div className="text-xs text-gray-400 mt-1">{item.notes}</div>}
                      </td>

                      <td className="px-4 py-3 text-right text-gray-300">
                        <div className="font-medium text-white">{formatPrice(item.npc_price)} gp</div>
                        <div className="text-xs text-gray-500">Buy: {formatPrice(item.best_npc_buy_price)} gp</div>
                        <div className="text-xs text-gray-500">Sell: {formatPrice(item.best_npc_sell_price)} gp</div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className={`font-medium ${hasLocalData ? localColor : 'text-gray-500'}`}>
                          {formatPrice(item.server_sell_price)} gp
                        </div>
                        <div className="text-xs text-gray-500">
                          Buy: {formatPrice(item.server_buy_price)} gp
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {item.server_updated_at
                            ? new Date(item.server_updated_at * 1000).toLocaleString()
                            : 'No local data'}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className={`font-medium ${globalColor}`}>
                          {formatPrice(item.global_avg_sell_price)} gp
                        </div>
                        <div className="text-xs text-gray-500">
                          Buy: {formatPrice(item.global_avg_buy_price)} gp
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {item.global_server_count} server{item.global_server_count === 1 ? '' : 's'}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right text-gray-300">
                        {new Intl.NumberFormat('en-US').format(item.estimated_demand || 0)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className={`font-semibold ${localMargin === null ? 'text-gray-400' : localMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatSignedPrice(localMargin)}
                        </div>
                        <div className="text-xs text-gray-500">Global: {formatSignedPrice(globalMargin)}</div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              action === 'Sell to NPC'
                                ? 'bg-red-500/20 text-red-300'
                                : action === 'Export'
                                ? 'bg-blue-500/20 text-blue-300'
                                : action === 'List on market'
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-gray-700 text-gray-300'
                            }`}
                          >
                            {action}
                          </span>
                          {localMargin === null ? (
                            <div className="w-4 h-4 rounded-full bg-gray-500" />
                          ) : localMargin >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
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
      )}
    </div>
  )
}

export default WeeklyDelivery
