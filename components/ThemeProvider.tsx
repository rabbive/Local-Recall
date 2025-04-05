'use client'

import React, { createContext, useState, useEffect, useContext } from 'react'
import { settingsAPI } from '@/app/lib/storage'

type Theme = 'light' | 'dark' | 'system'

interface ThemeProviderProps {
  children: React.ReactNode
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('system')
  const [isDark, setIsDark] = useState(false)

  // Initialize the theme from settings
  useEffect(() => {
    const initTheme = async () => {
      try {
        const settings = await settingsAPI.getSettings()
        if (settings.darkMode !== undefined) {
          // If darkMode is true/false, set to dark/light
          setTheme(settings.darkMode ? 'dark' : 'light')
        } else if (settings.theme) {
          // For backward compatibility
          setTheme(settings.theme as Theme)
        }
      } catch (error) {
        console.error('Failed to load theme from settings:', error)
      }
    }

    initTheme()
  }, [])

  // Update the document class when theme changes
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
      setIsDark(systemTheme === 'dark')
    } else {
      root.classList.add(theme)
      setIsDark(theme === 'dark')
    }
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      if (theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light'
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(systemTheme)
        setIsDark(systemTheme === 'dark')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // Save theme changes to settings
  const updateTheme = async (newTheme: Theme) => {
    setTheme(newTheme)
    
    try {
      const settings = await settingsAPI.getSettings()
      await settingsAPI.updateSettings({
        ...settings,
        theme: newTheme,
        darkMode: newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      })
    } catch (error) {
      console.error('Failed to save theme to settings:', error)
    }
  }

  const value = {
    theme,
    setTheme: updateTheme,
    isDark
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
} 