# Code Execution Troubleshooting Guide

When you run code from the project workspace the frontend calls the local code execution backend (`code-execution-backend`). If that API cannot be reached or it returns a payload without a numeric `exitCode`, the UI used to surface a console error similar to:

```
✗ Execution failed (exit code undefined)
```

This happened because the frontend assumed every response included an exit code. When the backend timed out, crashed, or failed before spawning a process, it returned an empty or partial response. The workspace now normalizes these situations, marks executions as failed without throwing, and shows an in-app toast instead of a noisy `console.error`.

## How to resolve execution failures

1. **Start both services**
   - In one terminal run `npm run dev` from the project root to boot the Next.js frontend.
   - In another terminal run `cd code-execution-backend && npm run dev` to start the execution API.
   - Wait until both processes finish compiling before triggering a run.
2. **Verify the backend health**
   - Visit `http://localhost:3001/health` in a browser or run `curl http://localhost:3001/health`.
   - A healthy backend returns JSON with a `status` of `ok`. If the request fails, restart the backend and check for Docker errors.
3. **Retry the execution**
   - Back in the workspace, use the **Run** button. The terminal panel now shows a success badge when the backend responds and surfaces a toast with details when it does not.
4. **Inspect the Problems panel**
   - When the backend reports a runtime or syntax error, the workspace logs the message in the Problems list so you can jump back to the offending file.

## Tips for the new project page

- Selecting **Use Template** copies the template name, description, and tags into the form. Choosing **Start from scratch** resets the form so you are not stuck with template metadata.
- You can add up to five custom tags. Attempting to add a sixth or a duplicate tag will show a toast explaining what to fix instead of silently failing.
- If Supabase returns an authentication error the page now shows a destructive toast with the exact reason so you can sign in again before retrying.

Following these steps keeps the frontend and backend in sync and prevents the `exit code undefined` console error from reappearing.
