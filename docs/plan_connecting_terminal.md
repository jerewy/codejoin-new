# 🖥️ CodeJoin Real Terminal Integration Plan

This plan explains how to evolve CodeJoin's simulated terminal panel into a full xterm.js experience that streams directly from the sandboxed Docker containers managed by our existing Socket.IO + Docker service. The focus is on incrementally upgrading the `ProjectWorkspace` UI and reusing the real-time infrastructure that already powers `/server.js` and `code-execution-backend/src/services/dockerService.ts`.

---

## 1. Current State Snapshot

- **Frontend** – `components/project-workspace.tsx` renders a faux terminal using `<pre>` output + `<input>` for commands. It already manages session lifecycle, command history, Monaco "Run in terminal" triggers, and Socket.IO event wiring (`terminal:*`).
- **Server** – `server.js` hosts Next.js and a Socket.IO server. It proxies terminal events to `dockerService.createInteractiveContainer`, normalizes input (handles `CTRL-C`), and tears down sessions.
- **Sandbox** – `code-execution-backend/src/services/dockerService.ts` starts interactive containers with `AttachStdout/Stderr/Stdin` + `TTY=true`, exposing a Node stream for bi-directional data. The service already sets `TERM=xterm` and `PS1=user@codejoin:~$`.
- **Gap** – The stream is consumed as UTF-8 text and re-rendered manually. We miss terminal control sequences (colors, cursor movement), resizing, copy/paste fidelity, and advanced input modes (arrow keys, paging tools, etc.).

---

## 2. Goals & Non-Goals

**Goals**
1. Replace the faux terminal with a resilient `xterm.js` instance that understands VT sequences, supports mouse selection, and resizes with its container.
2. Preserve the existing session contract (`terminal:start`, `terminal:ready`, `terminal:data`, `terminal:input`, `terminal:stop`, `terminal:exit`).
3. Allow Monaco's "Run" and "Run in terminal" flows to continue without changing higher-level APIs.
4. Ensure sessions keep CodeJoin's security posture (per-language Docker image, non-root user, network disabled).

**Non-Goals**
- Replacing Socket.IO with a raw WebSocket server.
- Rewriting Docker orchestration or adding new language images.
- Delivering collaborative multi-user terminal sharing (future enhancement).

---

## 3. Architecture Decisions

