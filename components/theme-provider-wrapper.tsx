import { ThemeProvider } from "@/components/theme-provider"
import type { ThemeProviderProps } from "next-themes"
import { getThemeFromCookie } from "@/lib/theme-cookies-server"
import type { ThemeOption } from "@/lib/theme-cookies"

interface ThemeProviderWrapperProps extends ThemeProviderProps {
  children: React.ReactNode
  cookieTheme?: ThemeOption
}

export function ThemeProviderWrapper({ children, cookieTheme, ...props }: ThemeProviderWrapperProps) {
  return (
    <ThemeProvider
      {...props}
      defaultTheme={cookieTheme || props.defaultTheme || 'system'}
    >
      {children}
    </ThemeProvider>
  )
}