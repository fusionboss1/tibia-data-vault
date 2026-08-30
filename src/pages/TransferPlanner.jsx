import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { ArrowRightLeft, CheckCircle2, AlertTriangle, ChevronDown, Database, FilePlus, Globe, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react'
import { useServersContext } from '../contexts/ServersContext'
import { canTransfer } from '../hooks/useServerBrowser'
import { useTransferPlanner } from '../hooks/useTransferPlanner'
import { useSourceOpportunities } from '../hooks/useSourceOpportunities'
import { formatPrice } from '../utils/formatters'
import ErrorMessage from '../components/common/ErrorMessage'

const inputClass = 'w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
const tableInputClass = 'w-full bg-gray-700 border border-gray-600 px-1.5 py-0.5 text-right text-[11px] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
const labelClass = 'block text-[11px] font-medium text-gray-400 mb-1'

const formatTc = value => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value || 0)} TC`

function SummaryCard({ label, primary, secondary, tone = 'default' }) {
  const tones = {
    default: 'border-gray-700',
    positive: 'border-emerald-700 bg-emerald-950/20',
    negative: 'border-red-700 bg-red-950/20',
  }
  return (
    <div className={`rounded-lg border bg-gray-800 p-2.5 ${tones[tone]}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-sm font-bold ${tone === 'positive' ? 'text-emerald-400' : tone === 'negative' ? 'text-red-400' : 'text-white'}`}>{primary}</p>
      <p className="mt-0.5 text-[10px] text-gray-500">{secondary}</p>
    </div>
  )
}

function ServerField({ label, value, onChange, servers, loading, excludeId }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select value={value} onChange={event => onChange(event.target.value)} disabled={loading} className={inputClass}>
        <option value="">Select a world</option>
        {servers.filter(server => String(server.id) !== String(excludeId)).map(server => (
          <option key={server.id} value={server.id}>{server.name} · {server.pvp_type} · {server.battleye}</option>
        ))}
      </select>
    </div>
  )
}

function BasketDestinationRanking({ items, source, servers, sourceTcPrice, transferCost, onApply }) {
  const rankings = useMemo(() => {
    if (!source || !sourceTcPrice || items.length === 0) return []
    const itemCostTc = items.reduce((sum, item) => {
      const price = Number(item.purchasePrice) || Number(item.sourceMarketPrice) || 0
      return sum + (Number(item.quantity) || 0) * price / Number(sourceTcPrice)
    }, 0)
    const totalCostTc = itemCostTc + (Number(transferCost) || 0)

    return servers.flatMap(server => {
      if (server.id === source.id || server.notes === 'blocked' || !canTransfer(source, server)) return []
      let instantRevenueTc = 0
      let projectedRevenueTc = 0
      let balancedRevenueTc = 0
      let instantCoverage = 0
      let projectedCoverage = 0
      let activity = 0

      items.forEach(item => {
        const market = item.marketServers?.find(entry => entry.server_id === server.id)
        const tcPrice = Number(market?.tc_sell_price) || 0
        const quantity = Number(item.quantity) || 0
        if (!market || !tcPrice) return
        if (market.buy_offer > 0) {
          instantRevenueTc += quantity * market.buy_offer / tcPrice
          instantCoverage += 1
        }
        if (market.sell_offer > 0) {
          projectedRevenueTc += quantity * market.sell_offer / tcPrice
          projectedCoverage += 1
        }
        balancedRevenueTc += quantity * (market.buy_offer > 0 ? market.buy_offer : market.sell_offer * 0.65) / tcPrice
        activity += (Number(market.buy_offers) || 0) + (Number(market.sell_offers) || 0)
      })

      const coverage = Math.max(instantCoverage, projectedCoverage) / items.length
      const confidence = Math.min(1, Math.log1p(activity) / Math.log(51))
      const instantProfitTc = instantRevenueTc - totalCostTc
      const projectedProfitTc = projectedRevenueTc - totalCostTc
      const balancedProfitTc = balancedRevenueTc - totalCostTc
      return [{
        server,
        totalCostTc,
        instantRevenueTc,
        projectedRevenueTc,
        instantProfitTc,
        projectedProfitTc,
        instantCoverage,
        projectedCoverage,
        activity,
        score: balancedProfitTc * (0.4 + coverage * 0.4 + confidence * 0.2),
      }]
    }).sort((a, b) => b.score - a.score)
  }, [items, servers, source, sourceTcPrice, transferCost])

  const bestInstant = [...rankings].sort((a, b) => b.instantProfitTc - a.instantProfitTc)[0]
  const bestProjected = [...rankings].sort((a, b) => b.projectedProfitTc - a.projectedProfitTc)[0]
  const bestBalanced = rankings[0]

  if (rankings.length === 0) return <div className="p-8 text-center text-sm text-gray-400">No compatible basket destinations have market data.</div>

  return (
    <div className="border-t border-gray-700 bg-gray-900/40 p-3">
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-white">Best destination for the complete basket</h3>
        <p className="mt-0.5 text-[11px] text-gray-500">Profit includes the transfer cost once. Items without Paid each use the source market as an estimate; missing destination prices produce zero revenue.</p>
      </div>
      <div className="max-h-[420px] overflow-auto rounded-lg border border-gray-700">
        <table className="w-full min-w-[950px] text-xs">
          <thead className="sticky top-0 z-10 bg-gray-700 text-left text-[11px] uppercase tracking-wide text-gray-400"><tr><th className="px-2 py-1.5">World</th><th className="px-2 py-1.5 text-right">Instant result</th><th className="px-2 py-1.5 text-right">Projected result</th><th className="px-2 py-1.5 text-right">Coverage</th><th className="px-2 py-1.5 text-right">Activity</th><th className="px-2 py-1.5 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-700">
            {rankings.map(entry => {
              const badges = []
              if (entry === bestInstant) badges.push('Best instant')
              if (entry === bestProjected) badges.push('Best projected')
              if (entry === bestBalanced) badges.push('Best balanced')
              return (
                <tr key={entry.server.id} className="hover:bg-gray-700/40">
                  <td className="px-2 py-1.5"><div className="font-medium text-white">{entry.server.name}</div><div className="mt-0.5 flex flex-wrap gap-1">{badges.map(badge => <span key={badge} className="rounded bg-blue-500/15 px-1 py-0.5 text-[9px] font-medium text-blue-300">{badge}</span>)}</div><div className="mt-0.5 text-[11px] text-gray-500">{entry.server.pvp_type} · {entry.server.battleye}</div></td>
                  <td className="px-2 py-1.5 text-right"><div className={entry.instantProfitTc >= 0 ? 'font-medium text-emerald-400' : 'font-medium text-red-400'}>{formatTc(entry.instantProfitTc)}</div><div className="text-[11px] text-gray-500">Revenue {formatTc(entry.instantRevenueTc)}</div></td>
                  <td className="px-2 py-1.5 text-right"><div className={entry.projectedProfitTc >= 0 ? 'font-medium text-emerald-400' : 'font-medium text-red-400'}>{formatTc(entry.projectedProfitTc)}</div><div className="text-[11px] text-gray-500">Revenue {formatTc(entry.projectedRevenueTc)}</div></td>
                  <td className="px-2 py-1.5 text-right"><div className="text-gray-300">Buy {entry.instantCoverage}/{items.length}</div><div className="text-[11px] text-gray-500">Sell {entry.projectedCoverage}/{items.length}</div></td>
                  <td className="px-2 py-1.5 text-right text-gray-300">{entry.activity}<div className="text-[9px] text-gray-500">offers</div></td>
                  <td className="px-2 py-1.5"><div className="flex justify-end gap-1.5"><button onClick={() => onApply(entry.server.id, 'instant')} disabled={!entry.instantCoverage} className="rounded-md border border-gray-600 px-1.5 py-0.5 text-[11px] text-gray-300 hover:border-emerald-600 hover:text-emerald-300 disabled:opacity-40">Use instant</button><button onClick={() => onApply(entry.server.id, 'projected')} disabled={!entry.projectedCoverage} className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-blue-500 disabled:opacity-40">Use projected</button></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SourceOpportunityScanner({ source, destination, plannedItemIds, onAdd, onSelectDestination }) {
  const filterToDestination = Boolean(source && destination)
  const scanner = useSourceOpportunities(source?.id, true, filterToDestination ? destination.id : null)

  return (
    <section className="mb-3 overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
      <div className="border-b border-gray-700 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">Source opportunities</h2>
            <p className="mt-0.5 text-[11px] text-gray-500">
              {filterToDestination
                ? `Showing only opportunities from ${source.name} to ${destination.name}.`
                : `Items priced below the median sell price across destinations that ${source?.name} can legally reach.`}
            </p>
          </div>
          {scanner.loading && <div className="flex items-center gap-2 text-[11px] text-blue-300"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning market data</div>}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_140px_140px_150px_190px]">
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-500" />
            <input value={scanner.search} onChange={event => scanner.setSearch(event.target.value)} placeholder="Filter opportunities…" className={`${inputClass} pl-7`} />
          </div>
          <div><label className={labelClass}>Min. discount %</label><input type="number" min="0" value={scanner.minDiscount} onChange={event => scanner.setMinDiscount(event.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Min. ROI %</label><input type="number" value={scanner.minRoi} onChange={event => scanner.setMinRoi(event.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Category</label><select value={scanner.category} onChange={event => scanner.setCategory(event.target.value)} className={inputClass}><option value="">All categories</option>{scanner.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
          <div><label className={labelClass}>Rank by</label><select value={scanner.sortBy} onChange={event => scanner.setSortBy(event.target.value)} className={inputClass}><option value="balanced">Balanced</option><option value="instant_profit">Instant profit</option><option value="projected_profit">Projected profit</option><option value="instant_roi">Instant ROI</option><option value="projected_roi">Projected ROI</option><option value="discount">Source discount</option><option value="activity">Market activity</option></select></div>
        </div>
      </div>

      {scanner.error ? <div className="p-3"><ErrorMessage message={scanner.error} /></div> : scanner.opportunities.length === 0 && !scanner.loading ? (
        <div className="p-6 text-center text-xs text-gray-400">No opportunities match the current thresholds.</div>
      ) : (
        <div className="max-h-[460px] overflow-auto">
          <table className="w-full min-w-[1050px] text-xs">
            <thead className="sticky top-0 z-10 bg-gray-700 text-left text-[11px] uppercase tracking-wide text-gray-400">
              <tr><th className="px-3 py-1.5">Item</th><th className="px-2 py-1.5 text-right">Source</th><th className="px-2 py-1.5 text-right">Compatible median</th><th className="px-2 py-1.5">Best instant</th><th className="px-2 py-1.5">Best projected</th><th className="px-2 py-1.5 text-right">Coverage</th><th className="px-2 py-1.5 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {scanner.opportunities.map(opportunity => {
                const isPlanned = plannedItemIds.includes(opportunity.item_id)
                return (
                  <tr key={opportunity.item_id} className="hover:bg-gray-750/50">
                    <td className="px-3 py-1.5"><div className="font-medium text-white">{opportunity.item_name}</div><div className="mt-0.5 text-[11px] text-gray-500">{opportunity.item_category} · {opportunity.discount_pct.toFixed(1)}% below compatible median</div></td>
                    <td className="px-2 py-1.5 text-right"><div className="text-white">{formatPrice(opportunity.source_price)} gp</div><div className="text-[11px] text-gray-500">{opportunity.source_sell_offers} sell offers</div></td>
                    <td className="px-2 py-1.5 text-right text-gray-300">{formatPrice(opportunity.compatible_median_sell)} gp</td>
                    <td className="px-2 py-1.5"><div className="font-medium text-emerald-400">{opportunity.best_instant.server_name}</div><div className="text-[11px] text-gray-400">{formatPrice(opportunity.best_instant.buy_offer)} gp · {formatTc(opportunity.best_instant.instant_profit_tc)} / unit</div><div className={`text-[11px] ${opportunity.best_instant.instant_roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{opportunity.best_instant.instant_roi.toFixed(1)}% ROI</div></td>
                    <td className="px-2 py-1.5"><div className="font-medium text-blue-300">{opportunity.best_projected.server_name}</div><div className="text-[11px] text-gray-400">{formatPrice(opportunity.best_projected.sell_offer)} gp · {formatTc(opportunity.best_projected.projected_profit_tc)} / unit</div><div className={`text-[11px] ${opportunity.best_projected.projected_roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{opportunity.best_projected.projected_roi.toFixed(1)}% ROI</div></td>
                    <td className="px-2 py-1.5 text-right"><div className="text-gray-300">{opportunity.destination_count} worlds</div><div className="text-[11px] text-gray-500">{opportunity.total_activity} offers</div></td>
                    <td className="px-2 py-1.5">
                      <div className="flex justify-end gap-1.5">
                        <button disabled={isPlanned || !opportunity.best_instant.buy_offer} onClick={() => { onSelectDestination(opportunity.best_instant.server_id); onAdd({ id: opportunity.item_id, name: opportunity.item_name, category: opportunity.item_category }, { expectedSalePrice: opportunity.best_instant.buy_offer }) }} className="rounded-md border border-gray-600 px-1.5 py-0.5 text-[11px] text-gray-300 hover:border-emerald-600 hover:text-emerald-300 disabled:opacity-40">Instant</button>
                        <button disabled={isPlanned || !opportunity.best_projected.sell_offer} onClick={() => { onSelectDestination(opportunity.best_projected.server_id); onAdd({ id: opportunity.item_id, name: opportunity.item_name, category: opportunity.item_category }, { expectedSalePrice: opportunity.best_projected.sell_offer }) }} className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-blue-500 disabled:opacity-40">Projected</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function WorldComparison({ item, source, servers, sourceTcPrice, onPlan }) {
  const opportunities = useMemo(() => {
    if (!source || !sourceTcPrice) return []
    const quantity = Number(item.quantity) || 0
    const acquisitionPrice = Number(item.purchasePrice) || Number(item.sourceMarketPrice) || 0
    const costTc = quantity * acquisitionPrice / Number(sourceTcPrice)
    return (item.marketServers || []).flatMap(market => {
      const server = servers.find(entry => entry.id === market.server_id)
      if (!server || server.id === source.id || server.notes === 'blocked' || !canTransfer(source, server)) return []
      const destinationTcPrice = Number(market.tc_sell_price) || 0
      const instantRevenueTc = destinationTcPrice ? quantity * Number(market.buy_offer) / destinationTcPrice : 0
      const projectedRevenueTc = destinationTcPrice ? quantity * Number(market.sell_offer) / destinationTcPrice : 0
      const activity = (Number(market.buy_offers) || 0) + (Number(market.sell_offers) || 0)
      const confidence = Math.min(1, Math.log1p(activity) / Math.log(21))
      const instantProfitTc = instantRevenueTc - costTc
      const projectedProfitTc = projectedRevenueTc - costTc
      const executableProfit = market.buy_offer > 0 ? instantProfitTc : projectedProfitTc * 0.65
      return [{ server, market, activity, instantProfitTc, projectedProfitTc, destinationTcPrice, score: executableProfit * (0.35 + confidence * 0.65) }]
    }).sort((a, b) => b.score - a.score)
  }, [item.marketServers, item.purchasePrice, item.quantity, item.sourceMarketPrice, servers, source, sourceTcPrice])

  const bestInstant = [...opportunities].filter(entry => entry.market.buy_offer > 0).sort((a, b) => b.instantProfitTc - a.instantProfitTc)[0]
  const bestProjected = [...opportunities].filter(entry => entry.market.sell_offer > 0).sort((a, b) => b.projectedProfitTc - a.projectedProfitTc)[0]
  const bestBalanced = opportunities[0]

  if (!source) return <div className="p-6 text-center text-sm text-gray-400">Select a source world to compare legal destinations.</div>
  if (!sourceTcPrice) return <div className="p-6 text-center text-sm text-gray-400">Enter the source Tibia Coin price to calculate returns.</div>
  if (opportunities.length === 0) return <div className="p-6 text-center text-sm text-gray-400">No compatible destinations with market data were found.</div>

  return (
    <div className="border-t border-gray-700 bg-gray-900/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-white">Compatible destinations for {item.name}</h3>
          <p className="mt-0.5 text-[11px] text-gray-500">Ranked by TC profit and offer activity. Transfer cost is not allocated to individual items.</p>
        </div>
        {!item.purchasePrice && item.sourceMarketPrice > 0 && <span className="text-[11px] text-amber-400">Using source market price as cost basis</span>}
      </div>
      <div className="max-h-80 overflow-auto rounded-lg border border-gray-700">
        <table className="w-full min-w-[850px] text-xs">
          <thead className="sticky top-0 bg-gray-700 text-left text-[11px] uppercase tracking-wide text-gray-400">
            <tr><th className="px-2 py-1.5">World</th><th className="px-2 py-1.5">Market</th><th className="px-2 py-1.5 text-right">TC price</th><th className="px-2 py-1.5 text-right">Instant profit</th><th className="px-2 py-1.5 text-right">Projected profit</th><th className="px-2 py-1.5 text-right">Activity</th><th className="px-2 py-1.5 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {opportunities.map(entry => {
              const badges = []
              if (entry === bestInstant) badges.push('Best instant')
              if (entry === bestProjected) badges.push('Best projected')
              if (entry === bestBalanced) badges.push('Best balanced')
              return (
                <tr key={entry.server.id} className="hover:bg-gray-700/40">
                  <td className="px-2 py-1.5">
                    <div className="font-medium text-white">{entry.server.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {badges.map(badge => <span key={badge} className="rounded bg-blue-500/15 px-1 py-0.5 text-[9px] font-medium text-blue-300">{badge}</span>)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-500">{entry.server.pvp_type} · {entry.server.battleye}</div>
                  </td>
                  <td className="px-2 py-1.5 text-[11px]"><div className="text-emerald-400">Buy {formatPrice(entry.market.buy_offer)} gp</div><div className="mt-0.5 text-gray-400">Sell {formatPrice(entry.market.sell_offer)} gp</div></td>
                  <td className="px-2 py-1.5 text-right text-gray-300">{entry.destinationTcPrice ? `${formatPrice(entry.destinationTcPrice)} gp` : '—'}</td>
                  <td className={`px-2 py-1.5 text-right font-medium ${entry.instantProfitTc >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatTc(entry.instantProfitTc)}</td>
                  <td className={`px-2 py-1.5 text-right font-medium ${entry.projectedProfitTc >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatTc(entry.projectedProfitTc)}</td>
                  <td className="px-2 py-1.5 text-right text-gray-300">{entry.activity}<div className="text-[9px] text-gray-500">offers</div></td>
                  <td className="px-2 py-1.5">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => onPlan(entry.server.id, entry.market.buy_offer)} disabled={!entry.market.buy_offer} className="rounded-md border border-gray-600 px-1.5 py-0.5 text-[11px] text-gray-300 hover:border-emerald-600 hover:text-emerald-300 disabled:opacity-40">Use buy</button>
                      <button onClick={() => onPlan(entry.server.id, entry.market.sell_offer)} disabled={!entry.market.sell_offer} className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-blue-500 disabled:opacity-40">Use sell</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

SummaryCard.propTypes = {
  label: PropTypes.string.isRequired,
  primary: PropTypes.string.isRequired,
  secondary: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(['default', 'positive', 'negative']),
}

ServerField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  servers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    pvp_type: PropTypes.string.isRequired,
    battleye: PropTypes.string,
  })).isRequired,
  loading: PropTypes.bool.isRequired,
  excludeId: PropTypes.string.isRequired,
}

BasketDestinationRanking.propTypes = {
  items: PropTypes.array.isRequired,
  source: PropTypes.object,
  servers: PropTypes.array.isRequired,
  sourceTcPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  transferCost: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
}

SourceOpportunityScanner.propTypes = {
  source: PropTypes.shape({ id: PropTypes.number.isRequired, name: PropTypes.string.isRequired }),
  destination: PropTypes.shape({ id: PropTypes.number.isRequired, name: PropTypes.string.isRequired }),
  plannedItemIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  onAdd: PropTypes.func.isRequired,
  onSelectDestination: PropTypes.func.isRequired,
}

WorldComparison.propTypes = {
  item: PropTypes.shape({
    name: PropTypes.string.isRequired,
    quantity: PropTypes.string.isRequired,
    purchasePrice: PropTypes.string.isRequired,
    sourceMarketPrice: PropTypes.number.isRequired,
    marketServers: PropTypes.array,
  }).isRequired,
  source: PropTypes.object,
  servers: PropTypes.array.isRequired,
  sourceTcPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onPlan: PropTypes.func.isRequired,
}

function TransferPlanner() {
  const { servers, loading: serversLoading, error: serversError } = useServersContext()
  const planner = useTransferPlanner()
  const [comparisonItemId, setComparisonItemId] = useState(null)
  const [showTc, setShowTc] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [basketRankingOpen, setBasketRankingOpen] = useState(false)
  const comparisonItem = planner.items.find(item => item.itemId === comparisonItemId)
  const source = servers.find(server => String(server.id) === String(planner.sourceServerId))
  const destination = servers.find(server => String(server.id) === String(planner.destinationServerId))
  const isSameWorld = source && destination && source.id === destination.id
  const destinationBlocked = destination?.notes === 'blocked'
  const compatible = source && destination && !isSameWorld && !destinationBlocked && canTransfer(source, destination)
  const hasRoute = source && destination
  const profitTone = planner.totals.expectedProfitTc > 0 ? 'positive' : planner.totals.expectedProfitTc < 0 ? 'negative' : 'default'

  return (
    <div className="p-3 pt-16 md:p-4 max-w-[1800px] mx-auto h-screen flex flex-col">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2 shrink-0">
        <div>
          <h1 className="flex items-center gap-2 text-base font-bold text-white">
            <ArrowRightLeft className="h-4 w-4 text-blue-400" />
            Transfer Planner
          </h1>
          <p className="text-[11px] text-gray-400">Build a transfer basket using live world and market data, normalized in Tibia Coins.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-[11px] text-gray-400">
          <Database className="h-3.5 w-3.5 text-blue-400" /> Database-backed market references
        </div>
      </div>

      {(serversError || planner.searchError || planner.persistenceError) && <div className="mb-2 shrink-0"><ErrorMessage message={serversError || planner.searchError || planner.persistenceError} /></div>}

      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
        <div className="w-full lg:w-[300px] shrink-0 flex flex-col gap-2 overflow-y-auto pr-1 lg:max-h-full">
          <section className="rounded-lg border border-gray-700 bg-gray-800 p-2.5 space-y-2">
            <div><label className={labelClass}>Plan name</label><input value={planner.planName} onChange={event => planner.setPlanName(event.target.value)} className={inputClass} /></div>
            <div className="flex gap-2">
              <div className="flex-1"><label className={labelClass}>Lifecycle</label><select value={planner.planStatus} onChange={event => planner.setPlanStatus(event.target.value)} className={inputClass}><option value="draft">Draft</option><option value="purchasing">Purchasing</option><option value="transferred">Transferred</option><option value="selling">Selling</option><option value="completed">Completed</option></select></div>
              <div className="flex items-end gap-1"><button onClick={planner.newPlan} title="New transfer plan" className="rounded-md border border-gray-600 p-1.5 text-gray-300 hover:bg-gray-700"><FilePlus className="h-3.5 w-3.5" /></button><button onClick={() => planner.savePlan().catch(() => {})} disabled={planner.saving || !planner.sourceServerId} title={planner.planId ? 'Save changes' : 'Save plan'} className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{planner.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}</button></div>
            </div>
            <div><label className={labelClass}>Saved plans</label><select value={planner.planId || ''} onChange={event => event.target.value && planner.loadPlan(Number(event.target.value))} className={inputClass}><option value="">Select a saved plan</option>{planner.savedPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} · {plan.status} · {plan.item_count} items</option>)}</select></div>
          </section>

          <section className="rounded-lg border border-gray-700 bg-gray-800 p-2.5 space-y-2">
            <ServerField label="Source world" value={planner.sourceServerId} onChange={planner.setSourceServerId} servers={servers} loading={serversLoading} excludeId={planner.destinationServerId} />
            <div><label className={labelClass}>Source Tibia Coin price</label><input type="number" min="0" value={planner.sourceTcPrice} onChange={event => planner.setSourceTcPrice(event.target.value)} placeholder="Loaded from source market" className={inputClass} /></div>
            <ServerField label="Destination world" value={planner.destinationServerId} onChange={planner.setDestinationServerId} servers={servers} loading={serversLoading} excludeId={planner.sourceServerId} />
            <div><label className={labelClass}>Destination Tibia Coin price</label><input type="number" min="0" value={planner.destinationTcPrice} onChange={event => planner.setDestinationTcPrice(event.target.value)} placeholder="Loaded from destination market" className={inputClass} /></div>
            <div>
              <label className={labelClass}>Transfer cost</label>
              <div className="relative">
                <input type="number" min="0" value={planner.transferCost} onChange={event => planner.setTransferCost(event.target.value)} className={`${inputClass} pr-9`} />
                <span className="absolute right-2 top-1.5 text-[10px] text-gray-400">TC</span>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-2">
              {!hasRoute ? (
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Select both worlds to validate the route.</div>
              ) : compatible ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {source.name} → {destination.name} is compatible.</div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-red-400"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {destinationBlocked ? `${destination.name} is blocked as a destination.` : 'This transfer direction is not allowed.'}</div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-gray-700 bg-gray-800 p-2.5 grid grid-cols-2 gap-2">
            <SummaryCard label="Items invested" primary={formatTc(planner.totals.itemCostTc)} secondary={`${formatPrice(planner.totals.itemCostGold)} gp`} />
            <SummaryCard label="Total cost" primary={formatTc(planner.totals.totalCostTc)} secondary={`+${formatTc(Number(planner.transferCost) || 0)} transfer`} />
            <SummaryCard label="Expected revenue" primary={formatTc(planner.totals.expectedRevenueTc)} secondary={`${formatPrice(planner.totals.expectedRevenueGold)} gp`} />
            <SummaryCard label="Expected profit" primary={formatTc(planner.totals.expectedProfitTc)} secondary={`${planner.totals.margin.toFixed(1)}% ROI`} tone={profitTone} />
            <SummaryCard label="Realized revenue" primary={formatTc(planner.totals.realizedRevenueTc)} secondary={`${formatPrice(planner.totals.realizedRevenueGold)} gp sold`} />
            <SummaryCard label="Realized net" primary={formatTc(planner.totals.realizedProfitTc)} secondary="Rev. to date - plan cost" tone={planner.totals.realizedProfitTc > 0 ? 'positive' : planner.totals.realizedRevenueTc > 0 ? 'negative' : 'default'} />
          </section>

          {source && (
            <section className="rounded-lg border border-blue-800/70 bg-blue-950/20 overflow-hidden shrink-0">
              <button onClick={() => setScannerOpen(open => !open)} className="flex w-full items-center justify-between px-2.5 py-2 text-left hover:bg-blue-950/30">
                <span className="text-[11px] font-semibold text-blue-300">Find opportunities on {source.name}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-blue-400 transition-transform shrink-0 ${scannerOpen ? 'rotate-180' : ''}`} />
              </button>
            </section>
          )}

          {source && planner.items.length > 0 && (
            <section className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden shrink-0">
              <button onClick={() => setBasketRankingOpen(open => !open)} className="flex w-full items-center justify-between px-2.5 py-2 text-left hover:bg-gray-700/40">
                <span className="text-[11px] font-semibold text-white">Compare basket destinations</span>
                <ChevronDown className={`h-3.5 w-3.5 text-blue-400 transition-transform shrink-0 ${basketRankingOpen ? 'rotate-180' : ''}`} />
              </button>
            </section>
          )}
        </div>

        <section className="flex-1 flex flex-col rounded-lg border border-gray-700 bg-gray-800 overflow-hidden min-h-0">
          {scannerOpen && source && (
            <div className="max-h-[45%] overflow-y-auto border-b border-gray-700 shrink-0">
              <SourceOpportunityScanner source={source} destination={destination} plannedItemIds={planner.items.map(item => item.itemId)} onAdd={planner.addItem} onSelectDestination={serverId => planner.setDestinationServerId(String(serverId))} />
            </div>
          )}
          {basketRankingOpen && source && planner.items.length > 0 && (
            <div className="max-h-[45%] overflow-y-auto border-b border-gray-700 shrink-0">
              <BasketDestinationRanking items={planner.items} source={source} servers={servers} sourceTcPrice={planner.sourceTcPrice} transferCost={planner.transferCost} onApply={planner.applyDestinationStrategy} />
            </div>
          )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-700 p-2.5 shrink-0">
          <div>
            <h2 className="text-xs font-semibold text-white">Planned items</h2>
            <p className="text-[11px] text-gray-500">Enter what you actually paid; market prices are references from the database.</p>
          </div>
          <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-gray-600 bg-gray-700 p-0.5 text-[11px] font-medium">
            <button onClick={() => setShowTc(false)} className={`rounded px-2 py-0.5 ${!showTc ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>gp</button>
            <button onClick={() => setShowTc(true)} className={`rounded px-2 py-0.5 ${showTc ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>TC</button>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-gray-500" />
            <input value={planner.itemSearch} onChange={event => planner.setItemSearch(event.target.value)} placeholder="Search database items…" className={`${inputClass} pl-7`} />
            {planner.searching && <Loader2 className="absolute right-2 top-1.5 h-3.5 w-3.5 animate-spin text-blue-400" />}
            {planner.itemResults.length > 0 && (
              <div className="absolute right-0 top-full z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-gray-600 bg-gray-700 shadow-xl">
                {planner.itemResults.map(item => (
                  <button key={item.id} onClick={() => planner.addItem(item)} disabled={planner.addingItemId === item.id} className="flex w-full items-center justify-between gap-2 border-b border-gray-600 px-2 py-1.5 text-left last:border-0 hover:bg-gray-600 disabled:opacity-50">
                    <span><span className="block text-xs text-white">{item.name}</span><span className="text-[11px] text-gray-400">{item.category}</span></span>
                    {planner.addingItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
        {planner.items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Search className="mx-auto h-6 w-6 text-gray-600" />
            <p className="mt-2 text-xs font-medium text-gray-300">No items in this transfer yet</p>
            <p className="mt-1 text-[11px] text-gray-500">Search by item name above to add your first purchase.</p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-xs border-collapse">
              <thead className="bg-gray-750 text-left text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="border border-gray-700 px-3 py-1.5">Item</th><th className="border border-gray-700 px-2 py-1.5">Category</th><th className="border border-gray-700 px-2 py-1.5">Qty</th><th className="border border-gray-700 px-2 py-1.5">Paid each</th><th className="border border-gray-700 px-2 py-1.5">Source market</th><th className="border border-gray-700 px-2 py-1.5">Target sale</th><th className="border border-gray-700 px-2 py-1.5">Dest. buy</th><th className="border border-gray-700 px-2 py-1.5">Dest. sell</th><th className="border border-gray-700 px-2 py-1.5">Sold qty</th><th className="border border-gray-700 px-2 py-1.5">Actual sale</th><th className="border border-gray-700 px-2 py-1.5">Sale status</th><th className="border border-gray-700 px-2 py-1.5 text-right">Cost</th><th className="border border-gray-700 px-2 py-1.5 text-right">Expected</th><th className="border border-gray-700 w-9" />
                </tr>
              </thead>
              <tbody>
                {planner.items.map(item => {
                  const quantity = Number(item.quantity) || 0
                  const costGold = quantity * (Number(item.purchasePrice) || 0)
                  const revenueGold = quantity * (Number(item.expectedSalePrice) || 0)
                  const costTc = Number(planner.sourceTcPrice) ? costGold / Number(planner.sourceTcPrice) : 0
                  const revenueTc = Number(planner.destinationTcPrice) ? revenueGold / Number(planner.destinationTcPrice) : 0
                  const paidEachTc = Number(planner.sourceTcPrice) ? (Number(item.purchasePrice) || 0) / Number(planner.sourceTcPrice) : 0
                  const sourceMarketTc = Number(planner.sourceTcPrice) ? (Number(item.sourceMarketPrice) || 0) / Number(planner.sourceTcPrice) : 0
                  const targetSaleTc = Number(planner.destinationTcPrice) ? (Number(item.expectedSalePrice) || 0) / Number(planner.destinationTcPrice) : 0
                  const destBuyTc = Number(planner.destinationTcPrice) ? (Number(item.destinationBuyOffer) || 0) / Number(planner.destinationTcPrice) : 0
                  const destSellTc = Number(planner.destinationTcPrice) ? (Number(item.destinationSellOffer) || 0) / Number(planner.destinationTcPrice) : 0
                  const actualSaleTc = Number(planner.destinationTcPrice) ? (Number(item.actualSalePrice) || 0) / Number(planner.destinationTcPrice) : 0
                  return (
                    <tr key={item.itemId} className="align-top hover:bg-gray-750/50">
                      <td className="border border-gray-700 px-3 py-0.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setComparisonItemId(current => current === item.itemId ? null : item.itemId)}
                            title={comparisonItemId === item.itemId ? 'Hide worlds' : 'Compare worlds'}
                            className={`rounded-md p-1 ${comparisonItemId === item.itemId ? 'bg-blue-500/15 text-blue-300' : 'text-gray-500 hover:bg-gray-700 hover:text-blue-300'}`}
                          >
                            <Globe className="h-3.5 w-3.5" />
                          </button>
                          <div className="max-w-[160px] truncate text-xs font-medium text-white" title={item.name}>{item.name}</div>
                        </div>
                      </td>
                      <td className="border border-gray-700 px-2 py-0.5 text-[11px] whitespace-nowrap text-gray-500 align-middle">{item.category}</td>
                      <td className="border border-gray-700 px-1.5 py-0.5"><input type="number" min="0" value={item.quantity} onChange={event => planner.updateItem(item.itemId, 'quantity', event.target.value)} className={`${tableInputClass} w-12`} /></td>
                      <td className="border border-gray-700 px-1.5 py-0.5">
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" value={item.purchasePrice} onChange={event => planner.updateItem(item.itemId, 'purchasePrice', event.target.value)} placeholder="Actual price" className={`${tableInputClass} w-16`} />
                          {showTc && paidEachTc > 0 && <span className="whitespace-nowrap text-[10px] text-gray-500">{formatTc(paidEachTc)}</span>}
                        </div>
                      </td>
                      <td className="border border-gray-700 px-2 py-0.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block min-w-[68px] text-right text-[11px] text-gray-400">{showTc ? `${formatTc(sourceMarketTc)}` : `${formatPrice(item.sourceMarketPrice)} gp`}</span>
                          <button
                            onClick={() => planner.updateItem(item.itemId, 'purchasePrice', String(item.sourceMarketPrice))}
                            disabled={!item.sourceMarketPrice}
                            title="Use source market price as paid each"
                            className="shrink-0 border border-gray-600 bg-gray-700 px-1.5 py-0.5 text-[11px] font-medium text-blue-300 hover:border-blue-500 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Use
                          </button>
                        </div>
                      </td>
                      <td className="border border-gray-700 px-1.5 py-0.5">
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" value={item.expectedSalePrice} onChange={event => planner.updateItem(item.itemId, 'expectedSalePrice', event.target.value)} placeholder="Target price" className={`${tableInputClass} w-16`} />
                          {showTc && targetSaleTc > 0 && <span className="whitespace-nowrap text-[10px] text-gray-500">{formatTc(targetSaleTc)}</span>}
                        </div>
                      </td>
                      <td className="border border-gray-700 px-2 py-0.5 text-right text-[11px] text-emerald-400 whitespace-nowrap align-middle"><span className="inline-block min-w-[64px]">{showTc ? formatTc(destBuyTc) : `${formatPrice(item.destinationBuyOffer)} gp`}</span></td>
                      <td className="border border-gray-700 px-2 py-0.5 text-right text-[11px] text-gray-400 whitespace-nowrap align-middle"><span className="inline-block min-w-[64px]">{showTc ? formatTc(destSellTc) : `${formatPrice(item.destinationSellOffer)} gp`}</span></td>
                      <td className="border border-gray-700 px-1.5 py-0.5"><input type="number" min="0" max={item.quantity} value={item.soldQuantity} onChange={event => planner.updateItem(item.itemId, 'soldQuantity', event.target.value)} className={`${tableInputClass} w-12`} /></td>
                      <td className="border border-gray-700 px-1.5 py-0.5">
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" value={item.actualSalePrice} onChange={event => planner.updateItem(item.itemId, 'actualSalePrice', event.target.value)} placeholder="Actual price" className={`${tableInputClass} w-16`} />
                          {showTc && actualSaleTc > 0 && <span className="whitespace-nowrap text-[10px] text-gray-500">{formatTc(actualSaleTc)}</span>}
                        </div>
                      </td>
                      <td className="border border-gray-700 px-1.5 py-0.5"><select value={item.saleStatus} onChange={event => planner.updateItem(item.itemId, 'saleStatus', event.target.value)} className={`${tableInputClass} w-20`}><option value="planned">Planned</option><option value="listed">Listed</option><option value="partial">Partial</option><option value="sold">Sold</option></select></td>
                      <td className="border border-gray-700 px-2 py-0.5 text-right whitespace-nowrap align-middle"><span className="inline-block min-w-[72px] text-[11px] text-white">{showTc ? formatTc(costTc) : `${formatPrice(costGold)} gp`}</span></td>
                      <td className="border border-gray-700 px-2 py-0.5 text-right whitespace-nowrap align-middle"><span className="inline-block min-w-[72px] text-[11px] text-white">{showTc ? formatTc(revenueTc) : `${formatPrice(revenueGold)} gp`}</span></td>
                      <td className="border border-gray-700 px-1.5 py-0.5"><button onClick={() => planner.removeItem(item.itemId)} title="Remove item" className="rounded-md p-1 text-gray-500 hover:bg-red-950/40 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {comparisonItem && (
            <WorldComparison
              item={comparisonItem}
              source={source}
              servers={servers}
              sourceTcPrice={planner.sourceTcPrice}
              onPlan={(serverId, price) => {
                planner.setDestinationServerId(String(serverId))
                planner.updateItem(comparisonItem.itemId, 'expectedSalePrice', String(price))
              }}
            />
          )}
          </>
        )}
        </div>
        </section>
      </div>
    </div>
  )
}

export default TransferPlanner
