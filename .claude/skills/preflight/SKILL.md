---
name: preflight
description: Environment check before any work that needs the dev server, the browser or MongoDB — verifies the dev server answers on this checkout's port, MongoDB is reachable, and the branch is not `main`. Use at the start of a UI check, a browser flow, a DB query or a plan that runs the app, and whenever something "doesn't load" — run it before debugging.
allowed-tools: Bash(node scripts/preflight.mjs *)
---

# Preflight

Run the script; it prints one line per check and exits non-zero on any `FAIL`:

```bash
node scripts/preflight.mjs            # dev server, MongoDB, branch
node scripts/preflight.mjs --visual   # + gstack browse binary, for screenshot/browser flows
```

The port comes from `.worktree-port` (a `wt-N` slot) or defaults to 4200 (main). Override with `--port`.

On `FAIL`, fix the named cause before continuing — a dev-server check that fails is not "flaky", it means the next browser step would be testing nothing. If the fix is outside your scope (MongoDB not installed, slot not provisioned), report the exact `FAIL` line to the Human and stop.
