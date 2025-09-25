# Repository Guidelines

## Project Structure & Module Organization
Core Next.js app lives in `app/` (App Router pages), `components/` holds shared UI (PascalCase files), `lib/` stores API helpers and typing, `styles/` carries Tailwind layers, and static assets go in `public/`. The Docker-backed code execution service is isolated in `code-execution-backend/` with its own `src/`, `tests/`, `docker/`, and scripts. Docs for onboarding sit under `docs/`; keep new ADRs or specs there. Reusable hooks belong in `hooks/`, and place shared config (e.g., feature flags) inside `lib/config.ts` to avoid circular imports.

## Build, Test & Development Commands
Frontend: `npm run dev` launches the custom `server.js` proxy that connects to the backend; use `npm run dev:next` when you need a plain Next dev server. `npm run build` and `npm start` produce and serve production artifacts. Run `npm run lint` before committing. Backend: `cd code-execution-backend && npm run dev` starts the API with nodemon, `npm run docker:build` refreshes language runners, and `npm test` executes Jest suites.

## Coding Style & Naming Conventions
Use TypeScript across new modules and maintain the existing 2-space indentation. Component files are PascalCase, hooks are camelCase, and constants live in SCREAMING_SNAKE_CASE files under `lib/`. Tailwind is the default styling layer; prefer utility classes and shared variants via `class-variance-authority`. ESLint extends `next/core-web-vitals`; resolve all warnings locally. Co-locate styles or helpers with their consuming component when they are not reused.

## Testing Guidelines
Backend tests live in `code-execution-backend/tests/*.test.js` and run with Jest + Supertest; mirror that pattern for new suites. When adding execution languages, cover success, timeout, and sandbox failure paths. Frontend currently lacks automated coverage, so add React Testing Library or Playwright specs for critical flows and document the setup in `docs/`. Always verify cross-service workflows manually by running both servers together.

## Commit & Pull Request Guidelines
Recent history mixes styles; align on `<type>: <subject>` (e.g., `feat: add collaborative cursor sync`). Keep subjects under 70 chars and write imperative mood. Each pull request must describe the change, note affected routes, and link Jira/GitHub issues. Attach screenshots or screen recordings for UI shifts and mention backend migration steps explicitly.

## Security & Configuration Tips
Environment secrets belong in `.env.local` (frontend) and `code-execution-backend/.env`; never commit them. The backend runs containers without network access, so avoid introducing APIs that assume outbound calls. When adding third-party modules, note their security posture in the PR and update `docs/` if new ports or keys are required.
