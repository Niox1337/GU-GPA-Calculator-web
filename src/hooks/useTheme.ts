import { useEffect } from 'react'
import { usePersistentState } from './usePersistentState'

export type Theme = 'light' | 'dark'

/** Persisted light/dark theme, kept in sync with the <html data-theme> attribute. */
export function useTheme() {
  const [theme, setTheme] = usePersistentState<Theme>('gpa.theme', 'light')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return { theme, toggle }
}
