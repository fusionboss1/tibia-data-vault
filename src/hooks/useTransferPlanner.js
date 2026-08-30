import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api'
import { useDebounce } from './useDebounce'

const toNumber = (value) => Number(value) || 0

const getTcPrice = async (serverId, signal) => {
  if (!serverId) return ''
  const params = new URLSearchParams({ server_id: serverId, search: 'Tibia Coin', sort_by: 'name', sort_dir: 'asc' })
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MARKET_SERVER_ITEMS}?${params}`, { signal })
  if (!response.ok) throw new Error('Failed to load Tibia Coin price')
  const result = await response.json()
  const coin = result.data?.items?.find(item => item.name.toLowerCase().includes('tibia coin'))
  return coin?.sell_offer || coin?.buy_offer || ''
}

const getItemMarkets = async (itemId, signal) => {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MARKET_ITEM_SERVERS}?item_id=${itemId}`, { signal })
  if (!response.ok) return []
  const result = await response.json()
  return result.data?.servers || []
}

export const useTransferPlanner = () => {
  const [sourceServerId, setSourceServerId] = useState('')
  const [destinationServerId, setDestinationServerId] = useState('')
  const [sourceTcPrice, setSourceTcPrice] = useState('')
  const [destinationTcPrice, setDestinationTcPrice] = useState('')
  const [transferCost, setTransferCost] = useState('750')
  const [items, setItems] = useState([])
  const [itemSearch, setItemSearch] = useState('')
  const [itemResults, setItemResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [addingItemId, setAddingItemId] = useState(null)
  const [planId, setPlanId] = useState(null)
  const [planName, setPlanName] = useState('Untitled transfer')
  const [planStatus, setPlanStatus] = useState('draft')
  const [savedPlans, setSavedPlans] = useState([])
  const [saving, setSaving] = useState(false)
  const [persistenceError, setPersistenceError] = useState(null)
  const loadingPlanRef = useRef(false)
  const debouncedSearch = useDebounce(itemSearch)
  const itemIds = useMemo(() => items.map(item => item.itemId).join(','), [items])

  const refreshSavedPlans = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TRANSFERS}`)
    if (!response.ok) throw new Error('Failed to load saved transfer plans')
    const result = await response.json()
    setSavedPlans(result.data?.plans || [])
  }, [])

  useEffect(() => {
    refreshSavedPlans().catch(error => setPersistenceError(error.message))
  }, [refreshSavedPlans])

  useEffect(() => {
    if (loadingPlanRef.current) return
    const controller = new AbortController()
    getTcPrice(sourceServerId, controller.signal)
      .then(setSourceTcPrice)
      .catch(error => { if (error.name !== 'AbortError') setSourceTcPrice('') })
    return () => controller.abort()
  }, [sourceServerId])

  useEffect(() => {
    if (loadingPlanRef.current) return
    const controller = new AbortController()
    getTcPrice(destinationServerId, controller.signal)
      .then(setDestinationTcPrice)
      .catch(error => { if (error.name !== 'AbortError') setDestinationTcPrice('') })
    return () => controller.abort()
  }, [destinationServerId])

  useEffect(() => {
    if (debouncedSearch.trim().length < 2) {
      setItemResults([])
      setSearchError(null)
      return
    }

    const controller = new AbortController()
    const fetchItems = async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const params = new URLSearchParams({ search: debouncedSearch.trim(), limit: '8' })
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ITEMS}?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Failed to search items')
        const result = await response.json()
        setItemResults(result.data?.items || [])
      } catch (error) {
        if (error.name === 'AbortError') return
        setItemResults([])
        setSearchError(error.message)
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }
    fetchItems()
    return () => controller.abort()
  }, [debouncedSearch])

  useEffect(() => {
    if (!itemIds) return
    setItems(current => current.map(item => {
      const sourceMarket = item.marketServers?.find(server => String(server.server_id) === String(sourceServerId))
      const destinationMarket = item.marketServers?.find(server => String(server.server_id) === String(destinationServerId))
      return {
        ...item,
        marketSourceServerId: sourceServerId,
        marketDestinationServerId: destinationServerId,
        sourceMarketPrice: sourceMarket?.sell_offer || 0,
        destinationBuyOffer: destinationMarket?.buy_offer || 0,
        destinationSellOffer: destinationMarket?.sell_offer || 0,
      }
    }))
  }, [destinationServerId, itemIds, sourceServerId])

  const addItem = useCallback(async (item, options = {}) => {
    if (items.some(entry => entry.itemId === item.id)) return
    setAddingItemId(item.id)
    let marketServers = []
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MARKET_ITEM_SERVERS}?item_id=${item.id}`)
      if (response.ok) {
        const result = await response.json()
        marketServers = result.data?.servers || []
      }
    } catch {
      marketServers = []
    } finally {
      const sourceMarket = marketServers.find(server => String(server.server_id) === String(sourceServerId))
      const destinationMarket = marketServers.find(server => String(server.server_id) === String(destinationServerId))
      setItems(current => [...current, {
        itemId: item.id,
        name: item.name,
        category: item.category,
        quantity: '1',
        purchasePrice: options.purchasePrice ?? (item.best_npc_buy_price || ''),
        expectedSalePrice: options.expectedSalePrice ?? destinationMarket?.sell_offer ?? '',
        actualSalePrice: '',
        soldQuantity: '0',
        saleStatus: 'planned',
        notes: '',
        marketServers,
        marketSourceServerId: sourceServerId,
        marketDestinationServerId: destinationServerId,
        sourceMarketPrice: sourceMarket?.sell_offer || 0,
        destinationBuyOffer: destinationMarket?.buy_offer || 0,
        destinationSellOffer: destinationMarket?.sell_offer || 0,
      }])
      setItemSearch('')
      setItemResults([])
      setAddingItemId(null)
    }
  }, [destinationServerId, items, sourceServerId])

  const updateItem = useCallback((itemId, field, value) => {
    setItems(current => current.map(item => item.itemId === itemId ? { ...item, [field]: value } : item))
  }, [])

  const removeItem = useCallback((itemId) => {
    setItems(current => current.filter(item => item.itemId !== itemId))
  }, [])

  const applyDestinationStrategy = useCallback((serverId, mode) => {
    setDestinationServerId(String(serverId))
    setItems(current => current.map(item => {
      const market = item.marketServers?.find(server => server.server_id === serverId)
      return {
        ...item,
        expectedSalePrice: String(mode === 'instant' ? market?.buy_offer || '' : market?.sell_offer || ''),
      }
    }))
  }, [])

  const savePlan = useCallback(async () => {
    if (!sourceServerId) throw new Error('Select a source world before saving')
    setSaving(true)
    setPersistenceError(null)
    try {
      const payload = {
        name: planName.trim() || 'Untitled transfer',
        status: planStatus,
        source_server_id: Number(sourceServerId),
        destination_server_id: destinationServerId ? Number(destinationServerId) : null,
        source_tc_price: toNumber(sourceTcPrice),
        destination_tc_price: toNumber(destinationTcPrice),
        transfer_cost: toNumber(transferCost),
        items: items.map(item => ({
          item_id: item.itemId,
          quantity: Math.max(0, Math.floor(toNumber(item.quantity))),
          purchase_price: toNumber(item.purchasePrice),
          expected_sale_price: toNumber(item.expectedSalePrice),
          actual_sale_price: toNumber(item.actualSalePrice),
          sold_quantity: Math.max(0, Math.min(Math.floor(toNumber(item.soldQuantity)), Math.floor(toNumber(item.quantity)))),
          sale_status: item.saleStatus || 'planned',
          source_market_price: toNumber(item.sourceMarketPrice),
          destination_buy_offer: toNumber(item.destinationBuyOffer),
          destination_sell_offer: toNumber(item.destinationSellOffer),
          notes: item.notes || '',
        })),
      }
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TRANSFERS}${planId ? `/${planId}` : ''}`, {
        method: planId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('Failed to save transfer plan')
      const result = await response.json()
      setPlanId(result.data.plan.id)
      await refreshSavedPlans()
      return result.data.plan
    } catch (error) {
      setPersistenceError(error.message)
      throw error
    } finally {
      setSaving(false)
    }
  }, [destinationServerId, destinationTcPrice, items, planId, planName, planStatus, refreshSavedPlans, sourceServerId, sourceTcPrice, transferCost])

  const loadPlan = useCallback(async (id) => {
    setPersistenceError(null)
    loadingPlanRef.current = true
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TRANSFERS}/${id}`)
    if (!response.ok) {
      loadingPlanRef.current = false
      throw new Error('Failed to load transfer plan')
    }
    const result = await response.json()
    const plan = result.data.plan
    const loadedItems = await Promise.all(plan.items.map(async item => ({
      itemId: item.item_id,
      name: item.item_name,
      category: item.item_category,
      quantity: String(item.quantity),
      purchasePrice: item.purchase_price ? String(item.purchase_price) : '',
      expectedSalePrice: item.expected_sale_price ? String(item.expected_sale_price) : '',
      actualSalePrice: item.actual_sale_price ? String(item.actual_sale_price) : '',
      soldQuantity: String(item.sold_quantity),
      saleStatus: item.sale_status,
      notes: item.notes || '',
      marketServers: await getItemMarkets(item.item_id).catch(() => []),
      sourceMarketPrice: item.source_market_price,
      destinationBuyOffer: item.destination_buy_offer,
      destinationSellOffer: item.destination_sell_offer,
    })))
    setPlanId(plan.id)
    setPlanName(plan.name)
    setPlanStatus(plan.status)
    setSourceServerId(String(plan.source_server_id))
    setDestinationServerId(plan.destination_server_id ? String(plan.destination_server_id) : '')
    setSourceTcPrice(plan.source_tc_price ? String(plan.source_tc_price) : '')
    setDestinationTcPrice(plan.destination_tc_price ? String(plan.destination_tc_price) : '')
    setTransferCost(String(plan.transfer_cost))
    setItems(loadedItems)
    setTimeout(() => { loadingPlanRef.current = false }, 0)
  }, [])

  const newPlan = useCallback(() => {
    setPlanId(null)
    setPlanName('Untitled transfer')
    setPlanStatus('draft')
    setSourceServerId('')
    setDestinationServerId('')
    setSourceTcPrice('')
    setDestinationTcPrice('')
    setTransferCost('750')
    setItems([])
    setPersistenceError(null)
  }, [])

  const totals = useMemo(() => {
    const sourceTc = toNumber(sourceTcPrice)
    const destinationTc = toNumber(destinationTcPrice)
    const itemCostGold = items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.purchasePrice), 0)
    const expectedRevenueGold = items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.expectedSalePrice), 0)
    const realizedRevenueGold = items.reduce((sum, item) => sum + toNumber(item.soldQuantity) * toNumber(item.actualSalePrice), 0)
    const itemCostTc = sourceTc ? itemCostGold / sourceTc : 0
    const expectedRevenueTc = destinationTc ? expectedRevenueGold / destinationTc : 0
    const realizedRevenueTc = destinationTc ? realizedRevenueGold / destinationTc : 0
    const totalCostTc = itemCostTc + toNumber(transferCost)
    const expectedProfitTc = expectedRevenueTc - totalCostTc
    const realizedProfitTc = realizedRevenueTc - totalCostTc
    return {
      itemCostGold,
      itemCostTc,
      expectedRevenueGold,
      expectedRevenueTc,
      realizedRevenueGold,
      realizedRevenueTc,
      totalCostTc,
      expectedProfitTc,
      realizedProfitTc,
      margin: totalCostTc ? expectedProfitTc / totalCostTc * 100 : 0,
    }
  }, [destinationTcPrice, items, sourceTcPrice, transferCost])

  return {
    sourceServerId, setSourceServerId,
    destinationServerId, setDestinationServerId,
    sourceTcPrice, setSourceTcPrice,
    destinationTcPrice, setDestinationTcPrice,
    transferCost, setTransferCost,
    planId, planName, setPlanName, planStatus, setPlanStatus,
    savedPlans, saving, persistenceError,
    items, itemSearch, setItemSearch, itemResults, searching, searchError, addingItemId,
    addItem, updateItem, removeItem, applyDestinationStrategy,
    savePlan, loadPlan, newPlan, totals,
  }
}
