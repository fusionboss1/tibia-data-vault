import { memo, useRef } from 'react'
import PropTypes from 'prop-types'
import { useVirtualizer } from '@tanstack/react-virtual'

const NUMBER_FMT = new Intl.NumberFormat('en-US')

const COLUMNS = [
  ['item_name',           'Item',        'text-left'],
  ['quantity',            'Qty',         'text-right'],
  ['best_npc_buy_price',  'NPC Buy',     'text-right'],
  ['best_npc_sell_price', 'NPC Sell',    'text-right'],
  ['market_buy_offer',    'Mkt Buy',     'text-right'],
  ['market_sell_offer',   'Mkt Sell',    'text-right'],
]

function SortIcon({ sortKey, activeKey, sortDir }) {
  if (sortKey !== activeKey) return <span className="text-gray-600 ml-1">⇅</span>
  return <span className="text-blue-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

const ROW_HEIGHT = 48

const InventoryTable = memo(function InventoryTable({ items, sortKey, sortDir, onSort }) {
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
    <div className="bg-gray-800 border border-gray-700 overflow-hidden">
      <div ref={scrollRef} className="overflow-auto" style={{ height: 'calc(100vh - 220px)' }}>
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: '200px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '100px' }} />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-gray-800">
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              {COLUMNS.map(([key, label, align]) => (
                <th
                  key={key}
                  onClick={() => onSort(key)}
                  className={`${align} px-4 py-3 cursor-pointer hover:text-white select-none whitespace-nowrap overflow-hidden`}
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
              return (
                <tr
                  key={item.id}
                  data-index={vRow.index}
                  ref={virtualizer.measureElement}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-[background-color]"
                >
                  <td className="px-4 py-3 text-gray-200 font-medium capitalize truncate">
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
                  <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                    {item.best_npc_sell_price != null
                      ? NUMBER_FMT.format(item.best_npc_sell_price)
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
}

export default InventoryTable
