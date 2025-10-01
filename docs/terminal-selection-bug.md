# Terminal Selection Highlight Bug

## Overview
While testing the workspace terminal we saw a white band stretch across the terminal row whenever text was selected. The highlight ignored the color defined in our xterm.js theme and looked like a rendering bug. At the same time TypeScript started flagging compile errors around the theme configuration and terminal input handler.

## Root Causes
1. **Missing base stylesheet** – Our React component never imported `xterm/css/xterm.css`, so the DOM overlay that xterm.js uses for selections fell back to browser defaults. Without the official styles the `.xterm-selection-layer` div paints a nearly white background, which is the white stripe that appeared during selection. Importing the stylesheet ensures the overlay inherits xterm's neutral background values instead of the browser fallback. 【F:components/terminal/TerminalSurface.tsx†L3-L4】
2. **Outdated theme property** – The component configured the terminal theme with a `selection` key, but modern `ITheme` definitions in xterm.js expose `selectionBackground`. Because the `selection` property no longer exists, TypeScript raised the `TS2353` error and the theme entry was ignored at runtime, letting the default bright selection leak through. Replacing the key with `selectionBackground` both satisfies the types and actually applies the softer teal highlight that design expects. 【F:components/terminal/TerminalSurface.tsx†L57-L64】
3. **Unstable input handler references** – The socket bridge uses callbacks that can change when props update. We previously captured `onInput` and `sendTerminalInput` inside the effect that instantiates the terminal, which meant TypeScript could not see `onInputRef`/`sendTerminalInputRef` (they simply did not exist) and the handler could close over stale versions of those callbacks. Storing each callback in a ref fixes the type errors (`TS2552`) and keeps the terminal dispatching the latest logic. 【F:components/terminal/TerminalSurface.tsx†L44-L55】【F:components/terminal/TerminalSurface.tsx†L86-L94】

## Changes Applied
- **Added the stylesheet import** so xterm's helper layers receive their intended background defaults and hidden state. 【F:components/terminal/TerminalSurface.tsx†L3-L4】
- **Swapped `selection` for `selectionBackground`** in the theme definition to align with the current API and remove the `TS2353` error. 【F:components/terminal/TerminalSurface.tsx†L57-L64】
- **Introduced refs for `onInput` and `sendTerminalInput`** so the terminal input effect can read the latest callbacks without tripping the `TS2552` errors about missing identifiers. 【F:components/terminal/TerminalSurface.tsx†L44-L55】【F:components/terminal/TerminalSurface.tsx†L86-L94】

## Why Each Change Matters
- Importing the stylesheet is essential because xterm relies on CSS rather than inline styles for its overlay layers; without it, selection and cursor visuals will continue to look broken.
- Using the correct `selectionBackground` property ensures the custom highlight color renders and keeps our code compatible with current and future versions of xterm.js.
- The ref indirection prevents stale closures when parent components swap handlers, avoiding lost keystrokes or runtime errors as the socket wiring evolves.

Together these adjustments resolve the visual glitch, restore type safety, and make the terminal integration more resilient to future updates.
