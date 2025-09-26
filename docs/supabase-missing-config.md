# Handling Missing Supabase Configuration

This document explains the issue we fixed around missing Supabase credentials, how the new implementation works, and how to configure the project for different environments.

## Background: The Original Error

The app originally instantiated a Supabase browser client as soon as modules were loaded. When either `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` was absent (the default for marketing-only setups), Supabase threw an error and the app crashed before any UI rendered. Auth-dependent screens such as the dashboard, project workspace, and profile settings became inaccessible, even though unauthenticated marketing pages should work fine without Supabase.

## The Fix

We introduced a lazy initializer that creates the Supabase client only when the required environment variables exist. Components now call `getSupabaseClient()` when they truly need the client and gracefully handle the `null` case.

Key changes:

- `lib/supabaseClient.ts` exports a `getSupabaseClient()` helper that caches a client instance and returns `null` when credentials are missing.
- `hooks/useAuthStatus.ts` asks the helper for a client, defaults `isLoggedIn` to `false`, and skips listener registration if Supabase is unavailable.
- Auth-related UI (app layout, auth buttons, and login providers) treat the absence of Supabase as a logged-out state and disable actions that would otherwise error.
- Protected pages show a friendly message explaining that Supabase must be configured to access authenticated areas.

## Developer Workflow

1. **Marketing-only or local demo** – leave Supabase variables undefined. The UI will render public pages, hide auth-only features, and surface guidance wherever Supabase is required.
2. **Full auth experience** – create `.env.local` and define:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
   ```
   Restart the dev server to pick up the values.

## Testing Tips

- Navigate to `/dashboard` without the env vars to confirm you see the access guidance instead of runtime crashes.
- Add the env vars, reload, and ensure login/signup flows operate normally.

## Related Files

- [`lib/supabaseClient.ts`](../lib/supabaseClient.ts)
- [`hooks/useAuthStatus.ts`](../hooks/useAuthStatus.ts)
- [`components/app-layout.tsx`](../components/app-layout.tsx)
- [`components/auth-buttons.tsx`](../components/auth-buttons.tsx)
- [`README.md`](../README.md) – quick-start notes on optional Supabase configuration.

