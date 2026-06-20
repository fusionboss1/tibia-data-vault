export const LIQUIDITY_WEIGHTS = { breadth: 40, depth: 40, freshness: 20 }

/**
 * Calculate a 0-100 liquidity score from an inventory item.
 * Combines market breadth (server coverage), depth (transaction activity),
 * and price freshness (age of last market data).
 */
export function liquidityScore(item) {
  const breadth = (item.global_servers > 0 && item.active_servers != null)
    ? (item.active_servers / item.global_servers) : 0
  const depth = item.top_activity != null ? Math.min(item.top_activity / 100, 1) : 0
  const freshness = item.price_age_hours == null ? 0
    : item.price_age_hours <= 24 ? 1 : item.price_age_hours <= 72 ? 0.5 : 0.1
  return Math.round(
    breadth * LIQUIDITY_WEIGHTS.breadth +
    depth * LIQUIDITY_WEIGHTS.depth +
    freshness * LIQUIDITY_WEIGHTS.freshness
  )
}

export function liquidityColor(score) {
  return score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'
}

/**
 * Derive the correct market_summary field names based on the selected price filter.
 */
export function deriveMarketFields(priceFilter) {
  const prefix = priceFilter === 'opt_pvp_green' ? 'opt_pvp_green'
    : priceFilter === 'opt_pvp' ? 'opt_pvp' : null
  return prefix ? {
    avgBuyField: `${prefix}_avg_buy`,
    avgSellField: `${prefix}_avg_sell`,
    topServerNameField: `${prefix}_top_server_name`,
    topServerBuyField: `${prefix}_top_server_buy`,
    topServerSellField: `${prefix}_top_server_sell`,
  } : {
    avgBuyField: 'global_avg_buy',
    avgSellField: 'global_avg_sell',
    topServerNameField: 'top_server_name',
    topServerBuyField: 'top_server_buy',
    topServerSellField: 'top_server_sell',
  }
}

function getSortValue(item, sortKey, fieldMap) {
  if (sortKey === 'liquidity') return liquidityScore(item)
  if (sortKey === 'global_avg_buy') return item[fieldMap.avgBuyField] ?? -1
  if (sortKey === 'global_avg_sell') return item[fieldMap.avgSellField] ?? -1
  const isStr = sortKey === 'item_name' || sortKey === 'top_server_name'
  return item[sortKey] ?? (isStr ? '' : -1)
}

export function sortInventoryItems(items, sortKey, sortDir, fieldMap) {
  return [...items].sort((a, b) => {
    const av = getSortValue(a, sortKey, fieldMap)
    const bv = getSortValue(b, sortKey, fieldMap)
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })
}

export function filterInventoryItems(items, { search, minLiquidity }) {
  const searchLower = search.trim().toLowerCase()
  const bySearch = searchLower
    ? items.filter(item => item.item_name.toLowerCase().includes(searchLower))
    : items
  return bySearch.filter(item => liquidityScore(item) >= minLiquidity)
}

export function calculateInventoryTotals(items, fieldMap) {
  const { avgBuyField, avgSellField, topServerBuyField } = fieldMap
  return items.reduce((acc, item) => {
    acc.buy += item.total_value || 0
    acc.sell += item.total_value_sell || 0
    acc.globalBuy += item[avgBuyField] > 0 ? item.quantity * item[avgBuyField] : 0
    acc.globalSell += item[avgSellField] > 0 ? item.quantity * item[avgSellField] : 0
    acc.topBuy += item[topServerBuyField] > 0 ? item.quantity * item[topServerBuyField] : 0
    return acc
  }, { buy: 0, sell: 0, globalBuy: 0, globalSell: 0, topBuy: 0 })
}