| Topic | Decision |
| --- | --- |
| Transport | Retain Socket.IO. It already multiplexes project collaboration and terminal events, handles reconnects, and is exposed to the frontend. |
| Terminal Emulator | Use `xterm`, `xterm-addon-fit`, `xterm-addon-web-links`, and `@xterm/addon-clipboard` for UX parity with VS Code. |
| Data Flow | Stream Docker stdout/stderr chunks verbatim to xterm. Convert frontend keystrokes to the same payloads we currently ship via `terminal:input`. Reference the [xterm.js VT100 compatibility notes](https://xtermjs.org/docs/) when normalizing control sequences. |
| Resizing | Emit `terminal:resize` Socket.IO event when `xterm` dimensions change so Docker TTY receives `setWindow`. (Add new event pair.) |
| File uploads | Reuse current heredoc helper in `ProjectWorkspace` – xterm only replaces the presentation layer. |

---

## 4. Implementation Plan

### Phase A – Dependencies & Scaffolding

1. Add packages: `npm install xterm xterm-addon-fit xterm-addon-web-links @xterm/addon-clipboard` (frontend only).
2. Ensure global styles import `xterm/css/xterm.css`. Prefer a lazy dynamic import inside the terminal component to avoid SSR issues.
3. Register dedicated terminal scripts in `package.json`:
   ```json
   "scripts": {
     "term:dev": "node server/terminal.ts",
     "term:docker": "ts-node server/terminal-docker.ts"
   }
   ```
   This keeps runbooks deterministic for future automation.
4. Create `components/terminal/TerminalSurface.tsx` (client component) to encapsulate xterm initialization, add-ons, fit handling, selection clipboard, and socket plumbing. Export an imperative API (`focus`, `write`, `dispose`, `sendData`) via `forwardRef` so `ProjectWorkspace` can manage it.

### Phase B – Backend Enhancements (Optional but Recommended)

1. In `server.js`, listen for a new `terminal:resize` event and call `stream.resize(cols, rows)` when `node-pty` is introduced. Because Docker streams currently expose `container.modem.demuxStream`, we need to switch to `pty`-like behavior. Two options:
   - **Preferred:** Wrap Docker attach stream with [`node-pty`](https://github.com/microsoft/node-pty) running on the host and execute `docker exec -it`. Provides native `resize` and signal support. On Windows hosts, prefer launching `powershell.exe`; Linux/macOS can continue with `bash`/`sh` because `node-pty` maps to `forkpty` while Windows relies on `conhost` semantics.
   - **Alternate:** Use Docker's `container.resize({ h, w })` API directly. Works with current attach stream, no extra dependency.
2. Update `dockerService.createInteractiveContainer` to expose a `resize(sessionId, { cols, rows })` helper that proxies to Docker.
3. Handle `terminal:input` binary payloads (Buffer) to support non-UTF8 keystrokes (arrow keys). With Socket.IO we can send `ArrayBuffer`s directly.

### Phase C – Frontend Integration

1. Replace the existing `<pre>` + `<input>` block in `ProjectWorkspace` with the new `TerminalSurface` component. Preserve surrounding layout, toolbar, and status indicators.
2. Translate existing command queue + history logic:
   - Send `enter` via xterm when executing buffered commands so prompts stay in sync.
   - Keep auto-scroll but rely on xterm's viewport.
   - Maintain `terminalOutput` state only for logging / transcripts. Live rendering handled by xterm.
3. Update Monaco integration (`handleExecuteInTerminal`) to call the new imperative API instead of manipulating DOM inputs.
4. Wire up focus events (`window.dispatchEvent("terminalFocusInput")`) to call `terminal.focus()`.
5. Use the Fit addon to respond to container resize. Recalculate when panels collapse/expand.

### Phase D – Observability & UX polish

1. Surface terminal errors via toast/toast-like component when Socket.IO emits `terminal:error`.
2. Add copy shortcut instructions (Ctrl+Shift+C) and configure xterm clipboard add-on.
3. Mirror the theme colors via `xterm` options (`fontFamily`, `theme` palette) so the terminal matches the VS Code aesthetic in `ProjectWorkspace`.
4. Ensure accessibility: set `role="presentation"`, provide an aria-label, and maintain focus outline.

---

## 5. Testing & Validation

| Area | Steps |
| --- | --- |
| Unit | Verify new terminal component logic (event emitters, cleanup) with React Testing Library + Jest DOM. |
| Manual |
- Launch `npm run dev` (frontend) and `npm run dev` inside `code-execution-backend`. Start a project, open terminal, run commands (`ls`, `python3`, `node`).
- Validate interactive programs (`python` input, `gcc` compilation, `nano`/`vi` arrow keys) behave correctly.
- Resize terminal panel, split panes, toggle tabs – ensure xterm resizes cleanly.
- Simulate CTRL+C and ensure container stops.
| Regression | Confirm `/api/execute` non-interactive path still works. Re-run smoke scripts in `debug-*.js` if needed. |
| Security | Verify containers remain isolated (no network). Ensure no new env vars leak to client. Containers should auto-remove after exit and memory should be capped (for example, 512 MB via Docker `HostConfig`) to prevent resource leaks. |

---

## 6. Rollout & Follow-Ups

1. Ship feature behind a temporary workspace feature flag (`lib/config.ts`) to guard alpha rollouts.
2. Update onboarding docs (`README`, support runbook) with new terminal UX and troubleshooting steps.
3. Collect telemetry (counts of start/stop, error rates) by instrumenting Socket.IO events with existing logging utilities.
4. Future enhancement ideas: multi-user shared terminals, persistent history per project, record/replay transcripts for educators.

