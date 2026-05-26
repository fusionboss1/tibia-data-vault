import { useState, useEffect } from 'react'
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api'

export const useServers = () => {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SERVERS}`)
        if (!response.ok) {
          throw new Error('Failed to fetch servers')
        }
        const data = await response.json()
        const serversArray = data.data?.servers || data
        setServers(serversArray)
        setError(null)
      } catch (err) {
        console.error('Error fetching servers:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchServers()
  }, [])

  return { servers, loading, error }
}
