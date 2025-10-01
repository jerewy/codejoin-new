# Interactive Terminal Input Fix

## Overview
Running code that calls `input()` or other stdin readers from the editor would sometimes fall back to the non-interactive REST executor. The code finished without prompting for input, so programs waiting on stdin appeared frozen. This happened whenever the bottom panel wasn’t already on the **Terminal** tab when the run started.

## Root Cause
`ProjectWorkspace` asks `TerminalPanel` for an `executeCodeInTerminal` callback through a mutable ref. When the user switches to another bottom tab (`Problems`, `History`, etc.), the terminal tab unmounts and clears the ref. `handleRun` checked the ref only once; if it was `null`, it immediately defaulted to the non-interactive executor, which cannot stream stdin. Because the tab switch happens before the panel has a chance to remount and register its callback, interactive runs silently lost their terminal bridge.

## Fix
1. **Wait for the terminal executor to register** (`components/project-workspace.tsx:1511`). A new `waitForTerminalExecutor()` helper polls for the callback (with a 1.5 s timeout) after forcing the terminal tab active, preventing an instant fallback when the panel needs a render cycle to mount.
2. **Track the polling timer and clean up** (`components/project-workspace.tsx:1414`). The wait helper keeps a `terminalExecutorWaitTimeoutRef` so unmounting clears any pending timer and avoids stray callbacks.
3. **Reset the executor ref on unmount** (`components/project-workspace.tsx:1041`). `TerminalPanel` now nulls out `onExecuteInTerminal.current` during cleanup, making it obvious to the parent when the terminal is unavailable.
4. **Better fallback messaging** (`components/project-workspace.tsx:1664`). When we genuinely can’t reach the sandbox, the toast now explains that the terminal is still starting instead of the generic “Terminal not ready”.

With these changes, starting an interactive run always waits for a live terminal session, even if the user was viewing another tab. Only when the terminal fails to come up within the timeout do we revert to the non-interactive executor.
