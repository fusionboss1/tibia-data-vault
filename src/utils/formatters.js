export const formatNumber = (num) => {
  if (num == null) return '-'
  return new Intl.NumberFormat('en-US').format(num)
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

export const calculateCoverage = (serverCount, totalServers) => {
  if (!totalServers) return 0
  return Math.round((serverCount / totalServers) * 100)
}

export const calculateSpread = (avgSell, avgBuy) => {
  if (!avgBuy) return 0
  return ((avgSell - avgBuy) / avgBuy * 100).toFixed(1)
}
