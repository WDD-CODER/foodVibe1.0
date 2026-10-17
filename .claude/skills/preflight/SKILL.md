---
name: preflight
description: Environment check before any work that needs the dev server, the browser or MongoDB — verifies the dev server answers on this checkout's port, MongoDB is reachable, and the branch is not `main`. Use at the start of a UI check, a browser flow, a DB query or a plan that runs the app, and whenever something "doesn't load" — run it before debugging.
allowed-tools: Bash(node scripts/preflight.mjs *)
---

# Preflight

Run the script; it prints one line per check and exits non-zero on any `FAIL`:

```bash
node scripts/preflight.mjs            # dev server, MongoDB, branch, log route (POST /api/v1/log -> 202)
node scripts/preflight.mjs --visual   # + gstack browse binary, for screenshot/browser flows
```

The port comes from `.worktree-port` (a `wt-N` slot) or defaults to 4200 (main). Override with `--port`.

In a `wt-N` slot, dev servers are off until a step needs them: when the dev-server check fails there, run `node scripts/slot-serve.mjs` and re-run preflight. If `slot-serve.mjs` fails, show its log tail; only the steps that need the running app are blocked.

On `FAIL`, fix the named cause before continuing — a dev-server check that fails is not "flaky", it means the next browser step would be testing nothing. If the fix is outside your scope (MongoDB not installed, slot not provisioned), report the exact `FAIL` line to the Human and stop.

The log-route check posts one `preflight.log.ok` event to `/api/v1/log` and expects `202`. If the work is a bug hunt, query what the app already recorded with `node scripts/log-query.mjs --since=2h --level=warn --summary` before reading code.
