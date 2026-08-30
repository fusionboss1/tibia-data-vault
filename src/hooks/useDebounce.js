import { useState, useEffect } from 'react'

export const DEBOUNCE_MS = 300

export function useDebounce(value, delay = DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
