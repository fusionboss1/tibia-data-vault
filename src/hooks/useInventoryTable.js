import { useCallback, useMemo, useState } from 'react'
import { filterInventoryItems, sortInventoryItems } from '../utils/inventory'

export function useInventoryTable(inventory) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'item_name', dir: 'asc' })

  const filteredItems = useMemo(() => {
    const filtered = filterInventoryItems(inventory, { search })
    return sortInventoryItems(filtered, sort.key, sort.dir)
  }, [inventory, search, sort])

  const handleSort = useCallback((key) => {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' })
  }, [])

  return {
    search,
    setSearch,
    sort,
    handleSort,
    filteredItems,
  }
}
