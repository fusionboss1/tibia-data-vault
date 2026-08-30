import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api'
import { useDebounce } from './useDebounce'

const PAGE_SIZE = 100

export const useMarketBrowser = (mode = 'global') => {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [pvpType, setPvpType] = useState('')
  const [battleye, setBattleye] = useState('')
  const [excludeBlocked, setExcludeBlocked] = useState(false)
  const [yasirOnly, setYasirOnly] = useState(false)
  const [sortBy, setSortBy] = useState('top_activity')
  const [sortDir, setSortDir] = useState('desc')
  const [offset, setOffset] = useState(0)

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [categories, setCategories] = useState([])

  const [selectedItem, setSelectedItem] = useState(null)
  const [serverData, setServerData] = useState([])
  const [serverLoading, setServerLoading] = useState(false)
  const [serverError, setServerError] = useState(null)

  const debouncedSearch = useDebounce(search)

  useEffect(() => { setOffset(0) }, [search])

  useEffect(() => { setOffset(0) }, [category, pvpType, battleye, excludeBlocked, yasirOnly, sortBy, sortDir])

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    const fetchItems = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (debouncedSearch) params.set('search', debouncedSearch)
        if (category) params.set('category', category)
        if (pvpType) params.set('pvp_type', pvpType)
        if (battleye) params.set('battleye', battleye)
        if (excludeBlocked) params.set('exclude_blocked', 'true')
        if (yasirOnly) params.set('yasir_only', 'true')
        params.set('mode', mode)
        params.set('sort_by', sortBy)
        params.set('sort_dir', sortDir)
        params.set('limit', PAGE_SIZE)
        params.set('offset', offset)

        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MARKET_BROWSE}?${params}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch market items')
        const result = await res.json()
        if (!isActive) return
        if (result.success) {
          setItems(result.data.items)
          setTotal(result.data.total)
        } else {
          throw new Error('Failed to load market items')
        }
      } catch (err) {
        if (!isActive || err.name === 'AbortError') return
        setError(err.message)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    fetchItems()
    return () => {
      isActive = false
      controller.abort()
    }
  }, [debouncedSearch, category, pvpType, battleye, excludeBlocked, yasirOnly, sortBy, sortDir, offset, mode])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MARKET_CATEGORIES}`)
        if (!res.ok) return
        const result = await res.json()
        if (result.success) setCategories(result.data.categories)
      } catch {
        // non-critical, ignore
      }
    }
    fetchCategories()
  }, [])

  const selectItem = useCallback((item) => {
    setSelectedItem(item)
    setServerError(null)
  }, [])

  useEffect(() => {
    if (!selectedItem) return
    const controller = new AbortController()
    let isActive = true
    setServerData([])

    const fetchServers = async () => {
      setServerLoading(true)
      setServerError(null)
      try {
        const params = new URLSearchParams({ item_id: selectedItem.item_id })
        if (pvpType) params.set('pvp_type', pvpType)
        if (battleye) params.set('battleye', battleye)
        if (excludeBlocked) params.set('exclude_blocked', 'true')
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MARKET_ITEM_SERVERS}?${params}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch server data')
        const result = await res.json()
        if (!isActive) return
        if (result.success) setServerData(result.data.servers)
        else throw new Error('Failed to load server data')
      } catch (err) {
        if (!isActive || err.name === 'AbortError') return
        setServerError(err.message)
      } finally {
        if (isActive) setServerLoading(false)
      }
    }

    fetchServers()
    return () => {
      isActive = false
      controller.abort()
    }
  }, [selectedItem, pvpType, battleye, excludeBlocked])

  const filteredStats = serverData.length > 0 ? (() => {
    const buys = serverData.map(s => s.buy_offer).filter(v => v > 0)
    const sells = serverData.map(s => s.sell_offer).filter(v => v > 0)
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
    const topActivity = serverData.reduce((max, s) => Math.max(max, s.buy_offers + s.sell_offers), 0)
    return {
      global_avg_buy: avg(buys),
      global_avg_sell: avg(sells),
      active_servers: serverData.length,
      top_activity: topActivity,
    }
  })() : null

  const handleSort = useCallback((col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }, [sortBy])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return {
    search, setSearch,
    category, setCategory,
    pvpType, setPvpType,
    battleye, setBattleye,
    excludeBlocked, setExcludeBlocked,
    yasirOnly, setYasirOnly,
    sortBy, sortDir, handleSort,
    offset, setOffset,
    items, total, loading, error,
    categories,
    selectedItem, selectItem,
    serverData, serverLoading, serverError,
    filteredStats,
    PAGE_SIZE, totalPages, currentPage,
  }
}
