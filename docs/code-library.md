# Code Library Overview

The templates section has been rebuilt as the **Code Library** page (`app/templates-section/page.tsx`).

## Data Sources
- **Starter kits** live in `lib/data/starter-projects.ts` and cover all 11 supported languages. Each entry exposes metadata (difficulty, downloads, rating, tags) plus the starter file tree used by `/new-project`.
- **Community showcase** queries Supabase (`projects` table) for `visibility = "public"` projects. Fields are normalised into the `TemplateCard` shape so the UI can render published projects from contributors.
- Both sources flow through a shared `TemplateSummary` type (derived from `TemplateCard` props) so preview cards and the modal accept the same structure.

## UI Structure
1. **Header** - `SidebarTrigger` + library title, emphasising the curated + community mix.
2. **Search & Filters** - reusable `languages` array derived from `starterProjectLanguages`. The selected language filters both tabs; the search box matches name, description, and tags.
3. **Tabs** - `Tabs` component splits the experience into "Starter Kits" and "Community Showcase".
   - Starter tab renders `featuredStarterProjects` followed by the filtered starter grid.
   - Community tab lists Supabase results, with empty/error states and a manual refresh button.
4. **TemplateCard / TemplatePreview** - both components were updated to accept optional fields so either dataset can render without hard-coded fallbacks.

## Supabase Behaviour
- Fetch happens on mount via `loadCommunityTemplates` (wrapped in `useCallback`).
- Failures are captured and surfaced with a retry button; success maps rows to `TemplateSummary` objects (rating/downloads default sensibly when not provided).
- Additional filters run client-side to keep the UI responsive.

## Extending The Library
- To add a new starter kit: extend `starterProjects` in `lib/data/starter-projects.ts` (the `starterProjectLanguages` helper will pick it up automatically).
- To expose more community metadata (e.g., forks, stars), include the column in the Supabase query and add it to `TemplateCard`/`TemplatePreview` props.
- To change the page title or navigation, edit the header block in `app/templates-section/page.tsx`.

## Troubleshooting: Starter Project Data
- **Symptom**: `/new-project` crashed with `Cannot read properties of undefined (reading 'map')` when resolving `starterProjectLanguages`.
- **Root cause**: An empty shim file (`lib/data/starter-projects.tsx`) shadowed the real data module (`.ts`). Next 15 resolves extensionless imports by prioritising `.tsx`, so every consumer received an `undefined` export.
- **Fix**: Delete the shim (`rm lib/data/starter-projects.tsx`) so the bundler loads `starter-projects.ts`. Restart the dev server to rebuild the module graph.
- **Prevention**: Avoid creating parallel `.tsx` and `.ts` files for the same module name unless both export real code. When you need generated output, keep it in `.ts` and document the generator (`make_starter_projects.py`). Use `import "@/lib/data/starter-projects"` consistently and run `npm run lint` to catch missing exports early.
