export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const API_ENDPOINTS = {
  SERVERS: '/api/servers',
  MARKET_GLOBAL: '/api/market/global-key-items',
  DELIVERY_ITEMS: '/api/delivery/items',
  EXPORT_OPPORTUNITIES: '/api/export/opportunities',
}
