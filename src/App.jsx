import { useState } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Servers from './pages/Servers'
import WeeklyDelivery from './pages/WeeklyDelivery'
import Inventory from './pages/Inventory'
import BountyCalculator from './pages/BountyCalculator'
import { isFeatureEnabled } from './constants/features'
import { ServersProvider } from './contexts/ServersContext'

function App() {
  const [currentPage, setCurrentPage] = useState('bounty')
  const [mountedPages, setMountedPages] = useState(new Set(['bounty']))

  const handleNavigate = (page) => {
    setMountedPages(prev => new Set([...prev, page]))
    setCurrentPage(page)
  }

  return (
    <ServersProvider>
    <ErrorBoundary>
      <div className="flex min-h-screen bg-gray-900 text-gray-100">
        <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
        <div className="flex-1">
          {isFeatureEnabled('DASHBOARD') && (
            <div className={currentPage === 'dashboard' ? '' : 'hidden'}><Dashboard onNavigate={handleNavigate} /></div>
          )}
          {isFeatureEnabled('SERVERS') && mountedPages.has('servers') && (
            <div className={currentPage === 'servers' ? '' : 'hidden'}><Servers /></div>
          )}
          {isFeatureEnabled('WEEKLY_DELIVERY') && mountedPages.has('delivery') && (
            <div className={currentPage === 'delivery' ? '' : 'hidden'}><WeeklyDelivery /></div>
          )}
          {isFeatureEnabled('INVENTORY') && mountedPages.has('inventory') && (
            <div className={currentPage === 'inventory' ? '' : 'hidden'}><Inventory /></div>
          )}
          {isFeatureEnabled('BOUNTY_CALCULATOR') && mountedPages.has('bounty') && (
            <div className={currentPage === 'bounty' ? '' : 'hidden'}><BountyCalculator /></div>
          )}
        </div>
      </div>
    </ErrorBoundary>
    </ServersProvider>
  )
}

export default App
