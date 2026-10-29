# Plan 508 — log-query loads the Mongo driver through mongoose so it works under pnpm

Status: draft
Track: code — here (not design)
Depends-on: none
Snapshot: ac5b606f5fdb3737afb35995793b633a7b81429b

## Problem Statement

`scripts/log-query.mjs:107` loads the driver with `require('mongodb')`, resolved from `server/package.json`.
`mongodb` is not a direct dependency of `server/`; it only comes in through `mongoose`. The old npm layout hoisted it
to `server/node_modules/mongodb`, so it worked. Under pnpm's strict layout (plan 505) only direct dependencies sit in
`server/node_modules`, so log-query fails with `Cannot find module 'mongodb'`. That broke the `logQuery` check in
run-507 (`kit.config.json:37`).

`mongoose` exposes the driver it bundles as `mongoose.mongo` (checked: `mongoose.mongo.MongoClient` is the same
function as `mongodb`'s `MongoClient`). One line fixes it, with no new package.

## Goals & Success Criteria

- Primary: `node scripts/log-query.mjs` reads Mongo `app_logs` in any checkout whose `server/` packages were installed
  with pnpm.
- Success:
  - [auto] `grep -n "require('mongodb')" scripts/log-query.mjs` → no output.
  - [auto] In the Worker slot after `cd server` then `pnpm install --frozen-lockfile` (pnpm layout:
    `server/node_modules/.pnpm` exists, `server/node_modules/mongodb` does not), with local Mongo up,
    `node scripts/log-query.mjs --since=15m` → exit 0, printing entries or `No entries`, and no `Cannot find module`.
  - [auto] `pnpm run build` → exit 0.

## Execution Mode

- Parallel: yes — one line in one script.
- Concurrent plans: none known
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` — add to them,
never rewrite or remove an existing entry without escalating).

```scope
scripts/log-query.mjs
```

## Read Scope

Entire repo.

## Escalation Protocol

If a file outside the scope is needed: STOP, tell the Human the file, the change and why; offer `approved: <path>`;
append it to the scope block; retry.

## Architecture Impact

- INV-none: preserves — a local agent script changes how it loads the Mongo driver; no app code, route, schema,
  tenancy rule, taxonomy term or AI call changes.

## Reuse Check

- Mongo driver for log-query — family: none — rung: 4 — why: reuses the driver `mongoose` already bundles (`mongoose.mongo`); no new piece and no new package

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`: re-read `fromMongo()` in `scripts/log-query.mjs`
and confirm the `require('mongodb')` line.

## User Stories

- As the Human, the orchestrator's log check and the bug-report trigger (`log-query --summary`) work in every pnpm
  checkout instead of failing on a missing package.

## Functional Requirements

1. In `fromMongo()` in `scripts/log-query.mjs`, replace `const { MongoClient } = require('mongodb')` with
   `const { MongoClient } = require('mongoose').mongo`. Keep the same `createRequire(server/package.json)` and the
   `dotenv` line (`dotenv` is a direct `server/` dependency).

## UI/UX Notes

None — no UI.

## Atomic Sub-tasks

- [ ] A1: Load the Mongo driver through mongoose so log-query no longer needs a hoisted package — require('mongoose').mongo.MongoClient in fromMongo(); no new dependency — scripts/log-query.mjs
- [ ] A2: Prove log-query reads Mongo in a pnpm-installed checkout and the build still passes — the three Success checks; paste outputs — this plan file (Execution Notes)

## Out of Scope

- Kit-side fixes, such as installing the orchestrator merge folder's `server/` packages. The Human handles those in
  the kit session; this plan sends no kit addendum.
- Adding `mongodb` to `server/package.json` or `scripts/package.json`.
- Backend / API, auth, security surface, data / migration: none.

## Execution Notes

- Planner (2026-10-29): approach from the kit session, agreed by the Human: one line, no new package, no kit addendum.
