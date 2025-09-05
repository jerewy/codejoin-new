// lib/supabaseServer.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  // 1) await the cookie store
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // 2) implement the deprecated get/set/remove API
      cookies: {
        get: (name: string) => {
          // returns the cookie value or null
          const c = cookieStore.get(name)
          return c ? c.value : null
        },
        set: (name: string, value: string, options?: CookieOptions) => {
          // Next.js wants you to pass an object here
          cookieStore.set({ name, value, ...options })
        },
        remove: (name: string, options?: CookieOptions) => {
          // deleting via setting an expired/empty cookie
          cookieStore.set({ name, value: '', maxAge: 0, ...options })
        },
      },
    }
  )
}
