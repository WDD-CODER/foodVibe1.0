# Plan 530 — The live Atlas URI moves to `server/.env.live`, loaded only through one shared helper (1 of 2: the server)

Status: draft
Depends-on: 517
Snapshot: aa120120a5005d07e35cd64bc3284f9e40daf446

## Problem Statement
`server/.env` holds both the local URI (`MONGO_LOCAL_URI`) and the live Atlas URI (`MONGO_URI`), and every slot and
builder folder that has a copy of it carries the production connection string. On top of that, Atlas is the default in
several places:

- `server/package.json:12` `"dev": "cross-env NODE_ENV=production node --watch index.js"` — "dev" runs on Atlas.
- `server/db.js:8-9` picks `MONGO_LOCAL_URI` only when `NODE_ENV === 'development'`; anything else (including unset,
  as in the root `serve:prod` script) connects to `MONGO_URI`.
- `server/app.js:2` `require('dotenv').config()` has no path, so which `.env` loads depends on the working directory.

Human decisions 2026-11-07: **H5** — the live URI moves to a git-ignored `server/.env.live` (`.gitignore:74` `.env.*`;
`git check-ignore -v server/.env.live` → `.gitignore:74:.env.*`), loaded only by code that needs Atlas, through one
shared helper. **H6** — every DB entry point takes one target (`local` / `atlas`); only `atlas` loads `.env.live`;
the default is local. This plan does the helper, the server and the migration connect helper; plan 531 moves the
standalone scripts and `scripts/log-query.mjs`.

Render is not affected: `render.yaml:10` starts `node server/index.js` with `NODE_ENV=production` (`:12-13`) and
`MONGO_URI` set in the dashboard (`:26-27` `sync: false`); there is no `.env.live` file there.

## Goals & Success Criteria
**Primary:** a fresh checkout or slot with only `server/.env` can never reach Atlas; the main folder reaches Atlas only
through `dev:remote` / `--target=atlas`, which read `server/.env.live`; Render keeps working unchanged.

