# Collaborative Workspace Core

## Overview
The `components/project-workspace.tsx` shell keeps the original multi-panel layout (file explorer, Monaco editor, live preview toggle, terminal/problems tabs, team chat) while steering state through a simplified MVP flow.

## Autosave & Persistence
- Writes go through `updateNodeContent` which targets Supabase when credentials exist and falls back to localStorage (`codejoin:project:<id>:nodes`) otherwise.
- The editor sets `hasUnsavedChanges` on local mutations and debounces autosave via `autosaveTimerRef`. Manual `Save` uses the same helper and updates the toolbar badge.
- Autosave states map to badge variants: `idle` (outline), `saving` (secondary), `saved` (outline/local copy), `error` (destructive) and always leave the button enabled for retries.

## Terminal & Interactive Runs
- `shouldUseInteractiveExecution` guards the run flow. If a file appears to read stdin, the workspace switches to the Terminal tab and relies on the interactive session before falling back to the one-shot executor.
- The terminal pipeline continues to stream user input over `terminal:input`. When the session cannot start (missing language/runtime), we prompt for buffered stdin and replay through the standard executor.

## Remote Collaboration
- `lib/socket.tsx` now derives remote cursor state internally and publishes it through `useFileCollaboration`. `components/code-editor.tsx` renders those cursors using a template literal CSS injector, fixing the previous string concatenation bug.
- File change, cursor move, and file select events maintain the same contract, so older consumers don’t need to change anything besides wiring the new cursor array.

## Layout Guardrails
- Extensions/settings tabs in the explorer and the execution history pane were removed intentionally; keep the Files explorer, Monaco editor, Live Preview toggle, Terminal/Problems tabs, and Team Chat sidebar intact.
- Status badges (backend health + autosave) live next to the Run/Save/Share controls—avoid moving them unless we redesign the top toolbar.

## Developer Checklist
1. Verify Supabase writes by running with `.env.local`; then remove the env vars to ensure localStorage fallback rehydrates the tree.
2. Open two browser sessions, edit the same file, and confirm remote cursor decorations appear in both editors.
3. Run an interactive snippet (e.g., Python `input()`), answer via the terminal, and confirm non-interactive fallback still succeeds when you stop the terminal service.
4. Keep `shouldUseInteractiveExecution` in sync when adding new languages—update both the regex list and interactive extension set.
