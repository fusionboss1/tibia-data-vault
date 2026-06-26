import { useState } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import Sidebar from './components/layout/Sidebar'
import BountyCalculator from './pages/BountyCalculator'
import { ServersProvider } from './contexts/ServersContext'

function App() {
  const [currentPage, setCurrentPage] = useState('bounty')

  const handleNavigate = (page) => {
    setCurrentPage(page)
  }

  return (
    <ServersProvider>
    <ErrorBoundary>
      <div className="flex min-h-screen bg-gray-900 text-gray-100">
        <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
        <div className="flex-1">
          <BountyCalculator />
        </div>
      </div>
    </ErrorBoundary>
    </ServersProvider>
  )
}

export default App