- [auto] `pnpm run test:server` exits 0, including `server/test/db-target.test.js` (A2).
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `node scripts/kit-manifest-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` exits 0 with no entries (or `SKIP: no database configured`).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/530-live-atlas-uri-moves-to-server-env-live-shared-loader.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/530-live-atlas-uri-moves-to-server-env-live-shared-loader.plan.md` exits 0.
- [human] After the merge, run the "Human steps after the merge" below; then in the main folder `server/`, `npm run dev` logs `mongo.connection.ok` with `target: local`, and `npm run dev:remote` logs `target: atlas`.
- [human] In each `wt-N` slot that has a `server/.env`, `Select-String -Path server\.env -Pattern '^MONGO_URI='` prints nothing.

## Execution Mode
- Parallel: yes — no shared file with 517–523, 510, 528, 529.
- Concurrent plans: plan 531 waits for this one.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/utils/db-target.js
server/test/db-target.test.js
server/db.js
server/app.js
server/package.json
server/migrations/tools/_connect.js
server/.env.example
server/breadcrumbs.md
AGENTS.md
docs/agent/workflow-map.md
docs/brain/gotchas/backend.md
docs/workflow-kit/manifest.json
docs/workflow-kit/manifest.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-2: preserves — `server/migrations/tools/_connect.js` changes only where it reads the URI from; every migration still targets exactly one database chosen by `--target`, and no query or scoping changes.

## Reuse Check
- `server/utils/db-target.js` (`targetFromEnv`, `parseTarget`, `loadServerEnv`, `mongoUri`) — family: none — rung: 4 — why: no env or target helper exists (`server/utils/` has none; `scripts/qa/lib/qa-login.mjs` reads `.env` for credentials only); one shared helper is the decision (H5), used by the server, `_connect.js` and, in plan 531, every DB script.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want my live kitchen data reachable only on purpose so that an agent's test run can never write to it by accident.

## Functional Requirements

### Must Have (P0)
- [ ] `server/utils/db-target.js` (CommonJS, like the rest of `server/`), every function taking an optional `{ serverDir, env }` (defaults: `path.resolve(__dirname, '..')`, `process.env`) so tests can use a temp folder:
  - `targetFromEnv(env)` → `env.DB_TARGET` when it is `local` or `atlas` (any other value throws `DB_TARGET must be 'local' or 'atlas'`); else `'atlas'` when `env.NODE_ENV === 'production'`; else `'local'`.
  - `parseTarget(argv, { required = false } = {})` → the value of `--target=<local|atlas>`; absent → `'local'`, or throws `--target=local|atlas is required` when `required`; any other value throws `--target must be 'local' or 'atlas'`.
  - `loadServerEnv(target, opts)` → loads `<serverDir>/.env` with dotenv (explicit path, never the working directory; a missing file is fine). Only when `target === 'atlas'`: loads `<serverDir>/.env.live` with `override: true` if the file exists; if it does not exist and `env.MONGO_URI` is unset, throws `server/.env.live not found — the Atlas URI lives only there (see server/.env.example)`. When `target === 'local'` it never opens `.env.live`.
  - `mongoUri(target, opts)` → local: `env.MONGO_LOCAL_URI`, else throws `MONGO_LOCAL_URI is not set in server/.env` (never falls back to `MONGO_URI`); atlas: `env.MONGO_URI`, else throws `MONGO_URI is not set (server/.env.live, or the host's environment on Render)`.
  - Never logs or returns a URI in an error message.
- [ ] `server/app.js:2`: `require('dotenv').config()` → `require('./utils/db-target').loadServerEnv(require('./utils/db-target').targetFromEnv())` (one `const` import line), so the server reads `server/.env` from its own folder and `.env.live` only for Atlas.
- [ ] `server/db.js` `connectDb()`: `const target = targetFromEnv(); const uri = mongoUri(target)` replaces lines 8-12; the JWT checks stay; the `mongo.connection.ok` log gets `target` from `target` (not from the URI's scheme).
- [ ] `server/package.json`: `"dev": "cross-env NODE_ENV=development node --watch index.js"` (local, same as `dev:local`); `dev:local`, `dev:remote`, `start` unchanged. `dev:remote` keeps `NODE_ENV=production`, so it targets Atlas and loads `.env.live`.
- [ ] `server/migrations/tools/_connect.js`: drop its own `dotenv` line; `parseArgs` keeps its rules (`--target` required, `--confirm-host`, `--db` local only); `connect(args)` calls `loadServerEnv(args.target)` then `mongoUri(args.target)`. Every migration and tool that imports `_connect` (0001–0010, `field-inventory`, `soft-delete-inventory`, `validate-all`, and the `server/scripts` that use it) gets this for free.
- [ ] `server/.env.example`: a "Database" block — `MONGO_LOCAL_URI=mongodb://127.0.0.1:27017/<local db>` (local, used by the server in dev and by every script by default); "The live Atlas URI never goes in this file: put `MONGO_URI=…` in `server/.env.live` (git-ignored). Only `--target=atlas`, `npm run dev:remote` and `NODE_ENV=production` read it. Render sets `MONGO_URI` in its dashboard." Plus the `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` names with empty values (db.js requires them).

### Should Have (P1)
- [ ] `AGENTS.md` (project-owned seed) hard rules: one line — "Servers: in a `wt-N` slot the agent starts and stops them (`node scripts/slot-serve.mjs`); in the main folder they are the Human's — the agent asks, never starts them. Slots and builder folders are local-only: the live URI lives only in the main folder's `server/.env.live`."
- [ ] `docs/agent/workflow-map.md:164-173` (project override): the same rule in one sentence next to "Slot dev servers are on demand", and "`npm run dev:local` in a slot never reads `.env.live`".
- [ ] `server/breadcrumbs.md:7`: replace "`MONGO_LOCAL_URI` dev / `MONGO_REMOTE_URI` prod" with the new rule (`server/utils/db-target.js`; local by default; Atlas only via `.env.live` or Render's env).
- [ ] `docs/brain/gotchas/backend.md:233` ("`npm run dev` runs as NODE_ENV=production"): mark it superseded by plan 530 (`dev` is local now) and add the new trap: "Atlas from a local run needs `server/.env.live`; a missing file fails loudly, it never falls back".
- [ ] `docs/workflow-kit/manifest.json` / `.md`: classify `server/test/db-target.test.js` / `server/utils/db-target.js` only if `kit-manifest-check` asks.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI change. No dictionary keys.

## Human steps after the merge (the agent never reads, prints or moves a URI value)
Run in PowerShell. They move any `MONGO_URI=` / `MONGO_REMOTE_URI=` line out of `server/.env` without showing it; the
files are written as UTF-8 without a BOM so dotenv reads the first key.

Main folder (keeps the value, in `.env.live`):
```
$f = "C:\coding projects\Cursor\foodvibe1.0\server\.env"
$lines = [IO.File]::ReadAllLines($f)
[IO.File]::WriteAllLines("C:\coding projects\Cursor\foodvibe1.0\server\.env.live", [string[]]($lines | Where-Object { $_ -match '^(MONGO_URI|MONGO_REMOTE_URI)=' }))
[IO.File]::WriteAllLines($f, [string[]]($lines | Where-Object { $_ -notmatch '^(MONGO_URI|MONGO_REMOTE_URI)=' }))
```
Each slot (drops the value; repeat with `-wt-2`, `-wt-3`):
```
$f = "C:\coding projects\Cursor\foodvibe1.0-wt-1\server\.env"
if (Test-Path $f) { [IO.File]::WriteAllLines($f, [string[]]([IO.File]::ReadAllLines($f) | Where-Object { $_ -notmatch '^(MONGO_URI|MONGO_REMOTE_URI)=' })) }
```
Check (prints only `True`/`False`, never the value):
```
Test-Path "C:\coding projects\Cursor\foodvibe1.0\server\.env.live"
```

## Atomic Sub-tasks
- [ ] A1: Write the one place that decides local or Atlas — `targetFromEnv`, `parseTarget`, `loadServerEnv`, `mongoUri` as specified, with injectable `serverDir` / `env` — server/utils/db-target.js
- [ ] A2: Prove the rules without any real database — vitest with a temp folder per case: `local` never reads `.env.live` (put `MONGO_URI=x` only there and assert it stays unset); `atlas` loads it; `atlas` with no file and no `MONGO_URI` throws the `.env.live not found` message; `atlas` with no file but `MONGO_URI` already in `env` (Render) works; `mongoUri('local')` with only `MONGO_URI` set throws (no fallback); `targetFromEnv` for `{}` / `{NODE_ENV:'development'}` / `{NODE_ENV:'production'}` / `{DB_TARGET:'atlas'}` / `{DB_TARGET:'x'}`; `parseTarget` absent, `--target=atlas`, `--target=prod`, and `required`; no thrown message contains the URI — server/test/db-target.test.js
- [ ] A3: Make the server load its env from its own folder and pick the target through the helper — server/app.js, server/db.js
- [ ] A4: Make `dev` local — server/package.json
- [ ] A5: Route the migration connect helper through the same loader — keep `parseArgs` as is — server/migrations/tools/_connect.js
- [ ] A6: Document the new layout — server/.env.example, server/breadcrumbs.md
- [ ] A7: Say who owns which server, and record the gotcha — AGENTS.md, docs/agent/workflow-map.md, docs/brain/gotchas/backend.md
- [ ] A8: Run every `[auto]` check; confirm `server/test/helpers/app.js` (sets `NODE_ENV=development` and `MONGO_LOCAL_URI`) still connects through the new path; paste the outputs and the Human steps under Execution Notes

## What happens when
- A slot or builder folder starts the backend (`dev:local`): target local; `.env.live` is never opened; with no `MONGO_LOCAL_URI` it fails with `MONGO_LOCAL_URI is not set in server/.env`.
- The main folder runs `npm run dev:remote` before the Human moved the value: `server/.env` still has `MONGO_URI`, so it still works (the helper reads `MONGO_URI` from whichever loaded file has it); after the move it reads `.env.live`.
- `npm run dev:remote` with no `.env.live` and no `MONGO_URI`: fails at start with the `.env.live not found` message; nothing falls back to Atlas or local.
- Render deploys: `NODE_ENV=production` → atlas; no `.env.live`, `MONGO_URI` from the dashboard → connects as today.
- Root `pnpm run serve:prod` (`cd server && node index.js`, no `NODE_ENV`): now local (was Atlas). Intended (H6: default local).
- A migration with `--target=atlas`: loads `.env.live`, still needs `--confirm-host`.

## Technical Considerations
- Dependencies: `dotenv` (already a server dependency); `server/test/helpers/app.js` (sets env then calls `connectDb`); kit-managed `scripts/slot-serve.mjs` (`dev:local` / `dev:remote` by name, unchanged) and `scripts/take-plan.mjs` (runs `db-backup.js` / `db-restore.js` with `--target=local`, unchanged). Nothing in those two changes: slots stay local-only once the value is gone from their `server/.env`.
- New files needed: `server/utils/db-target.js`, `server/test/db-target.test.js`.
- Model changes: none.
- Backend / API: no endpoint change; startup env loading and target choice only.
- Auth and validation: none changed.
- Security surface: smaller — the production URI leaves every copied `server/.env`; only the main folder holds it, in a file nothing copies.
- Data / migration: none (no stored data changes; the value moves by a Human step).
- Project checks: log-query `[auto]` present; Reuse Check present; no dictionary keys.

## Out of Scope
- The standalone DB scripts and `scripts/log-query.mjs` (plan 531). Kit-managed files: `scripts/slot-serve.mjs`, `scripts/take-plan.mjs`, `scripts/lib/slot-procs.mjs`, `scripts/orch-preflight.mjs`, `.cursor/commands/done.md`, `.cursor/commands/ship.md` (kit brief K1, K2). Renaming the root `dev:remote` (Render frontend) vs the server's `dev:remote` (Atlas) naming collision. Moving the JWT secrets.

## Critical Questions
- none

## Execution Notes
- Planner 2026-11-07 (brief 3(a), decisions H5 + H6). Consumers re-grepped at 5895243: `server/db.js`, `server/migrations/tools/_connect.js`, `server/scripts/{bump-master-version,db-backup,db-restore,reset-user-from-master,check-name-lengths,check-unit-weights,time-business-stats}.js`, `scripts/log-query.mjs`; the last eight go to plan 531. `MONGO_ATLAS_DIRECT_URI` no longer exists. `take-plan.mjs` never copies `server/.env` (contrary to the brief); slots have whatever `server/.env` the Human put there, hence the per-slot Human step.
- Planner 2026-11-07: Depends-on 517 added after the dry run (`run-plans --dry-run`) dropped `pnpm run test:server` from this gate — the script only exists once 517 merges.
