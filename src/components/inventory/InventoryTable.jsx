import { memo, useRef } from 'react'
import PropTypes from 'prop-types'
import { useVirtualizer } from '@tanstack/react-virtual'
import { liquidityScore, liquidityColor } from '../../utils/inventory'

const NUMBER_FMT = new Intl.NumberFormat('en-US')

const CORE_COLUMNS = [
  ['item_name',       'Item',         'text-left'],
  ['quantity',        'Qty',          'text-right'],
  ['best_npc_buy_price', 'NPC Buy',   'text-right'],
  ['market_buy_offer','Mkt Buy',      'text-right'],
  ['market_sell_offer','Mkt Sell',    'text-right'],
  ['total_value',     'Total (Buy)',  'text-right'],
  ['total_value_sell','Total (Sell)', 'text-right'],
]

const WIDE_COLUMNS = [
  ['global_avg_buy',    'Glbl Avg Buy'],
  ['global_avg_sell',   'Glbl Avg Sell'],
  ['server_buy_orders', 'Orders'],
  ['active_servers',    'Active'],
  ['vs_global_pct',     'vs Global'],
  ['liquidity',         'Liquidity'],
  ['top_server_name',   'Top Server'],
  ['price_age_hours',   'Age'],
]

function SortIcon({ sortKey, activeKey, sortDir }) {
  if (sortKey !== activeKey) return <span className="text-gray-600 ml-1">⇅</span>
  return <span className="text-blue-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

const ROW_HEIGHT = 48

const InventoryTable = memo(function InventoryTable({
  items,
  sortKey, sortDir, onSort,
  avgBuyField, avgSellField,
  topServerNameField, topServerBuyField, topServerSellField,
}) {
  const scrollRef = useRef(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const virtualRows = virtualizer.getVirtualItems()
  const totalHeight = virtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom = virtualRows.length > 0 ? totalHeight - virtualRows[virtualRows.length - 1].end : 0

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div ref={scrollRef} className="overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-800">
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              {CORE_COLUMNS.map(([key, label, align]) => (
                <th
                  key={key}
                  onClick={() => onSort(key)}
                  className={`${align} px-4 py-3 cursor-pointer hover:text-white select-none`}
                >
                  {label}<SortIcon sortKey={key} activeKey={sortKey} sortDir={sortDir} />
                </th>
              ))}
              {WIDE_COLUMNS.map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => onSort(key)}
                  className="text-right px-4 py-3 hidden xl:table-cell cursor-pointer hover:text-white select-none"
                >
                  {label}<SortIcon sortKey={key} activeKey={sortKey} sortDir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && <tr><td style={{ height: paddingTop }} /></tr>}
            {virtualRows.map((vRow) => {
              const item = items[vRow.index]
              const score = liquidityScore(item)
              return (
                <tr
                  key={item.id}
                  data-index={vRow.index}
                  ref={virtualizer.measureElement}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-200 font-medium capitalize">
                    {item.item_name}
                    {item.tier > 0 && (
                      <span className="ml-2 text-xs text-yellow-400">Tier {item.tier}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-semibold tabular-nums">
                    {NUMBER_FMT.format(item.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                    {item.best_npc_buy_price != null
                      ? NUMBER_FMT.format(item.best_npc_buy_price)
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-400">
                    {item.market_buy_offer > 0
                      ? NUMBER_FMT.format(item.market_buy_offer)
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-400">
                    {item.market_sell_offer > 0
                      ? NUMBER_FMT.format(item.market_sell_offer)
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-yellow-400">
                    {item.total_value > 0
                      ? NUMBER_FMT.format(item.total_value)
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-orange-400">
                    {item.total_value_sell > 0
                      ? NUMBER_FMT.format(item.total_value_sell)
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell text-gray-300">
                    {item[avgBuyField] > 0 ? NUMBER_FMT.format(item[avgBuyField]) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell text-green-300">
                    {item[avgSellField] > 0 ? NUMBER_FMT.format(item[avgSellField]) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell">
                    {item.server_buy_orders != null && <span className="text-blue-400">{item.server_buy_orders}b</span>}
                    {item.server_buy_orders != null && item.server_sell_orders != null && <span className="text-gray-500"> / </span>}
                    {item.server_sell_orders != null
                      ? <span className="text-green-400">{item.server_sell_orders}s</span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell">
                    {item.active_servers != null
                      ? <span className={item.active_servers >= 30 ? 'text-green-400' : item.active_servers >= 10 ? 'text-yellow-400' : 'text-red-400'}>
                          {item.active_servers}/{item.global_servers}
                        </span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell">
                    {item.vs_global_pct != null
                      ? <span className={item.vs_global_pct > 20 ? 'text-green-400' : item.vs_global_pct < -20 ? 'text-red-400' : 'text-gray-300'}>
                          {item.vs_global_pct > 0 ? '+' : ''}{item.vs_global_pct}%
                        </span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell">
                    <span className={liquidityColor(score)}>{score}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell">
                    {item[topServerNameField]
                      ? <span className="text-gray-200">
                          <span className="text-gray-400">{item[topServerNameField]}: </span>
                          <span className="text-blue-400">{item[topServerBuyField] != null ? NUMBER_FMT.format(item[topServerBuyField]) : '—'}</span>
                          <span className="text-gray-500"> / </span>
                          <span className="text-green-400">{item[topServerSellField] != null ? NUMBER_FMT.format(item[topServerSellField]) : '—'}</span>
                        </span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs hidden xl:table-cell">
                    {item.price_age_hours != null
                      ? <span className={item.price_age_hours <= 24 ? 'text-green-400' : item.price_age_hours <= 72 ? 'text-yellow-400' : 'text-red-400'}>
                          {item.price_age_hours < 24 ? `${item.price_age_hours}h` : `${Math.floor(item.price_age_hours / 24)}d`}
                        </span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>
                </tr>
              )
            })}
            {paddingBottom > 0 && <tr><td style={{ height: paddingBottom }} /></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
})

InventoryTable.propTypes = {
  items: PropTypes.array.isRequired,
  sortKey: PropTypes.string.isRequired,
  sortDir: PropTypes.string.isRequired,
  onSort: PropTypes.func.isRequired,
  avgBuyField: PropTypes.string.isRequired,
  avgSellField: PropTypes.string.isRequired,
  topServerNameField: PropTypes.string.isRequired,
  topServerBuyField: PropTypes.string.isRequired,
  topServerSellField: PropTypes.string.isRequired,
}

export default InventoryTable
