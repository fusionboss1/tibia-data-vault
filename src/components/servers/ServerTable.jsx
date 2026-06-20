import { memo } from 'react'
import PropTypes from 'prop-types'
import { formatTimestamp, formatISODate } from '../../utils/formatters'

const COLUMNS = ['Name', 'Region', 'PvP Type', 'BattlEye', 'Notes', 'Release Date', 'Last Market Fetch', 'API Last Update']

const ServerTable = memo(function ServerTable({ servers }) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '140px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '200px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '170px' }} />
            <col style={{ width: '170px' }} />
          </colgroup>
          <thead className="bg-gray-700">
            <tr>
              {COLUMNS.map((col) => (
                <th key={col} className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {servers.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-6 py-12 text-center text-gray-400">
                  No servers found matching your filters
                </td>
              </tr>
            ) : (
              servers.map((server) => (
                <tr key={server.id} className="hover:bg-gray-750 transition-[background-color]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{server.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{server.region || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-900 text-blue-200">
                      {server.pvp_type || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      server.battleye === 'protected'
                        ? 'bg-green-900 text-green-200'
                        : server.battleye === 'none'
                        ? 'bg-red-900 text-red-200'
                        : 'bg-gray-700 text-gray-300'
                    }`}>
                      {server.battleye || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300 max-w-xs truncate">{server.notes || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">{server.release_date || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">{formatTimestamp(server.market_last_fetch)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">{formatISODate(server.api_last_update)}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
})

ServerTable.propTypes = {
  servers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    region: PropTypes.string,
    pvp_type: PropTypes.string,
    battleye: PropTypes.string,
    notes: PropTypes.string,
    release_date: PropTypes.string,
    market_last_fetch: PropTypes.number,
    api_last_update: PropTypes.string
  })).isRequired
}

export default ServerTable
