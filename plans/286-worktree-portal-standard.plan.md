---
name: Worktree Portal Standard — Live DB Dev Server
overview: Establish a standard so that any agent working on a worktree automatically knows how to spin up a live-DB portal for the developer to validate changes before merging.
todos:
  - "[ ] 1. Document the --configuration local requirement in agent.md and copilot-instructions.md"
  - "[ ] 2. Add .worktree-port file convention and auto-port assignment logic"
  - "[ ] 3. Update validation-checklist.md to require a live portal step"
  - "[ ] 4. Create /portal skill that kills stale servers and starts ng serve --configuration local on the assigned port"
  - "[ ] 5. Update execute-it skill to call /portal automatically when validation checklist is triggered"
  - "[ ] 6. Add worktree startup script that writes .worktree-port and documents the correct serve command"
isProject: false
---

# Worktree Portal Standard — Live DB Dev Server

## Problem Statement

### What went wrong

When an agent executes a plan on a worktree and then offers a validation checklist, it may spin up a dev server using the default `ng serve` command. This launches the app with `environment.ts`, where:

```ts
useBackend: false
useBackendAuth: false
```

This means the app stores **all data in browser IndexedDB** (per-origin, scoped to `localhost:<port>`), completely bypassing MongoDB. The result:

- Users created in the portal don't appear in MongoDB Compass or Atlas
- No existing recipes, products, or menus are visible
- The developer cannot meaningfully validate the feature because there is no real data
- The portal looks "connected" (no errors) but is silently using a fake local store

This is invisible to the developer unless they know to look for it — the UI gives no indication that it is in mock-storage mode.

### Root cause

The project has multiple environment configurations:

| File | useBackend | useBackendAuth | Used when |
|------|-----------|----------------|-----------|
| `environment.ts` | `false` | `false` | `ng serve` (default) |
| `environment.local.ts` | `true` | `true` | `ng serve --configuration local` |
| `environment.prod.ts` | `true` | `true` | Production build |
| `environment.remote.ts` | `true` | `true` | Remote staging |

**Agents and the execute-it skill have no rule enforcing `--configuration local`** when starting a dev server for validation. The default path silently falls through to mock storage.

Additionally, the `.worktree-port` file convention exists in the codebase but is not enforced — worktrees do not always have an assigned port written to this file, so agents have no reliable way to know which port to use.

### How it was resolved this session (manual fix)

1. Discovered the old server (default config, port 4201) was running
2. Killed it via `Stop-Process -Id <PID>`
3. Restarted with: `npx ng serve --port 4201 --configuration local`
4. Confirmed via backend `db.js` that `NODE_ENV=development` connects to local MongoDB (`MONGO_LOCAL_URI`), not Atlas
5. Developer logged in on port 4201 with real credentials and saw their real data

---

## True Solution Required

The goal is: **any agent on any worktree that triggers a validation checklist must automatically provide a portal that is connected to the real database**, with zero manual steps from the developer.

### Where to make changes

#### 1. `agent.md` and `.claude/copilot-instructions.md`

Add a hard rule in the "Worktree Operations" section:

> **Dev server rule**: When starting a dev server for validation on a worktree, ALWAYS use `ng serve --port <port> --configuration local`. Never use bare `ng serve` — it starts in mock-storage mode (`useBackend: false`) and is useless for validation.

#### 2. `.worktree-port` file convention

Currently optional. Make it mandatory on worktree creation:

- Every worktree must have a `.worktree-port` file at its root containing a single port number
- Port assignment should be deterministic: `4200 + worktree-index` (e.g. first worktree = 4201, second = 4202, etc.)
- The `EnterWorktree` flow or worktree init script should write this file automatically
- Agents read `.worktree-port` to know which port to use — no guessing

#### 3. `.claude/instructions/validation-checklist.md`

Add a mandatory "Live Portal" gate at the top of the checklist:

```
## Live Portal Gate (mandatory for UI changes)
Before presenting the validation checklist, ensure a live portal is running:
1. Read `.worktree-port` for the assigned port
2. Check if ng serve is already running on that port (`netstat`)
3. If not running — or if running WITHOUT `--configuration local` — kill and restart:
   `npx ng serve --port <port> --configuration local`
4. Confirm server responds at http://localhost:<port>
5. Include the URL in the checklist output
```

#### 4. New `/portal` skill (`.claude/skills/portal/SKILL.md`)

A self-contained skill that:
1. Reads `.worktree-port` (or accepts a port argument)
2. Finds and kills any existing ng serve on that port
3. Starts `ng serve --port <port> --configuration local` as a background process
4. Polls until the server responds with HTTP 200
5. Reports: `Portal ready at http://localhost:<port> (live DB mode)`

This skill is called by execute-it and can also be invoked manually via `/portal`.

#### 5. `execute-it` skill update

After the final build gate (`ng build` passes), if any `.html`, `.scss`, or template files were modified:

1. Automatically invoke the `/portal` skill
2. Include the portal URL in the completion report
3. Change the success criteria format to:

```
- [x] ng build — 0 errors
- [x] Portal: http://localhost:4201 (live DB — ready for manual validation)
- [ ] Visual QA — pending developer review
```

---

## Constraints for the implementing agent

- Do NOT change `environment.ts` — the `false` defaults are intentional for raw `ng serve` safety
- Do NOT hardcode a port — always read from `.worktree-port`
- The kill-and-restart logic must be idempotent (safe to run multiple times)
- The `/portal` skill must work on Windows (use PowerShell `Stop-Process` to kill, not `kill`)
- The worktree-port assignment must not conflict with port 4200 (main app) or 3000 (backend)
- Backend does not need to be started by the skill — assume it is already running

---

## Done when

- Any agent on any worktree that runs execute-it and produces a validation checklist automatically includes a live portal URL
- The portal URL points to a server running `--configuration local` (real MongoDB)
- Developer can open the URL, log in, and see real data without any manual steps
- The behavior is documented in agent.md so all future agents follow it by default
