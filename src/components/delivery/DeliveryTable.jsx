import { memo } from 'react'
import PropTypes from 'prop-types'
import { TrendingDown, TrendingUp } from 'lucide-react'
import {
  formatPrice,
  formatSignedPrice,
  getDeliveryMargin,
  getDeliverySuggestedAction,
  getSourceMarketValueColor,
} from '../../utils/formatters'

const NUMBER_FMT = new Intl.NumberFormat('en-US')

const DeliveryTable = memo(function DeliveryTable({ items, loading }) {
  if (!loading && items.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-12 text-center">
        <p className="text-gray-400 text-lg">No delivery items found</p>
        <p className="text-gray-500 text-sm mt-2">
          Add active rows to the `weekly_delivery_items` table to populate this panel.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Delivery Pool Breakdown</h2>
          <p className="text-sm text-gray-400">NPC, local market, and global averages side by side.</p>
        </div>
        <div className="text-sm text-gray-400">
          {items.length} item{items.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '260px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '130px' }} />
          </colgroup>
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Item</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">NPC Price</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Your Server</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Global Average</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Estimated Demand</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Margin vs NPC</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Suggested</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {items.map((item) => {
              const margin = getDeliveryMargin(item)
              const action = getDeliverySuggestedAction(item)
              const hasLocalData = (item.server_sell_price || 0) > 0 || (item.server_buy_price || 0) > 0
              const npcPrice = item.npc_price || item.best_npc_buy_price || item.best_npc_sell_price || 0
              const hasNpcPrice = npcPrice > 0
              const localColor = !npcPrice ? 'text-gray-400'
                : (item.server_sell_price || 0) >= npcPrice ? 'text-green-400' : 'text-red-400'
              const globalColor = !npcPrice ? 'text-gray-400'
                : (item.global_avg_sell_price || 0) >= npcPrice ? 'text-green-400' : 'text-red-400'
              const localMargin = hasNpcPrice && hasLocalData ? margin.npcVsLocal : null
              const globalMargin = hasNpcPrice && (item.global_avg_sell_price || 0) > 0 ? margin.npcVsGlobal : null

              return (
                <tr key={item.item_id} className="hover:bg-gray-750">
                  <td className="px-4 py-3 align-top">
                    <div className="text-white font-medium truncate">{item.item_name}</div>
                    <div className="text-xs text-gray-500">{item.item_category}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSourceMarketValueColor(item.source_market_value)}`}>
                        TibiaPal: {item.source_market_value || 'Unknown'}
                      </span>
                      {item.source_order && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                          #{item.source_order}
                        </span>
                      )}
                    </div>
                    {item.notes && <div className="text-xs text-gray-400 mt-1">{item.notes}</div>}
                  </td>

                  <td className="px-4 py-3 text-right text-gray-300">
                    <div className="font-medium text-white">{formatPrice(item.npc_price)} gp</div>
                    <div className="text-xs text-gray-500">Buy: {formatPrice(item.best_npc_buy_price)} gp</div>
                    <div className="text-xs text-gray-500">Sell: {formatPrice(item.best_npc_sell_price)} gp</div>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className={`font-medium ${hasLocalData ? localColor : 'text-gray-500'}`}>
                      {formatPrice(item.server_sell_price)} gp
                    </div>
                    <div className="text-xs text-gray-500">Buy: {formatPrice(item.server_buy_price)} gp</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {item.server_updated_at
                        ? new Date(item.server_updated_at * 1000).toLocaleString()
                        : 'No local data'}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className={`font-medium ${globalColor}`}>
                      {formatPrice(item.global_avg_sell_price)} gp
                    </div>
                    <div className="text-xs text-gray-500">Buy: {formatPrice(item.global_avg_buy_price)} gp</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {item.global_server_count} server{item.global_server_count === 1 ? '' : 's'}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right text-gray-300">
                    {NUMBER_FMT.format(item.estimated_demand || 0)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className={`font-semibold ${localMargin === null ? 'text-gray-400' : localMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatSignedPrice(localMargin)}
                    </div>
                    <div className="text-xs text-gray-500">Global: {formatSignedPrice(globalMargin)}</div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        action === 'Sell to NPC' ? 'bg-red-500/20 text-red-300'
                        : action === 'Export' ? 'bg-blue-500/20 text-blue-300'
                        : action === 'List on market' ? 'bg-green-500/20 text-green-300'
                        : 'bg-gray-700 text-gray-300'
                      }`}>
                        {action}
                      </span>
                      {localMargin === null ? (
                        <div className="w-4 h-4 rounded-full bg-gray-500" />
                      ) : localMargin >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
})

DeliveryTable.propTypes = {
  items: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
}


export default DeliveryTable
