import { getThemeFromCookie } from "@/lib/theme-cookies-server"
import { ThemeProvider } from "@/components/theme-provider"
import type { ThemeProviderProps } from "next-themes"

interface ThemeProviderWrapperProps extends ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProviderWrapper({ children, ...props }: ThemeProviderWrapperProps) {
  // Get theme from cookie on server side
  const cookieTheme = getThemeFromCookie()

  return (
    <ThemeProvider
      {...props}
      defaultTheme={cookieTheme || props.defaultTheme || 'system'}
    >
      {children}
    </ThemeProvider>
  )
}