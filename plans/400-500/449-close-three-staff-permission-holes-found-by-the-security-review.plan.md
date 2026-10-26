# Plan 449 — Close three staff permission holes found by the security review

Status: done
Track: code
Snapshot: f2914519b8e4ee325bffd28f9a038902c9e542e5

## Problem Statement
The automated security review flagged three ways a staff member can get around the plan 427 permission
checker on branch `mvp` (code from plans 425/427):
1. **Locked taxonomy kinds** — `writeAction(type, doc, fallback)` in `server/routes/generic.js` checks the locked
   kinds (`eventType`, `menuType`, `station`) only on the stored doc, so staff can PUT a term of an unlocked kind
   into a locked kind.
2. **Money signature** — `moneySignature` in `server/utils/permissions.js` filters out `null`/`0` values before
   comparing, so staff can move a price to another supplier row (or swap rows) and `moneyFieldsChanged` misses it.
3. **Replace-all (HIGH)** — `router.put('/:type')` → `replaceCollection` in `server/routes/generic.js` has no
   permission check, so staff can replace or wipe a whole business collection, prices and owner items included.

## Goals & Success Criteria
- Primary: staff can no longer change locked taxonomy kinds, move prices, or replace a collection.
- Success:
  - [x] [auto] `npm --prefix server test` passes, including new tests: staff PUT changing a term's `kind` from `ingredientCategory` to `eventType` → 403 and the term is unchanged; staff PUT moving a price from supplier A's row to supplier B's row of a product they created → 403; staff PUT /:type (replace-all) → 403 and the collection is unchanged; owner PUT /:type still works.
  - [x] [auto] `npx ng build` passes.
  - [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [human] As a staff user, open a product created by staff and try to change a supplier's price → the price fields are locked; the owner can still change it.

## Execution Mode
- Parallel: no — writes `server/routes/generic.js` and `server/utils/permissions.js`.
- Concurrent plans: none touching those two files (432, 442, 445, 446, 447 touch `generic.js` or the permissions file).
- Isolated DB: no

## Execution Notes
- Depends on: plan 425 merged, plan 427 merged (both on `mvp`).
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — [human] items become validation cards in `docs/mvp/runs/449.md`.
- Written by the Planner during the MVP run from the three security-review findings (2026-10-21); see `docs/mvp/run-mode.md` "Live notes". If a later plan already fixed one of them, verify it with the test and mark that sub-task done with evidence.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/generic.js
server/utils/permissions.js
server/test/**
docs/mvp/runs/449.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — tightens the ADR 0023 permission rules (owner/staff) enforced by `server/utils/permissions.js`; no rule changes.
- INV-2: preserves — scoping by `businessId` is untouched.
- INV-3: preserves — no client-side cascades.
- INV-4: preserves — no schema change.

## Backend Impact
- Collections affected: taxonomyTerms, products, every type reachable by replace-all.
- New collections: no
- Server changes needed: yes — permission checks in `generic.js` and `permissions.js`.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. Find `writeAction`, `authorizeEdit`, `router.put('/:type'` /
`replaceCollection` in `server/routes/generic.js` and `moneySignature` / `moneyFieldsChanged` in
`server/utils/permissions.js` on `origin/mvp`. Print `ok` or `conflict: <what>` per symbol.

## User Stories
- As a chef who owns the business, I want staff unable to change prices or my event-type lists by any route so that my pricing and settings stay mine.

## Functional Requirements

### Must Have (P0)
- [x] Locked-kind rule checks both the stored and the resulting term.
- [x] Money change detection compares prices per supplier / purchase unit, not as a filtered list.
- [x] Replace-all is owner-only and strips server-owned event fields.

## UI/UX Notes
- None (server only). No new dictionary keys: the 403 reuses `no_permission`.

## Atomic Sub-tasks
- [x] S1: Stop staff from moving a category into an owner-only list such as event types — in `authorizeEdit`, use `editTaxonomy` when the stored OR the merged doc has a kind in `LOCKED_TAXONOMY_KINDS`; server test — `server/routes/generic.js`, `server/test/**`
- [x] S2: Catch staff moving a price between suppliers or purchase units — `moneySignature` keys values by `sources[].supplierId` / `purchaseOptions[].unitSymbol`, maps 0/null/absent to one value; unit + route tests — `server/utils/permissions.js`, `server/test/**`
- [x] S3: Allow only the owner to replace a whole list at once — owner check at the top of `router.put('/:type')`, `withoutServerEventFields` for menuEvents; tests for staff 403 / owner 200 — `server/routes/generic.js`, `server/test/**`
- [x] S4: Build, run all server tests, write the run file with the validation card — `docs/mvp/runs/449.md`

## Technical Considerations
- Dependencies: `assertCan`, `LOCKED_TAXONOMY_KINDS`, `MONEY_FIELDS`, `withoutServerEventFields` (plan 442) already exist on `mvp`.
- New files needed: test file(s) under `server/test/` only.
- Model changes: none.
- Backend / API: replace-all becomes owner-only (staff get 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }`).
- Auth and validation: owner/staff role checks via `assertCan`.
- Security surface: closes three privilege-escalation paths.
- Data / migration: none.
- Project checks: log-query [auto]; chef-side story; no new dictionary keys.

## Out of Scope
- Any client change; new permission actions; changes to the money-field list.

## Critical Questions
None.
