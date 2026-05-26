import { useState, useEffect } from 'react'
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api'

export const useMarketData = () => {
  const [marketData, setMarketData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MARKET_GLOBAL}`)
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
        console.error('Error fetching market data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMarketData()
  }, [])

  return { marketData, loading, error }
}
