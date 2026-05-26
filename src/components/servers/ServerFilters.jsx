import PropTypes from 'prop-types'
import { Filter, X } from 'lucide-react'
import FilterInput from '../common/FilterInput'
import FilterSelect from '../common/FilterSelect'
import { REGIONS, PVP_TYPES, BATTLEYE_TYPES } from '../../constants/filters'

function ServerFilters({ filters, hasActiveFilters, onFilterChange, onClearFilter, onClearAll }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Filters</h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <FilterInput
          label="Name"
          value={filters.name}
          onChange={(value) => onFilterChange('name', value)}
          onClear={() => onClearFilter('name')}
          placeholder="Filter by name..."
        />

        <FilterSelect
          label="Region"
          value={filters.region}
          onChange={(value) => onFilterChange('region', value)}
          options={REGIONS}
          allLabel="All Regions"
        />

        <FilterSelect
          label="PvP Type"
          value={filters.pvp_type}
          onChange={(value) => onFilterChange('pvp_type', value)}
          options={PVP_TYPES}
          allLabel="All Types"
        />

        <FilterSelect
          label="BattlEye"
          value={filters.battleye}
          onChange={(value) => onFilterChange('battleye', value)}
          options={BATTLEYE_TYPES}
        />

        <FilterInput
          label="Notes"
          value={filters.notes}
          onChange={(value) => onFilterChange('notes', value)}
          onClear={() => onClearFilter('notes')}
          placeholder="Filter by notes..."
        />
      </div>
    </div>
  )
}

ServerFilters.propTypes = {
  filters: PropTypes.shape({
    name: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired,
    pvp_type: PropTypes.string.isRequired,
    battleye: PropTypes.string.isRequired,
    notes: PropTypes.string.isRequired
  }).isRequired,
  hasActiveFilters: PropTypes.bool.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClearFilter: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired
}

export default ServerFilters
