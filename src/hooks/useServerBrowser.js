import { useState, useEffect, useCallback, useMemo } from 'react'
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api'
import { useDebounce } from './useDebounce'

// Order from most permissive (can transfer to most places) to least permissive
// Retro Hardcore can transfer to all below it; Optional can only transfer to Optional
const PVP_ORDER = ['Retro Hardcore PvP', 'Hardcore PvP', 'Retro Open PvP', 'Open PvP', 'Optional PvP']

export const canTransfer = (src, dst) => {
  const srcPvp = PVP_ORDER.indexOf(src.pvp_type)
  const dstPvp = PVP_ORDER.indexOf(dst.pvp_type)
  if (srcPvp === -1 || dstPvp === -1) return false
  // src can only transfer to dst if dst is same or less permissive (higher or equal index)
  if (dstPvp < srcPvp) return false
  if (src.battleye === 'Yellow' && dst.battleye === 'Green') return false
  return true
}

const isTransferCompatible = (home, other) => {
  if (!home || home.id === other.id) return true
  return canTransfer(home, other) || canTransfer(other, home)
}

export const useServerBrowser = () => {
  const [servers, setServers] = useState([])
  const [serversLoading, setServersLoading] = useState(true)
  const [serversError, setServersError] = useState(null)

  const [serverSearch, setServerSearch] = useState('')
  const [pvpType, setPvpType] = useState('')
  const [battleye, setBattleye] = useState('')
  const [myServer, setMyServer] = useState(null)
  const [onlyCompatible, setOnlyCompatible] = useState(false)
  const [excludeBlocked, setExcludeBlocked] = useState(false)

  const [selectedServer, setSelectedServer] = useState(null)

  const [itemSearch, setItemSearch] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [sortBy, setSortBy] = useState('activity')
  const [sortDir, setSortDir] = useState('desc')
  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState(null)

  const [selectedItem, setSelectedItem] = useState(null)

  const debouncedItemSearch = useDebounce(itemSearch)

  useEffect(() => {
    const fetchServers = async () => {
      setServersLoading(true)
      setServersError(null)
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SERVERS}`)
        if (!res.ok) throw new Error('Failed to fetch servers')
        const result = await res.json()
        if (result.success) setServers(result.data.servers)
        else throw new Error('Failed to load servers')
      } catch (err) {
        setServersError(err.message)
      } finally {
        setServersLoading(false)
      }
    }
    fetchServers()
  }, [])

  useEffect(() => {
    fetch(`${API_BASE_URL}${API_ENDPOINTS.MARKET_CATEGORIES}`)
      .then(r => r.json())
      .then(res => { if (res.success) setCategories(res.data.categories) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedServer) return
    if (itemSearch !== debouncedItemSearch) return
    const controller = new AbortController()
    let isActive = true
    setItems([])

    const fetchItems = async () => {
      setItemsLoading(true)
      setItemsError(null)
      try {
        const params = new URLSearchParams({ server_id: selectedServer.id })
        if (debouncedItemSearch) params.set('search', debouncedItemSearch)
        if (category) params.set('category', category)
        params.set('sort_by', sortBy)
        params.set('sort_dir', sortDir)
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MARKET_SERVER_ITEMS}?${params}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch server items')
        const result = await res.json()
        if (!isActive) return
        if (result.success) setItems(result.data.items)
        else throw new Error('Failed to load server items')
      } catch (err) {
        if (!isActive || err.name === 'AbortError') return
        setItemsError(err.message)
      } finally {
        if (isActive) setItemsLoading(false)
      }
    }

    fetchItems()
    return () => {
      isActive = false
      controller.abort()
    }
  }, [selectedServer, itemSearch, debouncedItemSearch, category, sortBy, sortDir])

  const selectServer = useCallback((server) => {
    setSelectedServer(server)
    setSelectedItem(null)
    setItems([])
    setItemSearch('')
    setCategory('')
  }, [])

  const handleSort = useCallback((col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }, [sortBy])

  const filteredServers = useMemo(() => {
    return servers.filter(s => {
      if (serverSearch && !s.name.toLowerCase().includes(serverSearch.toLowerCase())) return false
      if (pvpType && s.pvp_type !== pvpType) return false
      if (battleye && s.battleye !== battleye) return false
      if (excludeBlocked && s.notes === 'blocked') return false
      if (onlyCompatible && myServer && !isTransferCompatible(myServer, s)) return false
      return true
    })
  }, [servers, serverSearch, pvpType, battleye, excludeBlocked, onlyCompatible, myServer])

  return {
    servers,
    filteredServers, serversLoading, serversError,
    serverSearch, setServerSearch,
    pvpType, setPvpType,
    battleye, setBattleye,
    myServer, setMyServer,
    onlyCompatible, setOnlyCompatible,
    excludeBlocked, setExcludeBlocked,
    selectedServer, selectServer,
    items, itemsLoading, itemsError,
    itemSearch, setItemSearch,
    category, setCategory,
    categories,
    sortBy, sortDir, handleSort,
    selectedItem, setSelectedItem,
  }
}
