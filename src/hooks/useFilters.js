import { useState, useCallback, useMemo } from 'react'
import { DEFAULT_FILTERS } from '../constants/filters'

export const useFilters = (items) => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const handleFilterChange = useCallback((field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }, [])

  const clearFilter = useCallback((field) => {
    setFilters(prev => ({ ...prev, [field]: DEFAULT_FILTERS[field] || '' }))
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      return (
        (filters.name === '' || item.name?.toLowerCase().includes(filters.name.toLowerCase())) &&
        (filters.region === 'All' || item.region === filters.region) &&
        (filters.pvp_type === 'All' || item.pvp_type === filters.pvp_type) &&
        (filters.battleye === 'All' || item.battleye === filters.battleye) &&
        (filters.notes === '' || item.notes?.toLowerCase().includes(filters.notes.toLowerCase()))
      )
    })
  }, [items, filters])

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      const defaultValue = DEFAULT_FILTERS[key]
      return value !== defaultValue
    })
  }, [filters])

  return {
    filters,
    filteredItems,
    hasActiveFilters,
    handleFilterChange,
    clearFilter,
    clearAllFilters
  }
}
