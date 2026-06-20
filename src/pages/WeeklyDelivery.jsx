import { useMemo, useState } from 'react'
import { useServersContext } from '../contexts/ServersContext'
import { useWeeklyDeliveryItems } from '../hooks/useWeeklyDeliveryItems'
import LoadingSpinner from '../components/common/LoadingSpinner'
import DeliveryFilters from '../components/delivery/DeliveryFilters'
import DeliveryTable from '../components/delivery/DeliveryTable'

function WeeklyDelivery() {
  const { servers, loading: serversLoading, error: serversError } = useServersContext()
  const [selectedServerId, setSelectedServerId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('source_order')

  const { deliveryItems, serverName, loading, error } = useWeeklyDeliveryItems(selectedServerId, '')

  const availableServers = useMemo(() =>
    [...servers].sort((a, b) => a.name.localeCompare(b.name))
  , [servers])

  const filteredDeliveryItems = useMemo(() => {
    if (!searchTerm) return deliveryItems
    const term = searchTerm.toLowerCase()
    return deliveryItems.filter((item) => item.item_name.toLowerCase().includes(term))
  }, [deliveryItems, searchTerm])

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
        return items.sort((a, b) =>
          ((b.server_sell_price || 0) - (b.npc_price || 0)) -
          ((a.server_sell_price || 0) - (a.npc_price || 0))
        )
      case 'global_margin':
        return items.sort((a, b) =>
          ((b.global_avg_sell_price || 0) - (b.npc_price || 0)) -
          ((a.global_avg_sell_price || 0) - (a.npc_price || 0))
        )
      case 'name':
      default:
        return items.sort((a, b) => a.item_name.localeCompare(b.item_name))
    }
  }, [filteredDeliveryItems, sortBy])

  const stats = useMemo(() => filteredDeliveryItems.reduce((acc, item) => {
    const npcPrice = item.npc_price || item.best_npc_buy_price || item.best_npc_sell_price || 0
    const localSell = item.server_sell_price || 0
    const globalSell = item.global_avg_sell_price || 0
    acc.total += 1
    if (localSell > 0) acc.withLocalData += 1
    if (globalSell > 0) acc.withGlobalData += 1
    if (npcPrice > 0 && localSell > npcPrice) acc.aboveNpc += 1
    acc.totalDemand += item.estimated_demand || 0
    return acc
  }, { total: 0, withLocalData: 0, withGlobalData: 0, aboveNpc: 0, totalDemand: 0 }),
  [filteredDeliveryItems])

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

      <DeliveryFilters
        stats={stats}
        selectedServerId={selectedServerId} onServerId={setSelectedServerId}
        servers={availableServers} serversLoading={serversLoading} serverName={serverName}
        searchTerm={searchTerm} onSearch={setSearchTerm}
        sortBy={sortBy} onSortBy={setSortBy}
        serversError={serversError} error={error}
      />

      <DeliveryTable items={sortedDeliveryItems} loading={loading} />
    </div>
  )
}

export default WeeklyDelivery
