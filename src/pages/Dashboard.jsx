import { TrendingUp, Server, Activity } from 'lucide-react'
import { useMarketData } from '../hooks/useMarketData'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import MarketItemCard from '../components/dashboard/MarketItemCard'
import QuickActionCard from '../components/dashboard/QuickActionCard'

function Dashboard() {
  const { marketData, loading, error } = useMarketData()

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

        {error && <ErrorMessage message={error} />}

        {marketData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          href="#/servers"
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
