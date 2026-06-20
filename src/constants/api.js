export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const API_ENDPOINTS = {
  SERVERS: '/api/servers',
  MARKET_GLOBAL: '/api/market/global-key-items',
  MARKET_ITEM_SERVERS: '/api/market/item-servers',
  DELIVERY_ITEMS: '/api/delivery/items',
  EXPORT_OPPORTUNITIES: '/api/export/opportunities',
  EXPORT_STASH_PLAN: '/api/export/stash-plan',
  INVENTORY: '/api/inventory',
  INVENTORY_CATEGORIES: '/api/inventory/categories',
  INVENTORY_IMPORT: '/api/inventory/import',
}
