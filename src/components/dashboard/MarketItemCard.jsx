import { memo } from 'react'
import PropTypes from 'prop-types'
import { CircleDollarSign } from 'lucide-react'
import { formatNumber, calculateCoverage, calculateSpread } from '../../utils/formatters'
import { ITEM_ICONS, ITEM_COLORS, COLOR_CLASSES } from '../../constants/items'

const MarketItemCard = memo(function MarketItemCard({ item, totalServers }) {
  const Icon = ITEM_ICONS[item.item_name] || CircleDollarSign
  const color = ITEM_COLORS[item.item_name] || 'gray'
  const coverage = calculateCoverage(item.server_count, totalServers)
  const spread = calculateSpread(item.avg_sell, item.avg_buy)

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700 hover:border-gray-600 transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 rounded-lg border ${COLOR_CLASSES[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white capitalize">
            {item.item_name}
          </h3>
          <p className="text-sm text-gray-500">
            {item.server_count} / {totalServers} servers ({coverage}%)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 mb-1">Avg Buy Offer</p>
          <p className="text-xl font-bold text-emerald-300">
            {formatNumber(item.avg_buy)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatNumber(item.total_buy_offers)} offers
          </p>
        </div>

        <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/20">
          <p className="text-xs text-rose-400 mb-1">Avg Sell Offer</p>
          <p className="text-xl font-bold text-rose-300">
            {formatNumber(item.avg_sell)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatNumber(item.total_sell_offers)} offers
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Range: {formatNumber(item.min_buy)} - {formatNumber(item.max_buy)}</span>
          <span>Spread: {spread}%</span>
        </div>
      </div>
    </div>
  )
})

MarketItemCard.propTypes = {
  item: PropTypes.shape({
    item_id: PropTypes.number,
    item_name: PropTypes.string.isRequired,
    server_count: PropTypes.number.isRequired,
    avg_buy: PropTypes.number.isRequired,
    avg_sell: PropTypes.number.isRequired,
    total_buy_offers: PropTypes.number.isRequired,
    total_sell_offers: PropTypes.number.isRequired,
    min_buy: PropTypes.number.isRequired,
    max_buy: PropTypes.number.isRequired
  }).isRequired,
  totalServers: PropTypes.number.isRequired
}

export default MarketItemCard
