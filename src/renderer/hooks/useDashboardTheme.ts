import { useCallback, useEffect, useState } from 'react'

export type DashboardTheme = 'light' | 'dark'

const STORAGE_KEY = 'timedock-dashboard-theme'
const CHANGE_EVENT = 'timedock-dashboard-theme-change'
const DEFAULT_THEME: DashboardTheme = 'light'

function isDashboardTheme(value: string | null): value is DashboardTheme {
  return value === 'light' || value === 'dark'
}

function getStoredTheme(): DashboardTheme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isDashboardTheme(stored) ? stored : DEFAULT_THEME
}

function applyTheme(theme: DashboardTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.dashboardTheme = theme
  document.body.dataset.dashboardTheme = theme
}

function persistTheme(theme: DashboardTheme): void {
  window.localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
  window.dispatchEvent(new CustomEvent<DashboardTheme>(CHANGE_EVENT, { detail: theme }))
}

export function useDashboardTheme() {
  const [theme, setThemeState] = useState<DashboardTheme>(getStoredTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<DashboardTheme>).detail
      if (isDashboardTheme(nextTheme)) setThemeState(nextTheme)
    }

    window.addEventListener(CHANGE_EVENT, handleThemeChange)
    return () => window.removeEventListener(CHANGE_EVENT, handleThemeChange)
  }, [])

  const setTheme = useCallback((nextTheme: DashboardTheme) => {
    setThemeState(nextTheme)
    persistTheme(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme
  }
}
