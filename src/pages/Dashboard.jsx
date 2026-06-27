import { useState } from 'react'
import { TrendingUp, Server, Activity } from 'lucide-react'
import { useMarketData } from '../hooks/useMarketData'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import MarketItemCard from '../components/dashboard/MarketItemCard'
import QuickActionCard from '../components/dashboard/QuickActionCard'
import { PVP_TYPES, BATTLEYE_TYPES } from '../constants/filters'
import FilterButton from '../components/common/FilterButton'

const PVP_OPTIONS = PVP_TYPES.filter((t) => t !== 'All')
const BATTLEYE_OPTIONS = BATTLEYE_TYPES.filter((t) => t !== 'All')

function Dashboard({ onNavigate }) {
  const [pvpType, setPvpType] = useState('')
  const [battleye, setBattleye] = useState('')
  const [excludeBlocked, setExcludeBlocked] = useState(false)

  const { marketData, loading, refreshing, error } = useMarketData({ pvpType, battleye, excludeBlocked })

  if (loading) {
    return <LoadingSpinner message="Loading market data..." />
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Global market overview for key Tibia items</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Global Market Prices
          <span className="text-sm font-normal text-gray-500">
            (averaged across all servers)
          </span>
        </h2>

        <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-800/60 border border-gray-700 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">PvP type:</span>
            <div className="flex flex-wrap gap-1">
              <FilterButton
                label="All"
                active={pvpType === ''}
                onClick={() => setPvpType('')}
              />
              {PVP_OPTIONS.map((opt) => (
                <FilterButton
                  key={opt}
                  label={opt}
                  active={pvpType === opt}
                  onClick={() => setPvpType(pvpType === opt ? '' : opt)}
                />
              ))}
            </div>
          </div>
          <div className="w-px h-5 bg-gray-600 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">BattlEye:</span>
            <div className="flex gap-1">
              <FilterButton
                label="All"
                active={battleye === ''}
                onClick={() => setBattleye('')}
              />
              {BATTLEYE_OPTIONS.map((opt) => (
                <FilterButton
                  key={opt}
                  label={opt}
                  active={battleye === opt}
                  onClick={() => setBattleye(battleye === opt ? '' : opt)}
                />
              ))}
            </div>
          </div>
          <div className="w-px h-5 bg-gray-600 hidden sm:block" />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={excludeBlocked}
              onChange={(e) => setExcludeBlocked(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-emerald-500"
            />
            <span className="text-xs text-gray-400">Exclude blocked</span>
          </label>
        </div>

        {error && <ErrorMessage message={error} />}

        {marketData && (
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity duration-150 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
            {marketData.items.map((item) => (
              <MarketItemCard
                key={item.item_id}
                item={item}
                totalServers={marketData.total_servers}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickActionCard
          icon={Server}
          title="Server Browser"
          description={`Browse ${marketData?.total_servers || ''} Tibia servers with detailed information`}
          color="blue"
          onClick={() => onNavigate?.('servers')}
        />

        <QuickActionCard
          icon={Activity}
          title="Data Status"
          description={
            marketData
              ? `Last updated: ${new Date(marketData.last_updated).toLocaleString()}`
              : 'Loading...'
          }
          color="purple"
          isLink={false}
        />
      </div>
    </div>
  )
}

export default Dashboard
