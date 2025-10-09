import { cookies } from 'next/headers'
import { THEME_COOKIE_NAME, THEME_COOKIE_MAX_AGE, type ThemeOption } from './theme-cookies'

/**
 * Server-side utility to get theme from cookies
 */
export async function getThemeFromCookie(): Promise<ThemeOption> {
  try {
    const cookieStore = await cookies()
    const themeCookie = cookieStore.get(THEME_COOKIE_NAME)

    if (!themeCookie) {
      return 'system'
    }

    const value = themeCookie.value
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value
    }

    return 'system'
  } catch (error) {
    // Fallback if cookies() is not available
    return 'system'
  }
}

/**
 * Server-side utility to set theme cookie
 */
export async function setThemeCookie(theme: ThemeOption): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.set(THEME_COOKIE_NAME, theme, {
      maxAge: THEME_COOKIE_MAX_AGE,
      path: '/',
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })
  } catch (error) {
    console.warn('Failed to set theme cookie on server:', error)
  }
}