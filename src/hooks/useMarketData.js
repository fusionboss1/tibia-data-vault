import { useState, useEffect } from 'react'
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api'

export const useMarketData = ({ pvpType = '', battleye = '', excludeBlocked = false } = {}) => {
  const [marketData, setMarketData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const [debouncedFilters, setDebouncedFilters] = useState({ pvpType, battleye, excludeBlocked })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters({ pvpType, battleye, excludeBlocked }), 300)
    return () => clearTimeout(t)
  }, [pvpType, battleye, excludeBlocked])

  useEffect(() => {
    const { pvpType: dPvp, battleye: dBe, excludeBlocked: dEx } = debouncedFilters
    const controller = new AbortController()

    const fetchMarketData = async () => {
      if (marketData) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      try {
        const params = new URLSearchParams()
        if (dPvp) params.set('pvp_type', dPvp)
        if (dBe) params.set('battleye', dBe)
        if (dEx) params.set('exclude_blocked', 'true')
        const query = params.toString() ? `?${params.toString()}` : ''
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MARKET_GLOBAL}${query}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Failed to fetch market data')
        }
        const result = await response.json()

        if (result.success) {
          setMarketData(result.data)
          setError(null)
        } else {
          throw new Error('Failed to load market data')
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Error fetching market data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    fetchMarketData()
    return () => controller.abort()
  }, [debouncedFilters])

  return { marketData, loading, refreshing, error }
}
