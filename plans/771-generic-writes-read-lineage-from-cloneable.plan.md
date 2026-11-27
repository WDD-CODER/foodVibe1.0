# Plan 771 — Generic writes add clone lineage only to cloneable collections, so a new collection needs no route edit

Status: draft
Depends-on: none
Track: code
Snapshot: b7b1ed46

## Problem Statement
Three plans parked or waited on the same one-line edit to `server/routes/generic.js`: 554 (`knowledgeItems`), 764
(`menuDesigns`, run md-0, 2026-11-27) and the plan that first wrote the list (512). Each time the generic POST added
`_masterId` / `_userModified` to the new type, its strict Zod schema refused them (400), and the plan had to ask for
`server/routes/generic.js` — a sensitive path the run's advisor may not approve, so the run waited for Dandan.

The cause: `NO_LINEAGE` (`server/routes/generic.js:124`) is a hand-written copy of the `cloneable: false` flag in
`server/constants/collections.js`, and `docs/agent/standards-backend.md` §3 step 4 says "Generic routes need no new
code" — wrong for every new collection that is not cloneable. §3 step 2 already states the rule: "a cloneable doc
carries `_masterId` / `_userModified`, a non-cloneable one must not". `baseDocShape` has neither field, so a strict
schema of a non-cloneable type refuses both today.

## Goals & Success Criteria
**Primary:** the generic routes add lineage fields exactly to the `cloneable` collections; adding a non-cloneable
collection needs no change to `server/routes/generic.js`.

- [auto] `pnpm run test:server` exits 0, including the new `server/test/generic-lineage.test.js`:
  - a generic POST and PUT on every type in `CLONEABLE_TYPES` still set `_masterId` / `_userModified` as before;
  - a generic POST on a non-cloneable type (`knowledgeItems`, `clients`, `taxonomyTerms`, `frontDeskProfiles`) sets
    neither field, as before;
  - a non-cloneable collection added only to `COLLECTIONS` in the test (no edit to `generic.js`) is created by a
    generic POST without either field.
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] The name NO_LINEAGE no longer appears in server/routes/generic.js (the hand list is gone).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/771-generic-writes-read-lineage-from-cloneable.plan.md` → `ARCH: ok`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] Create one knowledge item and one client in the app (any business): both save, as before.

## Execution Mode
- Parallel: no — one plan.
- Concurrent plans: none in this run.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/generic.js
server/constants/collections.js
server/test/generic-lineage.test.js
docs/agent/standards-backend.md
server/test/collections.test.js
server/test/cross-business.test.js
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no permission or ownership check changes; only which fields a generic write stamps.
- INV-2: preserves — every query keeps its `businessId` scope (`scopeFilter`); nothing about tenancy changes.
- INV-3: preserves — cross-document consistency is unchanged; the lineage fields keep their meaning for cloneable types.

## Reuse Check
- none — `CLONEABLE_TYPES` already exists in `server/constants/collections.js`; the route reads it instead of a copy.

## Defaults

- row-action-icons — exception — why: server only; no list row or row action changes (the word "list" names a collection list in code).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the planner of a new collection, I add it to `COLLECTIONS` and its schema, and the generic routes just work.

## Functional Requirements
- `server/routes/generic.js`: replace `NO_LINEAGE` with a set built from `CLONEABLE_TYPES`
  (`require('../constants/collections')`); the POST (~line 606) and PUT (~line 740) stamp lineage only when the type
  is in it.
- `docs/agent/standards-backend.md` §3 step 4: say that lineage follows the `cloneable` flag of step 2, so a new
  collection needs no generic-route edit (remove "Generic routes need no new code" only as far as it misleads).

## UI/UX Notes
- None.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] L1: Write a failing test: a non-cloneable collection added only to COLLECTIONS is refused today by its own lineage fields — server/test/generic-lineage.test.js
- [x] L2: Make the generic routes read clone lineage from the cloneable flag instead of a hand list — server/routes/generic.js
- [x] L3: Correct the New Collection Checklist so planners stop asking for the generic route — docs/agent/standards-backend.md
- [x] L4: Run every automatic check and paste the outputs under Execution Notes — plans/771-generic-writes-read-lineage-from-cloneable.plan.md

## What happens when
- A cloneable collection (products, recipes, …): its docs get `_masterId` / `_userModified` as today.
- A non-cloneable collection that is not in the old list (requests, bookings, invoices, …): a generic POST no longer
  adds the two fields; their strict schemas refuse them today, so a generic write that failed now succeeds.

## Technical Considerations
- Do not run browser checks.

## Out of Scope
- The kit's advisor rule for sensitive paths; the clone and sync jobs.

## Critical Questions
- none

## Execution Notes

- Step 0 (drift): `16675a4a` ok (`menuDesigns` joined the hand list; it is `cloneable: false`, so the flag covers it);
  `d8a0e9df` ok (added the `menuDesigns` entry to `COLLECTIONS`; no symbol this plan names was removed).
- L1 before the route change: `npx vitest run test/generic-lineage.test.js` (in `server/`) → 1 failed, 13 passed; the
  failure was `non-cloneable lineageProbes`: `unrecognized_keys: "_masterId", "_userModified"`.
- L2/L3 after: `npx vitest run test/generic-lineage.test.js test/generic.test.js test/collections.test.js
  test/cross-business.test.js` → exit 0, 4 files, 109 passed.
- `docs/agent/plan-checks.md:62-64` still tells planners to add a non-cloneable type to `NO_LINEAGE` in
  `server/routes/generic.js`. It is outside this scope and was not edited.

Checks (code commit `0290ed45`):

- `node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm` → exit 0.
- `pnpm run build` → exit 0 (budget and CommonJS warnings only).
- `pnpm run lint` → exit 0, 0 errors, 69 warnings.
- `pnpm run test:ci` → exit 0, `TOTAL: 2797 SUCCESS`.
- `pnpm run test:server` → first run exit 1: `test/ai-invoice-read.test.js` could not start its in-memory MongoDB
  (`Instance failed to start within 10000ms`); 152 files / 2037 tests passed. Rerun once → exit 0, 153 files, 2055
  passed. An earlier attempt was stopped by the shell's 10-minute background limit before it reported.
- `kit-manifest-check.mjs --root .` → exit 0, `KIT_MANIFEST: ok — 453 classified, 0 unclassified`.
- `node scripts/scope-check.mjs --diff=origin/orch/lineage --plan=…` → exit 0, `SCOPE: ok` (the main folder's copy of
  the same script, called from here, reads the main folder and listed its untracked files).
- `kit-checks.mjs --base origin/orch/lineage --plan …` → exit 0, `KIT_CHECKS: ok (6 checks)`.
- `node scripts/override-check.mjs` → exit 0; `pnpm run lint:icons` → exit 0; `pnpm run lint:no-native-select` → exit 0.
- `node scripts/plan-ledger-check.mjs` → exit 0, `PLAN_LEDGER: OK`; `node scripts/breadcrumbs-check.mjs` → exit 0, clean.
- `node scripts/ci-scope-check.mjs --checkout-branch` → exit 0 (printed `skipped (branch "" is not feat/NNN-*)`).
- `node scripts/scope-check.mjs --arch --plan=…` → exit 0, `ARCH: ok INV-1, INV-2, INV-3`.
- `node scripts/log-query.mjs --since=plan-start --level=error` → exit 0, `SKIP: no database configured`.
- Name check: a search for `NO_LINEAGE` in `server/routes/generic.js` → 0 matches.
