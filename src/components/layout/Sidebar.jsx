import PropTypes from 'prop-types'
import { Server, Home, Package, ClipboardList, Archive } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'servers', label: 'Server Browser', icon: Server },
  { id: 'exporteitor', label: 'Exporteitor', icon: Package },
  { id: 'delivery', label: 'Weekly Delivery', icon: ClipboardList },
  { id: 'inventory', label: 'Stash Inventory', icon: Archive }
]

function Sidebar({ currentPage, onNavigate }) {
  return (
    <div className="w-64 bg-gray-800 min-h-screen p-4 flex flex-col">
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
  )
}

Sidebar.propTypes = {
  currentPage: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired
}

export default Sidebar
