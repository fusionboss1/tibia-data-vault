import { useServersContext } from '../contexts/ServersContext'
import { useFilters } from '../hooks/useFilters'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import ServerFilters from '../components/servers/ServerFilters'
import ServerTable from '../components/servers/ServerTable'

function Servers() {
  const { servers, loading, error } = useServersContext()
  const {
    filters,
    filteredItems: filteredServers,
    hasActiveFilters,
    handleFilterChange,
    clearFilter,
    clearAllFilters
  } = useFilters(servers)

  if (loading) {
    return <LoadingSpinner message="Loading servers..." />
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Tibia Servers</h1>
        <p className="text-gray-400">Browse and filter Tibia game servers</p>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )}

      <ServerFilters
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={handleFilterChange}
        onClearFilter={clearFilter}
        onClearAll={clearAllFilters}
      />

      <div className="mb-4 text-gray-400">
        Showing {filteredServers.length} of {servers.length} servers
      </div>

      <ServerTable servers={filteredServers} />
    </div>
  )
}

export default Servers
