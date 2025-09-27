# Loading Behavior & Hidden Fallbacks

This doc explains why the dashboard used to flash two different loading UI states ("Loading..." and "Loading your dashboard...") and how the new unified loader works. Use it as a reference when adjusting loading behavior or adding new pages.

## Overview

The app mixes global UI rendered from the App Router with client-side hydration logic. Several components participate in the loading experience:

- app/loading.tsx is the App Router's global suspense fallback. It now reuses components/LoadingScreen.tsx to show the branded skeleton.
- components/app-layout.tsx hydrates on the client before it can read localStorage and determine sidebar state. While isHydrated is false, it returns a loading UI so the DOM matches on both server and client.
- Route files like app/dashboard/page.tsx manage their own data fetching and show a skeleton until Supabase queries finish.
- components/route-change-indicator.tsx hooks into next/router events to show a floating status during client-side navigation.

When these layers are not aligned, multiple loaders can appear back-to-back during a refresh.

## How the "Hidden" Loading Screen Appeared

The dashboard refresh sequence looked like this before we standardized things:

1. Global suspense rendered the route-level loading.tsx skeleton.
2. Once React streamed the dashboard shell, components/app-layout.tsx hydrated. Its hydration guard returned a simple <div>Loading...</div> while it read localStorage. This overlay briefly replaced the global skeleton.
3. After hydration, app/dashboard/page.tsx still needed to fetch data. Its local state fallback returned <div>Loading your dashboard...</div>.

Because the app layout and dashboard page used plain text placeholders, users saw three different loading messages in quick succession.

### Code References

- Hydration guard: components/app-layout.tsx:73
- Dashboard fallback: app/dashboard/page.tsx:563
- Route change indicator copy: components/route-change-indicator.tsx:72

## Current Loading Flow

We consolidated the experience by reusing a shared component everywhere:

    // app/loading.tsx
    import { LoadingScreen } from "@/components/LoadingScreen";

    export default function GlobalLoading() {
      return <LoadingScreen />;
    }

components/LoadingScreen.tsx handles the brand mark, ping animation, and skeleton placeholders. Other layers now render the same component so the visual language stays consistent:

- components/app-layout.tsx renders LoadingScreen with message "Reconnecting to your workspace…" during hydration.
- app/dashboard/page.tsx exposes DashboardSkeleton, a route-specific skeleton that mirrors the main dashboard layout.
- components/route-change-indicator.tsx keeps the floating banner but uses matching language: "Syncing your workspace…".

## When to Use Each Loader

- Global fallback (app/loading.tsx): runs automatically for any route without a custom loading.tsx. Keep it broad and brand aligned.
- Layout hydration guard: use LoadingScreen with tailored copy when a client layout has to wait for browser APIs (for example, localStorage). Avoid plain text placeholders so refreshes feel seamless.
- Route-specific skeletons: when a page fetches data client-side, render a skeleton that approximates the final layout. Use Skeleton components from @/components/ui/skeleton to keep spacing consistent.
- Route change indicator: keep the floating banner lightweight; it should confirm that navigation is happening, not replace page skeletons.

## Extending the Pattern

- Pass custom message and description props to LoadingScreen for context-specific copy (for example, "Preparing team insights…").
- Toggle the showSkeleton prop if a lightweight spinner is more appropriate (login flows, modal mounts, and so on).
- If a new route requires bespoke placeholders, build them on top of the same building blocks (Skeleton, LoadingScreen) so the transitions remain cohesive.

By centralizing loading UI, we eliminated the "hidden" overlay and ensured that refreshes show a single, branded experience before the dashboard skeleton fades in.
