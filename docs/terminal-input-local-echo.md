# Terminal Local Echo & Focus

## The Issue
The xterm.js surface accepted keystrokes but nothing appeared on screen, so typing felt unresponsive. The `handleInput` callback only forwarded data to the backend; it never echoed characters locally, and the container div was not focusable unless xterm already had focus. Clicking the terminal often did nothing, and backspace/enter keys produced no visible effect.

## What Changed
- **Local echo and key handling** (`components/terminal/TerminalSurface.tsx:252`). Input is now written back to the xterm instance before being forwarded to the backend. Enter inserts `\r\n`, Backspace prints `\b \b`, and control bytes/escape sequences are filtered so arrow keys or shortcuts are not double-printed.
- **Reusable focus helper** (`components/terminal/TerminalSurface.tsx:507`). A `handleContainerInteraction` callback calls `terminal.focus()` whenever the container is clicked or focused.
- **Focusable container** (`components/terminal/TerminalSurface.tsx:519`). The wrapper div has `tabIndex={0}` and wires `onClick/onFocus` to the helper so users can click/tap the terminal to start typing.

## Tuning The Behaviour
- **Adjust echo rules**: edit `handleInput` in `components/terminal/TerminalSurface.tsx` (around line 252). You can tweak the branching that decides which characters to echo or add new control-key handling.
- **Change focus UX**: modify `handleContainerInteraction` or the container props in the same file (lines 507–519) if you want different focus triggers or styling when the terminal is active.
- **Disable local echo**: remove or guard the `terminalInstance.write(...)` calls inside `handleInput`. For example, only echo when `inputEcho` feature flag is enabled.

Keep changes near this file so the terminal bundle stays self-contained; higher-level components already rely on the terminal to manage its own input feedback.
