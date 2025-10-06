"use client"

import { useTheme } from 'next-themes'
import { useCallback, useEffect } from 'react'
import { ThemeOption } from '@/lib/theme-cookies'
import { getClientTheme, setClientThemeCookie } from '@/lib/theme-cookies-client'

export function useThemePersistent() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  // Initialize theme from cookie on mount
  useEffect(() => {
    const savedTheme = getClientTheme()
    if (savedTheme !== 'system' && theme !== savedTheme) {
      setTheme(savedTheme)
    }
  }, [setTheme])

  // Enhanced setTheme function that also saves to cookie
  const setThemeWithCookie = useCallback((newTheme: ThemeOption) => {
    setTheme(newTheme)
    setClientThemeCookie(newTheme)
  }, [setTheme])

  return {
    theme: theme as ThemeOption,
    resolvedTheme: resolvedTheme as 'light' | 'dark',
    setTheme: setThemeWithCookie,
  }
}