# Plan 531 — Every DB script takes one `--target=local|atlas` flag, local by default (2 of 2: the scripts)

Status: draft
Depends-on: 530, 517
Snapshot: aa120120a5005d07e35cd64bc3284f9e40daf446

## Problem Statement
Plan 530 adds `server/utils/db-target.js` and moves the server and `_connect.js` onto it. The standalone scripts still
load `server/.env` themselves and pick the URI each in their own way (verified at 5895243):

| Script | Today | Risk |
| --- | --- | --- |
| `server/scripts/bump-master-version.js:15-18` | no flag; `NODE_ENV=development` → local, **otherwise Atlas** | Atlas by default |
| `server/scripts/check-name-lengths.js:15,38` | `--target` required; `local` → local, **anything else → `MONGO_URI`** | a typo reaches Atlas |
| `server/scripts/check-unit-weights.js:20,46` | same pattern | same |
| `server/scripts/time-business-stats.js:17,46` | same pattern, plus `--db` | same |
| `server/scripts/db-backup.js:26,42,48-49` | `--target` required, strict | loads `server/.env` itself |
| `server/scripts/db-restore.js:20,34,46-47` | `--target` required, strict | same |
| `server/scripts/reset-user-from-master.js:28,35,51` | `--target`, default local | same |
| `scripts/log-query.mjs:12,95-111` | `--remote` (+ `--yes`); local falls back to `MONGO_URI` when `MONGO_LOCAL_URI` is unset | a second flag name; a silent Atlas fallback |

Human decision H6 (2026-11-07): one target flag for every DB script, `--target=local` / `--target=atlas`; only `atlas`
loads `server/.env.live`; without the flag, local. The `_connect.js` users (migrations, `cleanup-*`, `dedupe-*`,
`release-removed-staff-names`) are already covered by plan 530. `scripts/log-query.mjs` is also edited by plan 517
(plan-start fallback, SKIP without a database), so this plan runs after it.

## Goals & Success Criteria
**Primary:** no DB script can reach Atlas without `--target=atlas`, and every one of them reads the live URI only from
`server/.env.live` through `server/utils/db-target.js`.

