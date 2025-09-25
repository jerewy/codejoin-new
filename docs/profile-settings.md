# Profile Settings Integration Guide

## Purpose
`ProfileSettingsCard` (`components/profile-settings-card.tsx`) replaces the mock profile form in `app/settings/page.tsx`. It loads the signed-in Supabase user, renders their profile details, and persists edits back to Supabase Auth and the `profiles` table.

## Component Anatomy
- **State**: Tracks the editable profile (`name`, `email`, `bio`, `location`, `website`), the original email (to detect changes), loading+saving flags, and the active `userId`.
- **Hooks**: `useToast` for feedback, React `useCallback`/`useEffect` for Supabase requests and auth listeners.
- **UI**: Card layout with inputs for profile fields. Save button disables while loading or when no user is logged in.

## Data Flow
1. `supabase.auth.getUser()` fetches the active session. Metadata (e.g. `full_name`, `bio`) becomes the initial profile state.
2. An additional query to `profiles` fills `full_name`/`email` from the SQL table when present.
3. The component listens to `supabase.auth.onAuthStateChange`. Logging out clears the form; new sessions trigger a refresh.

## Persisting Changes
- On submit the component:
  1. Builds an `updateUser` payload with profile metadata and optional email update.
  2. Calls `supabase.auth.updateUser` to update the auth profile (and trigger Supabase email change flow when needed).
  3. Upserts into `profiles` so SQL data stays in sync (`id`, `full_name`, `email`).
  4. Refetches the profile to show the saved state and surfaces a toast message.
- Errors from either request show a destructive toast and keep the previous values.

## Customising Fields
- To add more metadata, extend the `ProfileFormState` type near the top of `profile-settings-card.tsx`, update the form inputs, and include the new properties in both the `updateUser` payload and `upsert` call.
- Additional columns in the `profiles` table must be covered by matching Supabase policies (see `docs/authentication.md`).

## Styling & UX Adjustments
- Avatar handling is stubbed out (button is disabled while loading). Swap this section with your own upload workflow as needed.
- Validation is minimal. Add client-side rules before calling Supabase if you want stronger constraints.

## Environment Requirements
Ensure these env vars are set (see `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Placing the Card Elsewhere
Import and render the card in any client component after the user is authenticated:
```tsx
import ProfileSettingsCard from "@/components/profile-settings-card";

export default function AccountPage() {
  return (
    <div className="max-w-3xl mx-auto py-10">
      <ProfileSettingsCard />
    </div>
  );
}
```

## Related Files
- `app/settings/page.tsx` – renders `<ProfileSettingsCard />` inside the Profile tab.
- `lib/supabaseClient.ts` – creates the browser Supabase client used here.
- `docs/authentication.md` – outlines the Supabase schema, trigger, and RLS policies referenced by the component.
## Integrating On The Settings Page
- `app/settings/page.tsx` imports the card and renders it inside the profile tab: look for `<ProfileSettingsCard />` around line 95.
- The only local state left in that file is `notifications`; make sure its `useState` call stays closed (`});`) before the JSX `return`.
- If you refactor the surrounding layout, keep the comment `{/* Header */}` or remove it—avoid leaving a trailing space like `{/* Header */ }`, because Next.js will throw `Expected ',' got 'className'` while parsing the JSX.
- After edits, restart `npm run dev` or rerun `npm run build` so the updated component is compiled.

## Troubleshooting
- "Expected ',' got 'className'" at the first `<div>` usually means the `notifications` object literal or the header comment wasn't closed properly. Restore the snippet shown above and rebuild.
- Build still fails? Run `npm run lint` to surface other syntax issues and confirm your editor saved the file.
