'use client'

import React from 'react'
import { useTheme } from './ThemeProvider'
import { Switch } from './ui/switch'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  showLabel?: boolean
  className?: string
}

export function ThemeToggle({ showLabel = true, className = '' }: ThemeToggleProps) {
  const { theme, setTheme, isDark } = useTheme()

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-2">
          <Sun className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-orange-400'}`} />
          <span className="text-sm font-medium mr-2">Dark Mode</span>
        </div>
      )}
      
      <Switch
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label="Toggle dark mode"
      />
      
      {!showLabel && (
        <div className="flex items-center">
          {isDark ? (
            <Moon className="h-4 w-4 text-indigo-300" />
          ) : (
            <Sun className="h-4 w-4 text-orange-400" />
          )}
        </div>
      )}
    </div>
  )
} 