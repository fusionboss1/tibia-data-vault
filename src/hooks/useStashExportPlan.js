import { useState, useEffect, useMemo } from 'react'
import { useDebounce } from './useDebounce'
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api'

export const useStashExportPlan = (minCoverage = 0, battleyeFilter = 'all', selectedItems = null, sourceServerId = null) => {
  const [servers, setServers] = useState([])
  const [topServerItems, setTopServerItems] = useState([])
  const [transferCostGold, setTransferCostGold] = useState(0)
  const [tibiaCoinPrice, setTibiaCoinPrice] = useState(0)
  const [totalStashItems, setTotalStashItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const selectedItemsKey = useMemo(
    () => (selectedItems === null ? null : JSON.stringify(selectedItems)),
    [selectedItems]
  )

  const debouncedKey = useDebounce(selectedItemsKey)

  useEffect(() => {
    const controller = new AbortController()
    const parsedItems = debouncedKey === null ? null : JSON.parse(debouncedKey)

    const fetchStashPlan = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (minCoverage > 0) {
          params.append('min_coverage', minCoverage)
        }
        if (battleyeFilter && battleyeFilter !== 'all') {
          params.append('battleye_filter', battleyeFilter)
        }
        if (sourceServerId) {
          params.append('source_server_id', sourceServerId)
        }

        // Use POST if we have selected items (array with items), otherwise GET
        // null = all items, [] = no items (should also use POST with empty array)
        const url = `${API_BASE_URL}${API_ENDPOINTS.EXPORT_STASH_PLAN}?${params}`
        const options = parsedItems !== null ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selected_items: parsedItems, source_server_id: sourceServerId }),
          signal: controller.signal,
        } : {
          method: 'GET',
          signal: controller.signal,
        }

        const response = await fetch(url, options)

        if (!response.ok) {
          throw new Error('Failed to fetch stash export plan')
        }

        const result = await response.json()
        setServers(result.data?.servers || [])
        setTopServerItems(result.data?.top_server_items || [])
        setTransferCostGold(result.data?.transfer_cost_gold || 0)
        setTibiaCoinPrice(result.data?.tibia_coins_price || 0)
        setTotalStashItems(result.data?.total_stash_items || 0)
        setError(null)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Error fetching stash export plan:', err)
        setError(err.message)
        setServers([])
        setTopServerItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchStashPlan()
    return () => controller.abort()
  }, [minCoverage, battleyeFilter, debouncedKey, sourceServerId])

  return { 
    servers, 
    topServerItems, 
    transferCostGold, 
    tibiaCoinPrice,
    totalStashItems,
    loading, 
    error 
  }
}
