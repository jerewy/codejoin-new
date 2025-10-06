import { THEME_COOKIE_NAME, THEME_COOKIE_MAX_AGE, type ThemeOption } from './theme-cookies'

/**
 * Client-side utility to get theme from cookies
 */
export function getClientTheme(): ThemeOption {
  if (typeof document === 'undefined') {
    return 'system'
  }

  const cookies = document.cookie.split(';')
  const themeCookie = cookies.find(cookie =>
    cookie.trim().startsWith(`${THEME_COOKIE_NAME}=`)
  )

  if (!themeCookie) {
    return 'system'
  }

  const value = themeCookie.split('=')[1]?.trim()
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value
  }

  return 'system'
}

/**
 * Client-side utility to set theme cookie
 */
export function setClientThemeCookie(theme: ThemeOption): void {
  if (typeof document === 'undefined') {
    return
  }

  const expires = new Date()
  expires.setTime(expires.getTime() + THEME_COOKIE_MAX_AGE * 1000)

  document.cookie = `${THEME_COOKIE_NAME}=${theme}; expires=${expires.toUTCString()}; path=/; ${process.env.NODE_ENV === 'production' ? 'secure;' : ''} sameSite=lax`
}

/**
 * Utility to delete theme cookie
 */
export function deleteThemeCookie(): void {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${THEME_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}