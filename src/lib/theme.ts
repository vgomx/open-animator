import { STORAGE_KEYS } from '@/lib/app'

export type ThemeMode = 'light' | 'dark' | 'system'

export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode
}

export function loadThemeMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEYS.theme)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }

  return 'system'
}

export function applyTheme(mode: ThemeMode): 'light' | 'dark' {
  const resolved = resolveTheme(mode)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  return resolved
}

export function saveThemeMode(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEYS.theme, mode)
}

export function initThemeFromStorage(): ThemeMode {
  const mode = loadThemeMode()
  applyTheme(mode)
  return mode
}
