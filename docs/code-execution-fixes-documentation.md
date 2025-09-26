# Code Execution Backend – Debugging Notes & Fix Guide

This document captures the recent investigation into our Docker-based code execution service. It is meant as a learning aid and a future reference for anyone extending the backend or wiring the frontend terminal experience.

## 1. Symptoms We Observed
- **Interactive programs never received stdin**. Even though the API accepted an `input` field, compiled languages like C and Java timed out when calling `scanf`/`Scanner.nextInt()`.
- **Frontend terminal input was disconnected**. Typing `input 5` in the UI printed a message but nothing ever reached the backend when the user ran code.
- **Integration tests were flaky**. Jest would fail with `EADDRINUSE` (port 3001 busy) and the “large code” validation test returned HTTP 200 instead of 400.

## 2. Root Causes
1. **Docker stdin race** – the backend originally attached to the container stream, started the process, and immediately called `stdinStream.end()`. If the program had not yet reached its `read`, the input vanished.
2. **Frontend placeholder command** – the terminal simply echoed “Input sent” and never stored the value anywhere that the editor could use when executing code.
3. **Server bootstrap** – `src/server.js` always opened port 3001 during `require()`, so Jest could not spin up multiple instances on ephemeral ports.
4. **Validation mismatch** – Joi limited the string length but did not enforce byte length; the test generated a 26 KB payload that still passed the rule.

## 3. Fix Overview
| Area | What Changed | Files |
|------|--------------|-------|
| Docker execution | Base64 writes source and optional text file, then pipes input with `cat /tmp/input.txt | …`; result success is now based on exit code only. | `code-execution-backend/src/services/dockerService.js` |
| Request validation | Added environment-aware `MAX_CODE_SIZE_BYTES`/`MAX_INPUT_SIZE_BYTES` with byte-length guard rails. | `code-execution-backend/src/controllers/executeController.js` |
| Server lifecycle | Added `startServer()` helper, exported it, and only mounted the listener when run directly; moved public routes ahead of the auth middleware. | `code-execution-backend/src/server.js` |
| Frontend terminal | `input`, `input clear`, and `input` (no args) now manage a buffer that is passed to the editor; tab completion updated. | `components/project-workspace.tsx` |
| Editor execution | Accepts `executionInput`, normalises newlines, only falls back to canned defaults if the user did not queue stdin, and streams that to the backend. | `components/code-editor.tsx` |

## 4. How Stdin Flows Now
1. The user runs `input 2
4` in the terminal panel (or clears it with `input clear`).
2. `TerminalPanel` stores the value in the `inputBuffer` state and hands the buffer to the editor through props.
3. When the user runs code, `CodeEditor` normalises the buffer, picks the right language via `codeExecutionAPI.detectLanguageFromFileName`, and sends the payload to `/api/execute` with `input` populated.
4. `dockerService.createSecureContainer()` writes the program to `/tmp/code.*`, writes `/tmp/input.txt` when `input` is not empty, and launches the compile/run command as `cat /tmp/input.txt | /tmp/program` (or the equivalent interpreted command).
5. `runContainer()` simply starts the container, waits for completion/timeout, and fetches the logs. Success is `exitCode === 0`.

## 5. Testing Checklist
- `PORT=0 npx jest --runInBand --detectOpenHandles tests/execute.test.js`
- Interactive smoke tests (examples):
  ```bash
  # Python factorial expecting stdin from the UI buffer
  input 5
  # then trigger Run on:
  n = int(input())
  print(n * 2)
  ```
- Manual API call:
  ```bash
  curl -X POST http://localhost:3001/api/execute     -H "Content-Type: application/json"     -H "X-API-Key: test123"     -d '{"language":"python","code":"print(input())","input":"hello"}'
  ```

## 6. Extending the Service Safely
- **When adding a new language**, make sure `languages.js` has sensible `timeout`, `memoryLimit`, `cpuLimit`, and that its run command works with piped stdin. You can reuse `buildRunCommand()` for most cases.
- **Document validation limits** for large payloads in your feature spec; the defaults are 1 MB (prod) and 25 KB (test env) for code, 10 KB for stdin.
- **Keep the terminal command list realistic**, but guard against accidental execution of destructive commands. In the UI we only simulate helpful ones.
- **Remember graceful shutdowns**: if you introduce long-running background jobs, hook into `registerShutdownHandlers()` and ensure containers are cleaned up.

## 7. Useful References
- Docker execution service: `code-execution-backend/src/services/dockerService.js`
- Express controller contract: `code-execution-backend/src/controllers/executeController.js`
- Frontend editor integration: `components/code-editor.tsx`
- Terminal UI / command handling: `components/project-workspace.tsx`
- API helper used by the frontend: `lib/api/codeExecution.ts`

_Last reviewed: 2025-09-25_
