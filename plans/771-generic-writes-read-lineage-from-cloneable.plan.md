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

- [ ] L1: Write a failing test: a non-cloneable collection added only to COLLECTIONS is refused today by its own lineage fields — server/test/generic-lineage.test.js
- [ ] L2: Make the generic routes read clone lineage from the cloneable flag instead of a hand list — server/routes/generic.js
- [ ] L3: Correct the New Collection Checklist so planners stop asking for the generic route — docs/agent/standards-backend.md
- [ ] L4: Run every automatic check and paste the outputs under Execution Notes — plans/771-generic-writes-read-lineage-from-cloneable.plan.md

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
