# Plan 737 — Make Dan the platform admin on the live app with a safe one-off script

Status: draft
Depends-on: none
Track: code
Snapshot: 84703cef

## Problem Statement
Dandan (2026-11-25): there is no platform admin on the live database, so on the Render app
(https://foodvibe1-0-1-frankfurt.onrender.com/) nobody can open the platform screens, see AI usage or (after plan 736)
raise a user's AI allowance. `isPlatformAdmin` is a user flag with no way to set it. Signup has no email check, so an
"admin email" setting that promotes whoever signs up with that address is unsafe (anyone could sign up with it first)
— Dandan's brief rules it out.

Verified on `origin/main` 84703cef:
- The flag: `isPlatformAdmin: { type: Boolean, default: false }` in `server/models/user.model.js:22`; read only as
  `req.user?.isPlatformAdmin === true` (`server/middleware/auth.js:35`, `requirePlatformAdmin` at `:146`). It reaches
  the token through `signAccess` (`server/routes/auth.js:84-96`), so it shows after the next sign-in or token refresh.
  An acting platform session re-reads the flag on every request (`server/services/access.js:69-70`).
- Nothing in the server sets it except the local-only dev guest (`server/routes/auth.js:483-495`, refused for any
  non-localhost caller).
- The pattern for an operator script that changes live data: `server/scripts/set-front-desk-status.js` (plan 555)
  parses `--target` with `parseTarget` (`server/utils/db-target.js`) and connects through `connect` in
  `server/migrations/tools/_connect.js`, which calls `loadServerEnv(target)`: only `--target=atlas` opens
  `server/.env.live` (the live `MONGO_URI`, which lives only in the main folder), and Atlas also needs
  `--confirm-host=<host>` matching the cluster. `server/scripts/erase-client.js` and
  `server/scripts/release-removed-staff-names.js` add the dry-run-by-default rule (`--write` applies). The live
  environment variable is `MONGO_URI`, not `MONGODB_URI`.
- The root `dev:remote` (`ng serve -c remote`) and the server's `dev:remote` (`NODE_ENV=production`) are not used by
  these scripts; the scripts load `server/.env.live` themselves.
- Live runbooks sit in `docs/security-go-live.md` (for example "Erase a customer by phone", `:83-95`, with the exact
  `--target=atlas --confirm-host=<host>` commands).

## Goals & Success Criteria
**Primary:** Dandan signs up on the live app with his own email and password, runs one command from the main folder,
signs in again and sees «דאשבורד מערכת» in his profile menu; nobody can become a platform admin by signing up.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `pnpm run test:server` exits 0, including `server/test/set-platform-admin.test.js` (A1, A2).
- [auto] Run without a target, the script exits 1 and prints «--target=local|atlas is required» with no connection made — a case in the script's server test (run by `pnpm run test:server`).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/737-live-platform-admin-script.plan.md` → `ARCH: ok` or `ARCH: skipped`; `node scripts/scope-check.mjs --reuse --plan=plans/737-live-platform-admin-script.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] Open https://foodvibe1-0-1-frankfurt.onrender.com/ (the first load can take about 50 seconds) and sign up with your own email and a password. The app opens as a normal user: the profile menu has no «דאשבורד מערכת».
- [human] In PowerShell in the main folder, run the three commands of the runbook section «הפיכת משתמש למנהל מערכת באפליקציה החיה» in `docs/security-go-live.md` (host check, dry run, `--write`). The dry run prints `PLATFORM_ADMIN: <your user id> false → true (dry run — add --write to apply)`; the last one prints `PLATFORM_ADMIN: <your user id> false → true written`.
- [human] On the live app, sign out and sign in again: the profile menu shows «דאשבורד מערכת», and it opens the platform dashboard with every business listed.

## Execution Mode
- Parallel: yes — no open plan writes these files (plan 736 touches `server/models/user.model.js` and the AI files; this
  plan does not).
- Concurrent plans: 730–736.
- Isolated DB: no — the builder's tests use the in-memory database; the live write is the Human's, by hand.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/scripts/set-platform-admin.js
server/test/set-platform-admin.test.js
server/breadcrumbs.md
docs/security-go-live.md
docs/workflow-kit/manifest.json
docs/brain/component-families.md
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — the platform admin is still only the `isPlatformAdmin` flag; this plan adds no route, permission
  or sign-up path. Only an operator with the live `server/.env.live` and the Atlas host can set it.
- INV-2: preserves — the script reads and writes one `users` document by `_id`; no business data, no master data.
- INV-none: preserves — no app, client, schema or AI change; `server/scripts/**` and the docs are touched by no
  invariant's `Touches`.

## Reuse Check
- `server/scripts/set-platform-admin.js` (`parseArgs`, `planChange`, `applyChange`) — family: none — rung: 4 — why: operator scripts have no registry family; it reuses `parseTarget` and `connect` (`server/utils/db-target.js`, `server/migrations/tools/_connect.js`) exactly as `set-front-desk-status.js` does, and the dry-run/`--write` shape of `erase-client.js`

## Defaults

- confirm-destructive-action — exception — why: no screen; the script's dry run is the confirmation and `--off` undoes a change.
- empty-state-on-list — exception — why: no list.
- loading-and-error-states — exception — why: no screen; every refusal prints one plain line and exits 1.
- unsaved-changes-on-leave — exception — why: no form.
- hints-in-tooltips — exception — why: no UI.
- leave-and-return — exception — why: no UI.
- app-list-container — exception — why: no UI.
- one-breakpoint-set — exception — why: no CSS.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As Dan, I want to make my own live account the platform admin with one command, so I can manage users and AI usage on the demo without opening the database by hand.
- As Dan, I want nobody else to be able to become platform admin by signing up with my address, so the demo stays safe.

## Functional Requirements

### Must Have (P0)
- [ ] **Command:** `node server/scripts/set-platform-admin.js --target=local|atlas --email=<email> [--off] [--confirm-host=<host>] [--db=<name>] [--write]`. `--target` is required (`parseTarget(argv, { required: true })`); `--confirm-host` is required for Atlas and checked by `connect`; `--db` works with local only (as `_connect.js` rules). Unknown arguments are refused. Without `--write` nothing is written (dry run); `--off` clears the flag instead of setting it.
- [ ] **Find exactly one user:** the email is trimmed and lower-cased (the schema stores it lower case) and matched exactly on `users.email` (`find(...).limit(2)`). 0 matches → `PLATFORM_ADMIN: refused — no user with that email`, exit 1. 2 → `PLATFORM_ADMIN: refused — more than one user with that email`, exit 1. A removed user (`removedAt` set) → `PLATFORM_ADMIN: refused — that user was removed`, exit 1. Nothing is written on a refusal.
- [ ] **Say what will change:** `planChange(users, { on })` (pure) returns the refusal or `{ userId, from, to }`. The script prints `PLATFORM_ADMIN: <userId> <from> → <to> (dry run — add --write to apply)`, or `PLATFORM_ADMIN: <userId> already <to> — nothing to do` (exit 0, no write). The output names the user id only, never the email or name (the rule of `docs/security-go-live.md` "Logging").
- [ ] **Write with a guard and an audit line:** `applyChange(db, plan, { at })` runs one `updateOne({ _id: userId, isPlatformAdmin: { $ne: to }, removedAt: null }, { $set: { isPlatformAdmin: to }, $push: { platformAdminHistory: { $each: [{ at, on: to, by: 'script' }], $slice: -20 } } })` and prints `PLATFORM_ADMIN: <userId> <from> → <to> written`. 0 modified → `PLATFORM_ADMIN: refused — the user changed meanwhile`, exit 1.
- [ ] **No other path:** no environment variable, sign-up rule or route sets the flag; the script is the only way, and only for someone who holds the live `server/.env.live` and the Atlas host.
- [ ] **Runbook:** a new section in `docs/security-go-live.md`, after "Erase a customer by phone": «הפיכת משתמש למנהל מערכת באפליקציה החיה» (Hebrew title, English body like the rest of the file) with the steps for Dandan: (1) sign up on the live app with his own email and password; (2) from the main folder in PowerShell: `node server/scripts/set-platform-admin.js --target=atlas --email=<your email>` — it stops with `Atlas host confirm required: re-run with --confirm-host=<host>`; re-run with that host (dry run), check the line, then add `--write`; (3) sign out and in, open «דאשבורד מערכת». Also: `--off` to take it away, and "agents never run this against Atlas".

### Should Have (P1)
- [ ] `server/breadcrumbs.md`: one `scripts/set-platform-admin.js` line beside `scripts/set-front-desk-status.js`.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI change. The profile-menu link «דאשבורד מערכת» (`platform_dashboard`, `src/app/core/components/header/header.component.ts:40`) already shows for a platform admin.
- No dictionary keys.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Add a one-off script that makes one existing user the platform admin, dry run first — argument parsing, the one-user rule, the plan and the guarded write with the history row, the output lines; reuse `parseTarget` and `connect` — server/scripts/set-platform-admin.js
- [ ] A2: Prove the script on a test database — parse: missing target, missing email, unknown argument, `--db` with Atlas refused; plan: 0, 2 and removed users refused, already-set is "nothing to do", the email is matched lower-cased; apply against the in-memory database: a dry run writes nothing, `--write` sets the flag and one history row, `--off` clears it, a user changed meanwhile is refused — server/test/set-platform-admin.test.js
- [ ] A3: Write the live runbook for Dandan and list the script in the server map — the section of P0 with the exact commands — docs/security-go-live.md, server/breadcrumbs.md
- [ ] A4: Run every check and paste the outputs — the `[auto]` items, under Execution Notes — this plan file

## What happens when
- Dandan has not signed up yet: the script refuses with "no user with that email" and writes nothing.
- He runs it in a `wt-N` slot by mistake: the slot has no `server/.env.live`, so `--target=atlas` stops with
  `server/.env.live not found` before connecting.
- He types the wrong host: `connect` stops with `Atlas host confirm required: re-run with --confirm-host=<host>`.
- Someone signed up first with Dan's email: Dan's own sign-up is refused with 409 `EMAIL_TAKEN`
  (`server/routes/auth.js:209`, emails are unique), so the runbook says: if sign-up says the email is taken and you
  never signed up, do not run the script for that email — sign up with another address you own and use that one.
  The script only promotes an account that exists, and Dan proves it is his by signing in with his own password.
- He wants to undo: run it again with `--off --write`.
- The token still shows the old flag: sign out and in (or wait for the token refresh).

## Technical Considerations
- Dependencies: `server/utils/db-target.js` (`parseTarget`, `loadServerEnv`, `mongoUri`), `server/migrations/tools/_connect.js`
  (`connect`; its header says "These tools never write", but `set-front-desk-status.js` already writes through it — this
  plan follows that script and leaves the header as it is).
- The live environment: `server/.env.live` in the main folder (`MONGO_URI`), loaded only for `--target=atlas`. The
  brief said `MONGODB_URI`; the code's name is `MONGO_URI`, and the plan follows the code.
- Flag shape: the brief suggested `--email <e> [--off] [--dry-run]`; the repo's operator scripts use `--name=value` and
  dry run by default with `--write` (`erase-client.js`, `release-removed-staff-names.js`, `repair-supplier-refs.js`), so
  this script does the same; a `behaviour:` decision records it.
- Model changes: none in `server/models/user.model.js` (plan 736 edits that file); `platformAdminHistory` is written by
  the script on the raw collection and read by nobody yet.
- Security surface: this is how admin power is granted. It needs the live database secret and the host, prints no
  email or name, refuses ambiguous matches, and writes an audit row. No route and no environment setting can grant
  the flag. Agents never run it with `--target=atlas` (AGENTS.md: the live URI is the Human's).
- The live app at https://foodvibe1-0-1-frankfurt.onrender.com/ must use the same Atlas cluster as `server/.env.live`;
  the dry run's `[tool] target=atlas database=<name>` line and the host confirm show which one is used.

## Out of Scope
- A platform-admin screen that grants or removes the flag for other users.
- Email verification at sign-up.
- Any change to how the token carries the flag.

## Critical Questions
- none — Dandan's brief of 2026-11-25 sets the design; the flag names and dry-run default follow the repo's operator
  scripts, and anything they do not settle is a `behaviour:` decision for him to grade.

## Execution Notes
- Planner 2026-11-25: written from Dandan's requests of 2026-11-25
