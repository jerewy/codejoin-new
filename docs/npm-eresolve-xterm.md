# npm ERESOLVE: xterm dependency conflict

## Summary

pm install failed because the project requested xterm@^5.5.0, but the npm registry does not publish any xterm versions at or above 5.5.0. The resolver reported xterm@undefined, which broke the peer dependency that xterm-addon-fit@0.8.0 declares on xterm@^5.0.0.

## Symptoms
- 
pm install exits with ERESOLVE unable to resolve dependency tree.
- The error output shows Found: xterm@undefined and a peer dependency request from xterm-addon-fit@0.8.0.

`
npm error While resolving: my-v0-project@0.1.0
npm error Found: xterm@undefined
npm error Could not resolve dependency:
npm error peer xterm@"^5.0.0" from xterm-addon-fit@0.8.0
`

## Root Cause
- The upstream xterm package stopped publishing new unscoped releases after 5.3.0 when the maintainers migrated to the scoped package @xterm/xterm.
- Our package.json requested "xterm": "^5.5.0", which requires a version = 5.5.0. Because no such version exists on npm, the resolver cannot satisfy the constraint and reports xterm@undefined.
- xterm-addon-fit@0.8.0 (and similar add-ons) still declare a peer dependency on the legacy xterm package. When the base package fails to resolve, the peer dependency appears broken and npm aborts the install.

## Fix
1. Update package.json to request a published version of xterm, e.g. "xterm": "^5.3.0".
2. Re-run 
pm install to regenerate package-lock.json.

After applying the change:
`
npm install

added 6 packages, and audited 523 packages in 2s
found 0 vulnerabilities
`

## Longer-Term Recommendation
- Plan to migrate to the new scoped packages announced by the xterm.js maintainers:
  - Replace xterm with @xterm/xterm.
  - Replace xterm-addon-fit with @xterm/addon-fit.
  - Replace xterm-addon-web-links with @xterm/addon-web-links.
  - Keep @xterm/addon-clipboard as-is.
- The scoped packages align with the current release stream and will remove the deprecation warnings observed during install.
- Track the migration in a dedicated ticket so we can revise our terminal implementation and CSS imports when we adopt the scoped modules.

## Verification Checklist
- [x] package.json lists "xterm": "^5.3.0" (or newer scoped alternative).
- [x] 
pm install completes without ERESOLVE failures.
- [ ] (Optional) Terminal UI still operates correctly after dependency change—smoke test via 
pm run dev.