- [auto] `node --test scripts/test/db-target-usage.test.mjs scripts/test/log-query-fallback.test.mjs` → `# fail 0`.
- [auto] `pnpm run test:server` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` exits 0 with no entries (or `SKIP: no database configured`).
- [auto] `node scripts/kit-manifest-check.mjs` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/531-db-scripts-take-one-target-flag-local-by-default.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/531-db-scripts-take-one-target-flag-local-by-default.plan.md` exits 0.
- [human] In the main folder (after plan 530's Human steps), `node scripts/log-query.mjs --since=1h --target=atlas --yes` prints `REMOTE (Atlas)` and entries; `node scripts/log-query.mjs --since=1h --remote` prints `--remote was replaced by --target=atlas` and exits 1.

## Execution Mode
- Parallel: yes, after 530 and 517.
- Concurrent plans: none share its files.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/scripts/bump-master-version.js
server/scripts/check-name-lengths.js
server/scripts/check-unit-weights.js
server/scripts/time-business-stats.js
server/scripts/db-backup.js
server/scripts/db-restore.js
server/scripts/reset-user-from-master.js
scripts/log-query.mjs
scripts/test/db-target-usage.test.mjs
scripts/test/log-query-fallback.test.mjs
docs/brain/patterns/log-query-usage.md
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

- INV-none: preserves — the scope reaches no `Touches` glob; developer scripts change only how they choose and load the database URI; no query, scoping or write path changes.

## Reuse Check
- none — every script reuses `server/utils/db-target.js` from plan 530 (`parseTarget`, `loadServerEnv`, `mongoUri`); `scripts/test/db-target-usage.test.mjs` is a test file, not a reusable piece.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want a maintenance script to touch my live data only when someone typed `--target=atlas` so that a mistyped command never changes the live kitchen.

## Functional Requirements

### Must Have (P0)
- [ ] Each of the seven `server/scripts/*.js` above: remove its own `require('dotenv').config(...)`; get the target with `parseTarget(process.argv)` (`{ required: true }` for `db-backup`, `db-restore`, `check-name-lengths`, `check-unit-weights`, `time-business-stats`, which require it today; default local for `bump-master-version` and `reset-user-from-master`); call `loadServerEnv(target)` then `mongoUri(target)`. Every other argument a script parses today (`--out`, `--dir`, `--db`, `--confirm-host`, user ids…) keeps its name and rules; a script that parses `--target` itself keeps only `parseTarget`'s result. The usage / header comment of each names `--target=local|atlas` and "atlas reads server/.env.live".
- [ ] `bump-master-version.js`: header lines 9-10 become `node server/scripts/bump-master-version.js` (local) and `… --target=atlas` (live); the `NODE_ENV` switch is removed. Behaviour change: without a flag it now bumps local (was Atlas).
- [ ] `check-name-lengths.js`, `check-unit-weights.js`, `time-business-stats.js`: `--target=prod` or any value but `local` / `atlas` now exits 1 with the `parseTarget` message (was: Atlas).
- [ ] `scripts/log-query.mjs` (ESM; load the helper with the `createRequire(resolve(ROOT, 'server', 'package.json'))` it already uses for mongoose): `--target=local|atlas` (default local) replaces `--remote`; `atlas` keeps the existing confirm (`--yes` or an interactive `y`) and prints `REMOTE (Atlas)`; `--remote` alone → `die('--remote was replaced by --target=atlas')`. Keep plan 517's `databaseUri` / SKIP behaviour, now built on `loadServerEnv` + `mongoUri` (local never falls back to `MONGO_URI`; no local URI → `SKIP: no database configured`, exit 0). Still also loads the root `.env` for the non-URI settings it reads today. Update the usage header (line 12).
- [ ] `scripts/test/db-target-usage.test.mjs` (`node:test`, reads files only): for each of the eight files above assert (a) it references `db-target`, (b) it contains no `process.env.MONGO_URI` / `MONGO_LOCAL_URI` / `MONGO_REMOTE_URI` read and no `dotenv` `config(` call, (c) `log-query.mjs` contains no `has('remote')` path other than the replacement message.

### Should Have (P1)
- [ ] `scripts/test/log-query-fallback.test.mjs` (from plan 517): add cases — `databaseUri({ target: 'local' })` with only `MONGO_URI` set → `''` (no Atlas fallback); `--remote` → exit 1 with the replacement message (spawn with `process.execPath`).
- [ ] `docs/brain/patterns/log-query-usage.md:16`: "Production: add `--target=atlas` (Atlas, reads `server/.env.live`). It asks for `y`, or pass `--yes`."
- [ ] `docs/brain/gotchas/backend.md:163`: the `bump-master-version.js` call becomes `node server/scripts/bump-master-version.js --target=atlas` for live data.
- [ ] `docs/workflow-kit/manifest.json` / `.md`: classify `scripts/test/db-target-usage.test.mjs` (`"tier": "project"`, `"action": "stay"`).

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI change. No dictionary keys.

## Atomic Sub-tasks
- [ ] B1: Move the three "anything else is Atlas" checks onto the strict helper — check-name-lengths, check-unit-weights, time-business-stats — server/scripts/check-name-lengths.js, server/scripts/check-unit-weights.js, server/scripts/time-business-stats.js
- [ ] B2: Move the backup, restore and reset scripts onto the helper (rules unchanged; `take-plan.mjs` keeps calling them with `--target=local`) — server/scripts/db-backup.js, server/scripts/db-restore.js, server/scripts/reset-user-from-master.js
- [ ] B3: Make the master-version bump local by default — server/scripts/bump-master-version.js
- [ ] B4: Replace `--remote` with `--target` in the log reader, keeping plan 517's fallbacks — scripts/log-query.mjs
- [ ] B5: Guard the rule with a file-level test and extend the log-query tests — scripts/test/db-target-usage.test.mjs, scripts/test/log-query-fallback.test.mjs
- [ ] B6: Update the two brain docs and the manifest — docs/brain/patterns/log-query-usage.md, docs/brain/gotchas/backend.md, docs/workflow-kit/manifest.json, docs/workflow-kit/manifest.md
- [ ] B7: Run every `[auto]` check plus `node server/scripts/check-name-lengths.js --target=prod` (expect exit 1 with the target message) and paste the outputs under Execution Notes

## What happens when
- A script runs with no flag: local (the two that require a target print the `--target=local|atlas is required` message and exit 1, as today).
- `--target=atlas` in a slot or builder folder: no `.env.live` and no `MONGO_URI` → exits 1 with `server/.env.live not found …`; nothing connects.
- `--target=atlas` in the main folder: loads `.env.live`; the scripts that ask for a confirm or `--confirm-host` today still do.
- The orchestrator's `commands.logQuery` (`--since=plan-start --level=error`, no target): local, or `SKIP: no database configured`.

## Technical Considerations
- Dependencies: `server/utils/db-target.js` (plan 530); `scripts/take-plan.mjs` and `kit.config.json` `commands.dbBackup` call `db-backup.js` / `db-restore.js` with `--target=local` — unchanged.
- New files needed: `scripts/test/db-target-usage.test.mjs`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: each script validates `--target` strictly.
- Security surface: smaller — no script reaches Atlas without the explicit flag and the main folder's `.env.live`.
- Data / migration: none.
- Project checks: log-query `[auto]` present; Reuse Check present; no dictionary keys.

## Out of Scope
- `scripts/qa/qa-up.ps1` (`-Env remote` starts the server with `NODE_ENV=production`, which plan 530's server path already routes through `.env.live`). Kit-managed `slot-serve.mjs` `--main --db remote` (unchanged; it starts the server's `dev:remote`). `server/scripts/ai-eval-recipes.js` (Gemini only, no Mongo).

## Critical Questions
- none

## Execution Notes
- Planner 2026-11-07 (brief 3(b), decision H6). The `_connect.js` users parse `--target` themselves through `parseArgs`, which plan 530 already routes through the helper.
