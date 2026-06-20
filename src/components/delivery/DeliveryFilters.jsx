import { memo } from 'react'
import PropTypes from 'prop-types'
import { Search } from 'lucide-react'
import ErrorMessage from '../common/ErrorMessage'

const NUMBER_FMT = new Intl.NumberFormat('en-US')

const DeliveryFilters = memo(function DeliveryFilters({
  stats,
  selectedServerId, onServerId, servers, serversLoading, serverName,
  searchTerm, onSearch,
  sortBy, onSortBy,
  serversError, error,
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6 space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
          <div className="bg-gray-700/60 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Items in Pool</div>
            <div className="text-white text-2xl font-semibold">{stats.total}</div>
          </div>
          <div className="bg-gray-700/60 rounded-lg p-4">
            <div className="text-gray-400 text-sm">With Local Market Data</div>
            <div className="text-white text-2xl font-semibold">{stats.withLocalData}</div>
          </div>
          <div className="bg-gray-700/60 rounded-lg p-4">
            <div className="text-gray-400 text-sm">With Global Market Data</div>
            <div className="text-white text-2xl font-semibold">{stats.withGlobalData}</div>
          </div>
          <div className="bg-gray-700/60 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Above NPC Price</div>
            <div className="text-white text-2xl font-semibold">{stats.aboveNpc}</div>
          </div>
          <div className="bg-gray-700/60 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Estimated Demand</div>
            <div className="text-white text-2xl font-semibold">
              {NUMBER_FMT.format(stats.totalDemand)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Server</label>
          <select
            value={selectedServerId}
            onChange={(e) => onServerId(e.target.value)}
            disabled={serversLoading}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Global view only</option>
            {servers.map((server) => (
              <option key={server.id} value={server.id}>{server.name}</option>
            ))}
          </select>
          {serverName && <p className="text-xs text-gray-500 mt-1">Showing data for {serverName}</p>}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
          <Search className="absolute left-3 top-10 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search delivery items..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => onSortBy(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="source_order">Source Order</option>
            <option value="name">Item Name</option>
            <option value="demand">Estimated Demand</option>
            <option value="npc_low">Lowest NPC Price</option>
            <option value="local_margin">Best Local Margin</option>
            <option value="global_margin">Best Global Margin</option>
          </select>
        </div>
      </div>

      {(serversError || error) && (
        <div className="space-y-3">
          {serversError && <ErrorMessage message={serversError} />}
          {error && <ErrorMessage message={error} />}
        </div>
      )}
    </div>
  )
})

DeliveryFilters.propTypes = {
  stats: PropTypes.shape({
    total: PropTypes.number.isRequired,
    withLocalData: PropTypes.number.isRequired,
    withGlobalData: PropTypes.number.isRequired,
    aboveNpc: PropTypes.number.isRequired,
    totalDemand: PropTypes.number.isRequired,
  }).isRequired,
  selectedServerId: PropTypes.string.isRequired,
  onServerId: PropTypes.func.isRequired,
  servers: PropTypes.array.isRequired,
  serversLoading: PropTypes.bool.isRequired,
  serverName: PropTypes.string,
  searchTerm: PropTypes.string.isRequired,
  onSearch: PropTypes.func.isRequired,
  sortBy: PropTypes.string.isRequired,
  onSortBy: PropTypes.func.isRequired,
  serversError: PropTypes.string,
  error: PropTypes.string,
}

export default DeliveryFilters
