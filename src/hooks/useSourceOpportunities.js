import { useEffect, useState } from 'react'
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api'
import { useDebounce } from './useDebounce'

export const useSourceOpportunities = (sourceServerId, enabled, destinationServerId) => {
  const [opportunities, setOpportunities] = useState([])
  const [search, setSearch] = useState('')
  const [minDiscount, setMinDiscount] = useState('20')
  const [minRoi, setMinRoi] = useState('10')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [sortBy, setSortBy] = useState('balanced')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const debouncedSearch = useDebounce(search)

  useEffect(() => {
    if (!sourceServerId || !enabled) {
      setOpportunities([])
      setError(null)
      return
    }

    const controller = new AbortController()
    const fetchOpportunities = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          source_server_id: sourceServerId,
          search: debouncedSearch.trim(),
          min_discount: minDiscount || '0',
          min_roi: minRoi || '0',
          sort_by: sortBy,
          limit: '50',
        })
        if (destinationServerId) {
          params.set('destination_server_id', destinationServerId)
        }
        if (category) {
          params.set('category', category)
        }
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SOURCE_OPPORTUNITIES}?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Failed to scan source opportunities')
        const result = await response.json()
        setOpportunities(result.data?.opportunities || [])
      } catch (err) {
        if (err.name === 'AbortError') return
        setOpportunities([])
        setError(err.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    fetchOpportunities()
    return () => controller.abort()
  }, [category, debouncedSearch, destinationServerId, enabled, minDiscount, minRoi, sortBy, sourceServerId])

  useEffect(() => {
    const controller = new AbortController()
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MARKET_CATEGORIES}`, { signal: controller.signal })
        if (!response.ok) return
        const result = await response.json()
        if (result.success) setCategories(result.data.categories)
      } catch {
        // non-critical, ignore
      }
    }
    fetchCategories()
    return () => controller.abort()
  }, [])

  return {
    opportunities,
    search, setSearch,
    minDiscount, setMinDiscount,
    minRoi, setMinRoi,
    category, setCategory, categories,
    sortBy, setSortBy,
    loading, error,
  }
}
