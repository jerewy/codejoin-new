import { getThemeFromCookie } from "@/lib/theme-cookies-server"
import { ThemeProviderWrapper } from "@/components/theme-provider-wrapper"
import type { ThemeProviderProps } from "next-themes"

interface ServerThemeProviderProps extends ThemeProviderProps {
  children: React.ReactNode
}

export async function ServerThemeProvider({ children, ...props }: ServerThemeProviderProps) {
  // Get theme from cookie on server side asynchronously
  const cookieTheme = await getThemeFromCookie()

  return (
    <ThemeProviderWrapper
      {...props}
      cookieTheme={cookieTheme}
    >
      {children}
    </ThemeProviderWrapper>
  )
}