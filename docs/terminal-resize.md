# Terminal Resize Reliability

## Overview
The collaboration workspace embeds an xterm.js terminal inside a `ResizablePanel`. Users reported that when the bottom panel height changed, the terminal surface frequently clipped the last few rows or left empty space. The resize observer inside `TerminalSurface` only reacted to window-level `resize` events, so resizing the panel rarely triggered a true refit.

## Symptoms
- Dragging the bottom panel handle left the terminal viewport with stale rows/columns.
- Repeated resizes forced users to blur/focus the panel or reload before the buffer became readable again.
- Dispatching a synthetic `window.resize` event from `ProjectWorkspace` (our previous workaround) still raced with panel animations, so xterm measured the old dimensions.

## Root Cause
`TerminalSurface` wraps xterm.js with the `FitAddon`, but its imperative API exposed only `focus`, `write`, `sendData`, and `dispose`. The parent component could not trigger a fit directly, and the internal `scheduleFitAndEmit` logic waited for `requestAnimationFrame` callbacks that sometimes ran before the `ResizablePanel` finished applying its final height. Without stable height styles (`min-h-0`) on the intermediate flex containers, the terminal’s root element occasionally received zero height during the fit, reinforcing the mismatch.

## Fix
1. **Expose a `fit()` method** (`components/terminal/TerminalSurface.tsx:23`, `components/terminal/TerminalSurface.tsx:439`, `components/terminal/TerminalSurface.tsx:451`) so parents can call straight into `runFitAndEmit`, guaranteeing that xterm recomputes its rows/cols using the latest panel size.
2. **Invoke the new method after every panel resize** (`components/project-workspace.tsx:2306`). `ResizablePanel` now schedules `terminalSurfaceRef.current?.fit()` with a 50 ms timeout, giving React and the panel animation time to settle before measuring.
3. **Propagate flexible heights** (`components/project-workspace.tsx:1244`, `components/project-workspace.tsx:1284`, `components/project-workspace.tsx:1285`). Adding `min-h-0` prevents flexbox from collapsing the terminal wrapper, so `FitAddon` always reads a non-zero height.

## Validation
- Resizing the bottom `ResizablePanel` now yields an immediate terminal refit with no clipping or whitespace.
- The explicit timeout removes reliance on global `resize` listeners, so rerenders stay local and predictable.

## Follow-up Ideas
1. Replace the magic 50 ms delay with a `ResizeObserver` in the parent for deterministic scheduling.
2. Consider hoisting shared layout guidance (e.g., the need for `min-h-0`) into a reusable `TerminalContainer` component to avoid regressions.
