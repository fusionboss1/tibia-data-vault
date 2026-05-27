import { useState, useEffect } from 'react'
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api'

export const useWeeklyDeliveryItems = (serverId, search = '') => {
  const [deliveryItems, setDeliveryItems] = useState([])
  const [serverName, setServerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDeliveryItems = async () => {
      setLoading(true)
      setServerName('')

      try {
        const params = new URLSearchParams({})

        if (serverId) {
          params.append('server_id', serverId)
        }

        if (search.trim()) {
          params.append('search', search.trim())
        }

        const query = params.toString()
        const response = await fetch(
          `${API_BASE_URL}${API_ENDPOINTS.DELIVERY_ITEMS}${query ? `?${query}` : ''}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch weekly delivery items')
        }

        const result = await response.json()
        setDeliveryItems(result.data?.delivery_items || [])
        setServerName(result.data?.server_name || '')
        setError(null)
      } catch (err) {
        console.error('Error fetching weekly delivery items:', err)
        setError(err.message)
        setDeliveryItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchDeliveryItems()
  }, [serverId, search])

  return { deliveryItems, serverName, loading, error }
}
