import { useState } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Servers from './pages/Servers'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const handleNavigate = (page) => {
    setCurrentPage(page)
  }

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-gray-900 text-gray-100">
        <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
        <div className="flex-1">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'servers' && <Servers />}
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
