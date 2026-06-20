import { useCallback, useMemo, useState } from 'react'
import {
  calculateInventoryTotals,
  deriveMarketFields,
  filterInventoryItems,
  sortInventoryItems,
} from '../utils/inventory'

/**
 * Manages client-side state and derived data for the inventory table:
 * - search, liquidity filter, and sort state
 * - field names based on the selected price filter
 * - filtered + sorted items
 * - aggregate totals for the header cards
 */
export function useInventoryTable(inventory, priceFilter) {
  const [search, setSearch] = useState('')
  const [minLiquidity, setMinLiquidity] = useState(0)
  const [sort, setSort] = useState({ key: 'item_name', dir: 'asc' })

  const fieldMap = useMemo(() => deriveMarketFields(priceFilter), [priceFilter])

  const filteredItems = useMemo(() => {
    const filtered = filterInventoryItems(inventory, { search, minLiquidity })
    return sortInventoryItems(filtered, sort.key, sort.dir, fieldMap)
  }, [inventory, search, minLiquidity, sort, fieldMap])

  const totals = useMemo(
    () => calculateInventoryTotals(inventory, fieldMap),
    [inventory, fieldMap]
  )

  const handleSort = useCallback((key) => {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' })
  }, [])

  return {
    search,
    setSearch,
    minLiquidity,
    setMinLiquidity,
    sort,
    handleSort,
    fieldMap,
    filteredItems,
    totals,
  }
}
