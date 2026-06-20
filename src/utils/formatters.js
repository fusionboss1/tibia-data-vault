const NUMBER_FMT = new Intl.NumberFormat('en-US')

export const formatNumber = (num) => {
  if (num == null) return '-'
  return NUMBER_FMT.format(num)
}

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp * 1000)
  const formatted = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  return `${formatted} CEST`
}

export const formatISODate = (isoString) => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  const formatted = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  return `${formatted} CEST`
}

export const formatPrice = (price) => {
  if (price === null || price === undefined || price <= 0) return '—'
  return NUMBER_FMT.format(Math.round(price))
}

export const calculateCoverage = (serverCount, totalServers) => {
  if (!totalServers) return 0
  return Math.round((serverCount / totalServers) * 100)
}

export const calculateSpread = (avgSell, avgBuy) => {
  if (!avgBuy) return 0
  return ((avgSell - avgBuy) / avgBuy * 100).toFixed(1)
}

export const formatSignedPrice = (price) => {
  if (price === null || price === undefined || price === '') return '—'
  const rounded = Math.round(price)
  return `${rounded > 0 ? '+' : ''}${NUMBER_FMT.format(rounded)} gp`
}

export const getDeliveryMargin = (item) => {
  const npcPrice = item.npc_price || item.best_npc_buy_price || item.best_npc_sell_price || 0
  const localSell = item.server_sell_price || 0
  const globalSell = item.global_avg_sell_price || 0
  return {
    npcVsLocal: localSell - npcPrice,
    npcVsGlobal: globalSell - npcPrice,
  }
}

export const getDeliverySuggestedAction = (item) => {
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

export const getSourceMarketValueColor = (value) => {
  switch ((value || '').toLowerCase()) {
    case 'very high': return 'bg-red-500/20 text-red-300'
    case 'high':      return 'bg-orange-500/20 text-orange-300'
    case 'medium':    return 'bg-yellow-500/20 text-yellow-300'
    case 'low':       return 'bg-blue-500/20 text-blue-300'
    default:          return 'bg-gray-700 text-gray-300'
  }
}
