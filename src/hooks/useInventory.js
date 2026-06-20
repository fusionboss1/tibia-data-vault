import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api'

export const useInventory = () => {
  const [inventory, setInventory] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [grandTotalValue, setGrandTotalValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [logText, setLogText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState(null)

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedServerId, setSelectedServerId] = useState('')
  const [weeklyOnly, setWeeklyOnly] = useState(false)
  const [priceFilter, setPriceFilter] = useState('opt_pvp')

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    setError(null)
    const controller = new AbortController()
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.set('category', selectedCategory)
      if (selectedServerId) params.set('server_id', selectedServerId)
      if (weeklyOnly) params.set('weekly_only', '1')
      if (priceFilter !== 'all') params.set('price_filter', priceFilter)
      const res = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.INVENTORY}?${params}`,
        { signal: controller.signal }
      )
      const json = await res.json()
      if (json.success) {
        setInventory(json.data.inventory)
        setTotal(json.data.total_items)
        setGrandTotalValue(json.data.grand_total_value || 0)
      } else {
        setError(json.error || 'Failed to load inventory')
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setError('Could not reach the API')
    } finally {
      setLoading(false)
    }
    return () => controller.abort()
  }, [selectedCategory, selectedServerId, weeklyOnly, priceFilter])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.INVENTORY_CATEGORIES}`)
      const json = await res.json()
      if (json.success) setCategories(json.data.categories)
    } catch {
      // non-critical
    }
  }, [])

  useEffect(() => { fetchInventory() }, [fetchInventory])
  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleImport = async () => {
    if (!logText.trim()) return
    setImporting(true)
    setImportResult(null)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.INVENTORY_IMPORT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_text: logText })
      })
      const json = await res.json()
      if (json.success) {
        setImportResult(json.data)
        setLogText('')
        setShowImport(false)
        await fetchInventory()
        await fetchCategories()
      } else {
        setError(json.error || 'Import failed')
      }
    } catch {
      setError('Could not reach the API')
    } finally {
      setImporting(false)
    }
  }

  return {
    inventory, categories,
    total, grandTotalValue,
    loading, importing,
    logText, setLogText,
    showImport, setShowImport,
    importResult, setImportResult,
    error, setError,
    selectedCategory, setSelectedCategory,
    selectedServerId, setSelectedServerId,
    weeklyOnly, setWeeklyOnly,
    priceFilter, setPriceFilter,
    fetchInventory, handleImport,
  }
}
