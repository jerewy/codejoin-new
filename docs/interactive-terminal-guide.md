# Interactive Terminal Integration Guide

This document expands on the high-level recommendations for replacing the mock terminal with a secure, websocket-driven experience. Follow the phases below to wire the front end to the backend and reuse the existing Docker sandbox.

## 1. Understand the Current Limitations
- The `TerminalPanel` component (`components/project-workspace.tsx`) stores commands in React state and switches on hard-coded strings. No real shell process is invoked, so built-in commands like `ls` or `pwd` always return canned strings and "clear" just resets local state. 【F:components/project-workspace.tsx†L132-L208】
- Collaboration sockets are already available through the `SocketProvider`, but the terminal component never emits or listens to any events, which is why inputs stay local. 【F:lib/socket.tsx†L1-L124】
- The backend Socket.IO server only handles collaboration and execution result events today. There is no namespace for streaming stdin/stdout, so a new channel is required. 【F:server.js†L1-L120】

## 2. Frontend Wiring
1. **Extend the socket context**: add helpers such as `startTerminalSession`, `sendTerminalInput`, and `stopTerminalSession` that wrap `socket.emit` calls. Use a dedicated namespace/event set (e.g., `terminal:start`, `terminal:data`, `terminal:exit`). 【F:lib/socket.tsx†L13-L124】
2. **Connect the terminal UI**:
   - Replace the `switch` inside `handleCommand` with an emit to `sendTerminalInput`.
   - Subscribe to streamed output using `socket.on('terminal:data', ...)` and append those chunks to state for rendering.
   - Disable the input field until you receive an acknowledgment from `terminal:start` so that the user cannot send data before the PTY is ready.
3. **Session lifecycle**: on component mount, call `startTerminalSession({ projectId, userId })`. On unmount or when the user clicks "Stop", call `stopTerminalSession`. Store the returned `sessionId` so that multiple terminals can coexist.
4. **Key handling**: capture `Enter` to emit newline-terminated commands, but also forward special keys (arrow keys, Ctrl+C) by sending raw key sequences, since a PTY expects byte streams instead of parsed commands.

## 3. Backend Session Handling
1. **Socket.IO namespace**: inside `server.js`, register listeners such as:
   ```js
   socket.on('terminal:start', async ({ projectId, userId }) => { ... })
   socket.on('terminal:input', ({ sessionId, data }) => { ... })
   socket.on('terminal:stop', ({ sessionId }) => { ... })
   socket.on('disconnect', () => { ...stop active sessions... })
   ```
   Keep a map of `sessionId -> { container, stream }` scoped to each socket. 【F:server.js†L18-L120】
2. **Reuse DockerService safeguards**: instantiate `DockerService` and call a new method like `createInteractiveContainer(languageConfig)` that starts the same sandboxed container but with `Tty: true`, `OpenStdin: true`, and attaches to its stdio streams. The service already enforces `NetworkMode: 'none'`, `User: 'nobody'`, CPU/memory quotas, and capability drops, so you inherit the existing security posture. 【F:code-execution-backend/src/services/dockerService.js†L1-L118】
3. **Stream data**: when the container is ready, pipe `container.modem.demuxStream(stream, stdout, stderr)` (or use `container.attach({ stream: true, stdout: true, stderr: true, stdin: true, tty: true })`). Forward stdout/stderr chunks back to the client via `socket.emit('terminal:data', { sessionId, chunk })`.
4. **Handle input**: on `terminal:input`, write the raw data to the attached stdin stream (`stream.write(data)`). Remember to append `"\r"` when the frontend sends `Enter`.
5. **Cleanup**: when the client disconnects or calls `terminal:stop`, destroy the stdin stream, stop the container, and remove the map entry. You can reuse the existing `cleanup` method to ensure the container is removed even if the session exits unexpectedly. 【F:code-execution-backend/src/services/dockerService.js†L71-L109】

## 4. Session Security & Observability
- **Authentication**: reuse your existing project auth context to ensure only authorized users can request sessions. Reject unauthenticated `terminal:start` messages.
- **Rate limiting**: prevent abuse by limiting concurrent sessions per user/project and throttling `terminal:input` frequency.
- **Idle timeout**: automatically stop sessions after X minutes of inactivity by tracking the last input timestamp.
- **Auditing**: log start/stop events and container IDs via the existing logger so you can trace sessions if something misbehaves.

## 5. Testing Checklist
- Verify multiple browser tabs can start independent sessions without crosstalk.
- Confirm Ctrl+C terminates a running process and the prompt returns.
- Attempt restricted operations (e.g., `ping google.com`) to ensure the sandbox denies network access.
- Run `npm run lint` and any backend tests after wiring everything to guard against regressions.

Following these steps will let the terminal UI interact with a real shell while keeping the Docker-based sandbox and collaboration infrastructure secure.
