import { useState, useEffect } from 'react'
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api'

export const useExportOpportunities = (sourceServerId, itemNameFilter = '') => {
  const [opportunities, setOpportunities] = useState([])
  const [sourceServerName, setSourceServerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sourceServerId) {
      setLoading(false)
      return
    }

    const fetchOpportunities = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          source_server_id: sourceServerId
        })
        
        if (itemNameFilter.trim()) {
          params.append('item_name', itemNameFilter.trim())
        }

        const response = await fetch(
          `${API_BASE_URL}${API_ENDPOINTS.EXPORT_OPPORTUNITIES}?${params}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch export opportunities')
        }
        
        const result = await response.json()
        setOpportunities(result.data?.opportunities || [])
        setSourceServerName(result.data?.source_server_name || '')
        setError(null)
      } catch (err) {
        console.error('Error fetching export opportunities:', err)
        setError(err.message)
        setOpportunities([])
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunities()
  }, [sourceServerId, itemNameFilter])

  return { opportunities, sourceServerName, loading, error }
}
