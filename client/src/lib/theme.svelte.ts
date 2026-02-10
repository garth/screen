import { browser } from '$app/environment'

export type ThemePreference = 'system' | 'dark' | 'light'

function getStoredPreference(): ThemePreference {
  if (!browser) return 'system'
  const stored = localStorage.getItem('theme-preference')
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  return 'system'
}

function getSystemTheme(): 'dark' | 'light' {
  if (!browser) return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(preference: ThemePreference) {
  if (!browser) return
  const isDark = preference === 'system' ? getSystemTheme() === 'dark' : preference === 'dark'
  document.documentElement.setAttribute('data-theme', isDark ? 'mocha' : 'latte')
  // Update theme-color meta tag (Catppuccin base colors)
  const themeColor = document.getElementById('theme-color')
  if (themeColor) themeColor.setAttribute('content', isDark ? '#1e1e2e' : '#eff1f5')
}

class ThemeStore {
  preference = $state<ThemePreference>(getStoredPreference())

  constructor() {
    if (browser) {
      // Apply initial theme
      applyTheme(this.preference)

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', () => {
        if (this.preference === 'system') {
          applyTheme('system')
        }
      })
    }
  }

  setPreference(preference: ThemePreference) {
    this.preference = preference
    if (browser) {
      localStorage.setItem('theme-preference', preference)
      applyTheme(preference)
    }
  }
}

export const theme = new ThemeStore()
