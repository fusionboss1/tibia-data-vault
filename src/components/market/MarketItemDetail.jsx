import PropTypes from 'prop-types'
import { ShoppingCart, Tag, Activity, Server } from 'lucide-react'
import LoadingSpinner from '../common/LoadingSpinner'
import ErrorMessage from '../common/ErrorMessage'

const fmt = (n) => n != null && n > 0 ? n.toLocaleString() : '—'

function BattleyeBadge({ status }) {
  if (!status) return null
  const isGreen = status === 'Green'
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${
      isGreen ? 'bg-emerald-900/50 text-emerald-400' : 'bg-yellow-900/50 text-yellow-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isGreen ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
      {status}
    </span>
  )
}

BattleyeBadge.propTypes = { status: PropTypes.string }

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    gray: 'text-gray-400',
  }
  return (
    <div className="bg-gray-700/50 rounded-lg p-3 flex items-center gap-3">
      <Icon className={`w-5 h-5 shrink-0 ${colorMap[color] ?? 'text-gray-400'}`} />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-sm font-semibold ${colorMap[color] ?? 'text-white'}`}>{value}</p>
      </div>
    </div>
  )
}

StatCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  color: PropTypes.string,
}

function MarketItemDetail({ item, serverData, loading, error, filteredStats }) {
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3 p-8">
        <Server className="w-12 h-12 opacity-30" />
        <p className="text-sm">Select an item to see details</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 border-b border-gray-700 shrink-0">
        <h2 className="text-lg font-bold text-white capitalize mb-0.5">{item.name}</h2>
        <p className="text-xs text-gray-400">{item.category}</p>
      </div>

      <div className="p-4 border-b border-gray-700 shrink-0">
        <div className={`grid grid-cols-2 gap-2 mb-3 transition-opacity duration-150 ${loading ? 'opacity-40' : 'opacity-100'}`}>
          <StatCard icon={ShoppingCart} label="Avg Buy" value={fmt(filteredStats?.global_avg_buy ?? item.global_avg_buy)} color="emerald" />
          <StatCard icon={Tag} label="Avg Sell" value={fmt(filteredStats?.global_avg_sell ?? item.global_avg_sell)} color="amber" />
          <StatCard icon={Activity} label="Top Activity" value={String(filteredStats?.top_activity ?? item.top_activity)} color="blue" />
          <StatCard icon={Server} label="Active Servers" value={String(filteredStats?.active_servers ?? item.active_servers)} color="gray" />
        </div>

        {(item.best_npc_buy_price || item.best_npc_sell_price) && (
          <div className="mt-2 p-2 bg-gray-700/30 rounded-lg text-xs text-gray-400 flex gap-4">
            {item.best_npc_buy_price > 0 && (
              <span>NPC buys for <span className="text-emerald-400 font-medium">{item.best_npc_buy_price.toLocaleString()} gp</span></span>
            )}
            {item.best_npc_sell_price > 0 && (
              <span>NPC sells for <span className="text-amber-400 font-medium">{item.best_npc_sell_price.toLocaleString()} gp</span></span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-4 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          Per-server prices
        </div>

        {error && (
          <div className="p-4">
            <ErrorMessage message={error} />
          </div>
        )}

        {!loading && !error && serverData.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">No active offers match the current filters</p>
        )}

        {!loading && !error && serverData.length > 0 && (
          <table className="w-full text-xs">
            <thead className="sticky top-8 bg-gray-800 z-10">
              <tr className="text-gray-400 font-medium">
                <th className="px-4 py-2 text-left">Server</th>
                <th className="px-4 py-2 text-right">Buy</th>
                <th className="px-4 py-2 text-right">Buy TC</th>
                <th className="px-4 py-2 text-right">Sell</th>
                <th className="px-4 py-2 text-right">Sell TC</th>
                <th className="px-4 py-2 text-right">Offers</th>
              </tr>
            </thead>
            <tbody>
              {serverData.map((s) => (
                <tr key={s.server_id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-2 flex items-center gap-2">
                    <span className="text-white">{s.server_name}</span>
                    <BattleyeBadge status={s.battleye} />
                  </td>
                  <td className="px-4 py-2 text-emerald-400 text-right">{fmt(s.buy_offer)}</td>
                  <td className="px-4 py-2 text-cyan-400 text-right">{fmt(s.tc_buy_offer)}</td>
                  <td className="px-4 py-2 text-amber-400 text-right">{fmt(s.sell_offer)}</td>
                  <td className="px-4 py-2 text-violet-400 text-right">{fmt(s.tc_sell_offer)}</td>
                  <td className="px-4 py-2 text-gray-400 text-right">
                    {s.buy_offers}↑ {s.sell_offers}↓
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

MarketItemDetail.propTypes = {
  item: PropTypes.object,
  serverData: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  filteredStats: PropTypes.object,
}

export default MarketItemDetail
