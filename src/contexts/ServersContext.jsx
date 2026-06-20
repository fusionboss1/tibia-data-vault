import { createContext, useContext } from 'react'
import { useServers } from '../hooks/useServers'

const ServersContext = createContext(null)

export function ServersProvider({ children }) {
  const value = useServers()
  return <ServersContext.Provider value={value}>{children}</ServersContext.Provider>
}

export function useServersContext() {
  const ctx = useContext(ServersContext)
  if (!ctx) throw new Error('useServersContext must be used within ServersProvider')
  return ctx
}
