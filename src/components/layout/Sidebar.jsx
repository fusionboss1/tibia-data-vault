import PropTypes from 'prop-types'
import { Server, Home, ClipboardList, Archive, Target, TrendingUp } from 'lucide-react'
import { isFeatureEnabled } from '../../constants/features'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, feature: 'DASHBOARD' },
  { id: 'servers', label: 'Server Browser', icon: Server, feature: 'SERVERS' },
  { id: 'delivery', label: 'Weekly Delivery', icon: ClipboardList, feature: 'WEEKLY_DELIVERY' },
  { id: 'inventory', label: 'Stash Inventory', icon: Archive, feature: 'INVENTORY' },
  { id: 'bounty', label: 'Bounty Calculator', icon: Target, feature: 'BOUNTY_CALCULATOR' },
  { id: 'market', label: 'Market Browser', icon: TrendingUp, feature: 'MARKET_BROWSER' }
].filter(item => !item.feature || isFeatureEnabled(item.feature))

function Sidebar({ currentPage, onNavigate }) {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 bg-gray-800 min-h-screen p-4 flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white mb-1">Tibia Data Vault</h1>
          <p className="text-xs text-gray-400">Database & Analytics</p>
        </div>

        <nav className="flex-1">
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              const isDisabled = item.comingSoon

              return (
                <li key={item.id}>
                  <button
                    onClick={() => !isDisabled && onNavigate(item.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isDisabled
                        ? 'text-gray-500 cursor-not-allowed'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.comingSoon && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                        Soon
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-500">
            <p>Version 1.0.0</p>
          </div>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-sm font-bold text-white">Tibia Data Vault</h1>
        <div className="flex gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`p-2 rounded-lg transition-all ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

Sidebar.propTypes = {
  currentPage: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired
}

export default Sidebar
