# Interactive Input Handling in Code Executor

## Summary
Interactive programs (for example, C solutions that read with `scanf`) were failing with runtime errors. The backend wrote the submitted source into a container and started the runtime, but it never attached the request body `input` to the container’s stdin stream. As soon as the program tried to read, it reached EOF and aborted.

## Symptoms
- C/C++ programs that call `scanf`, `gets`, or similar would terminate immediately with runtime errors.
- Other compiled languages (Go, Rust, Java, etc.) saw the same failure when reading from stdin.
- The API responded with `success: false` and an empty output while the web UI surfaced a generic “runtime error”.

## Root Cause
`dockerService.runContainer` only started the container and read stdout/err. Because no stdin was attached, Docker closed the stream, making every interactive request fail.

## Resolution
- Attach to the container with `stdin: true` before starting.
- After `start`, write the normalized request input (ensure a terminal newline) and close the stream so the runtime sees EOF at the right time.
- Destroy the stdin stream in a `finally` block to avoid descriptor leaks when executions error or time out.

This lives in `code-execution-backend/src/services/dockerService.js` around lines 195–271.

## Follow-up / Testing
1. Restart the backend (`cd code-execution-backend && npm run dev`) if it’s already running.
2. Exercise interactive snippets across languages (e.g., C `scanf`, Python `input()`, Go `fmt.Scanln`).
3. Run the Jest suite (`cd code-execution-backend && npm test`) to confirm regressions aren’t introduced.

Keep this page updated if stdin handling changes again or if we add per-language quirks.
