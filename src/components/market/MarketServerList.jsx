import PropTypes from 'prop-types'
import { Search, X, Home } from 'lucide-react'
import FilterButton from '../common/FilterButton'
import { PVP_TYPES, BATTLEYE_TYPES } from '../../constants/filters'

const PVP_OPTIONS = PVP_TYPES.filter(t => t !== 'All')
const BATTLEYE_OPTIONS = BATTLEYE_TYPES.filter(t => t !== 'All')

function BattleyeDot({ status }) {
  if (!status) return null
  return (
    <span className={`w-2 h-2 rounded-full shrink-0 ${status === 'Green' ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
  )
}

BattleyeDot.propTypes = { status: PropTypes.string }

function MarketServerList({ servers, loading, selectedServer, onSelect, serverSearch, setServerSearch, pvpType, setPvpType, battleye, setBattleye, myServer, setMyServer, onlyCompatible, setOnlyCompatible, excludeBlocked, setExcludeBlocked, allServers }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-700 shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={serverSearch}
            onChange={e => setServerSearch(e.target.value)}
            placeholder="Search servers…"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {serverSearch && (
            <button onClick={() => setServerSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          <FilterButton label="All PvP" active={pvpType === ''} onClick={() => setPvpType('')} />
          {PVP_OPTIONS.map(opt => (
            <FilterButton key={opt} label={opt} active={pvpType === opt} onClick={() => setPvpType(pvpType === opt ? '' : opt)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          <FilterButton label="All Eye" active={battleye === ''} onClick={() => setBattleye('')} />
          {BATTLEYE_OPTIONS.map(opt => (
            <FilterButton key={opt} label={opt} active={battleye === opt} onClick={() => setBattleye(battleye === opt ? '' : opt)} />
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={excludeBlocked} onChange={e => setExcludeBlocked(e.target.checked)} className="w-3.5 h-3.5 rounded accent-emerald-500" />
          <span className="text-xs text-gray-400">Exclude blocked</span>
        </label>

        <div className="border-t border-gray-700 pt-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Home className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400">My server:</span>
          </div>
          <select
            value={myServer?.id ?? ''}
            onChange={e => {
              const s = allServers.find(sv => sv.id === Number(e.target.value)) ?? null
              setMyServer(s)
              if (!s) setOnlyCompatible(false)
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— pick your server —</option>
            {allServers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {myServer && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyCompatible}
                onChange={e => setOnlyCompatible(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-blue-500"
              />
              <span className="text-xs text-gray-400">Only compatible servers</span>
            </label>
          )}
        </div>
      </div>

      <div className="px-2 py-1.5 text-xs text-gray-400 border-b border-gray-700 shrink-0">
        {loading ? 'Loading…' : `${servers.length} servers`}
      </div>

      <div className="overflow-auto flex-1">
        {servers.map(server => {
          const isSelected = selectedServer?.id === server.id
          const isHome = myServer?.id === server.id
          return (
            <button
              key={server.id}
              onClick={() => onSelect(server)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-gray-700/50 transition-colors ${
                isSelected ? 'bg-blue-600/20 border-l-2 border-l-blue-500' : 'hover:bg-gray-700/40'
              }`}
            >
              <BattleyeDot status={server.battleye} />
              <span className="flex-1 text-white font-medium">{server.name}</span>
              {isHome && <Home className="w-3 h-3 text-blue-400 shrink-0" />}
              <span className="text-gray-500 shrink-0">{server.pvp_type?.replace(' PvP', '')}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

MarketServerList.propTypes = {
  servers: PropTypes.array.isRequired,
  allServers: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  selectedServer: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
  serverSearch: PropTypes.string.isRequired,
  setServerSearch: PropTypes.func.isRequired,
  pvpType: PropTypes.string.isRequired,
  setPvpType: PropTypes.func.isRequired,
  battleye: PropTypes.string.isRequired,
  setBattleye: PropTypes.func.isRequired,
  excludeBlocked: PropTypes.bool.isRequired,
  setExcludeBlocked: PropTypes.func.isRequired,
  myServer: PropTypes.object,
  setMyServer: PropTypes.func.isRequired,
  onlyCompatible: PropTypes.bool.isRequired,
  setOnlyCompatible: PropTypes.func.isRequired,
}

export default MarketServerList
