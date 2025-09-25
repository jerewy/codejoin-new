# Teams Module Overview

## Purpose
The teams dashboard now pulls live data through a dedicated API route instead of relying on hard-coded arrays. This change keeps the UI in sync with the backend and makes it easy to swap in real persistence later.

## Data Flow
1. `GET /api/teams` returns enriched team objects sourced from `lib/data/teams.ts`.
2. The page component (`app/teams/page.tsx`) fetches this endpoint on mount, stores the payload in local state, and keeps the selected team ID stable across refreshes.
3. Local creation and invitation actions update the in-memory list optimistically while you wire up a persistence layer.

## UI Enhancements
- Skeletons and an error banner communicate loading and failure states.
- The detail view shows live member/project metrics, project progress bars, and contributor chips.
- Tabs split members, projects, and settings for easier scanning.

## Extending the Feature
- Replace `TEAM_DATA` with Supabase or another data source when ready.
- Update `lib/data/teams.ts` types if additional fields are required; the API response is passed straight through to the UI.
- Adjust `handleCreateTeam`/`handleInviteMember` to call your backend once persistence exists.

Keep this doc handy when revisiting the module so future updates stay consistent with the new data-driven approach.
