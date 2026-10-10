# Plan 407 — One soft-delete model and per-user state (userPrefs)

Status: draft
Track: code — here (not design)
Snapshot: 34711de5f66c48518097d15b77edbe8e909b98c1

## Problem Statement
Carried out of plan 321 (Phase 6) when 321 was closed (Human, 2026-10-10). FoodVibe has three
deletion mechanisms and keeps per-user state on shared documents:

- 7 `TRASH_*` collections (`server/constants/collections.js` ~L31–37: recipes, dishes, products,
  equipment, venues, menu events, suppliers — the last added by plan 366), filled by
  `trash.service.ts`.
- `_userDeleted` tombstones (`server/routes/generic.js` DELETE).
- `hiddenBy[]` / `favoritedBy_[]` arrays written onto shared recipe/dish documents
  (`recipe-data.service.ts`, `dish-data.service.ts`), marked `@deprecated` in v2 (plan 321 P2a).

Plan 321's Phase 6 assumed Phase 5 (shared master + per-user overrides on every entity) — Phase 5
was **dropped** (Human, 2026-10-06). So this plan targets today's model: per-user documents,
plus shared `__master__` items with per-user overrides only where plan 386 added them
(taxonomy terms). Re-derive the design in Step 0 against that reality.

## Goals & Success Criteria
- Primary: one soft-delete model (`deletedAt` / `deletedBy` on the doc) and one per-user state
  collection (`userPrefs`), with no `TRASH_*` collections and no `hiddenBy` / `favoritedBy`
  fields left.
- Success:
  - [auto] Server tests pass (`npm --prefix server test`), with new tests: delete sets `deletedAt`; list excludes it; restore unsets it; purge removes only docs older than N days; user A's favorites/hidden never touch user B's view.
  - [auto] Migration dry run on a restored Atlas copy (scratch DB) reports counts per `TRASH_*` collection moved and `hiddenBy`/`favoritedBy` entries moved, and a second run is a no-op.
  - [auto] After the real migration: a read-only check script prints 0 `TRASH_*` collections and 0 docs with `hiddenBy` / `favoritedBy`.
  - [auto] `ng build` and `ng test` pass.
  - [human] Delete → Trash → Restore works for product, recipe, dish, equipment, venue, menu event, supplier.
  - [human] Favorites and hidden items survive for 3 real accounts (spot check before/after).

## Execution Mode
- Parallel: no (touches `generic.js`, data services and a production migration).
- Isolated DB: yes — server tests on the slot's isolated DB; migration rehearsed on a restored Atlas copy before Atlas (memory: plan 310 — test performance-risk work against the real deployment early).
- Concurrent plans: none touching `server/routes/generic.js`, `trash.service.ts`, `*-data.service.ts`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/generic.js
server/constants/collections.js
server/migrations/0005-soft-delete-unify.js
server/migrations/tools/**
server/jobs/**
server/repositories/**
server/test/**
shared/schemas/**
src/app/core/services/trash.service.ts
src/app/core/services/trash.service.spec.ts
src/app/core/services/user-prefs-store.service.ts
src/app/core/services/user-prefs-store.service.spec.ts
src/app/core/services/recipe-data.service.ts
src/app/core/services/dish-data.service.ts
src/app/core/services/kitchen-state.service.ts
src/app/pages/trash/**
docs/brain/decisions/0*-soft-delete-user-prefs.md
docs/brain/index.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry. Every Atlas write needs the Human's go
at that moment.

## Architecture Impact

- INV-1: preserves — delete/restore authorize through `server/utils/can-write.js`; users delete only their own docs, the admin also `__master__`.
- INV-2: preserves — per-user hide of shared items moves from arrays on shared docs into `userPrefs`; the ability to hide for yourself stays in the same release.
- INV-3: preserves — the migration and the purge job run server-side; the client never loops writes to move or delete docs.
- INV-4: preserves — `deletedAt` / `deletedBy` and `userPrefs` are added to `shared/schemas`; the server validates them.
- INV-5: preserves — taxonomy terms keep their own per-user hide (plan 386); this plan does not move terms or change `taxonomyTerms`.

## Step 0 — Reality Check

Before any code: list every reader/writer of `TRASH_*`, `_userDeleted`, `hiddenBy`,
`favoritedBy_` (client + server), count affected docs on local and Atlas (read-only), and post
the model to the Human: which collections get `deletedAt`, how master items are hidden per
user, purge window N (proposal 30 days), what happens to `TRASH_SUPPLIERS` (plan 366's
admin "delete for everyone"). Stop for a go.

## User Stories
- As a cook, when I delete something it goes to Trash and I can bring it back; my favorites and
  hidden items are mine and never change what someone else sees.

## Functional Requirements

### Must Have (P0)
- [ ] `deletedAt` / `deletedBy` on user-owned docs; lists exclude them; restore unsets them.
- [ ] Purge job hard-deletes `deletedAt` older than N days (N from Step 0).
- [ ] `userPrefs { userId, favorites: {type, id}[], hidden: {type, id}[] }` — schema, server
      routes/repo, client `UserPrefsStore`; recipe/dish favorite + hide use it.
- [ ] Migration `0005-soft-delete-unify.js`: `TRASH_*` docs back into their collections with
      `deletedAt` (keep the original deletion time when stored); `hiddenBy` / `favoritedBy` →
      `userPrefs`; strip those fields; drop `TRASH_*` only after verify. Idempotent; dry-run flag.
- [ ] Trash page reads `deletedAt != null` per type; UI otherwise unchanged.

### Should Have (P1)
- [ ] ADR (next free number) "one soft-delete model + userPrefs"; brain index line.

### Nice to Have (P2)
- none

## UI/UX Notes
- Trash page looks the same. No new strings expected; if any, through `translatePipe`.

## Atomic Sub-tasks
- [ ] P6.0: Reality Check (readers/writers, Atlas counts, model + purge window) → Human go — `docs/session-state-<branch>.md`
- [ ] P6.1: `deletedAt`/`deletedBy` model in schemas + `generic.js` + purge job, with server tests — `shared/schemas/**`, `server/routes/generic.js`, `server/jobs/**`, `server/test/**`
- [ ] P6.2: `userPrefs` schema + server repo/routes + client `UserPrefsStore`; recipe/dish favorite + hide moved onto it — `shared/schemas/**`, `server/repositories/**`, `src/app/core/services/**`
- [ ] P6.3: `server/migrations/0005-soft-delete-unify.js` (dry run on Atlas copy → Human go → Atlas) + read-only check script — `server/migrations/**`
- [ ] P6.4: Trash UI on `deletedAt`; `trash.service.ts` rewritten — `src/app/pages/trash/**`, `src/app/core/services/trash.service.ts`
- [ ] P6.5: ADR + brain index (P1); build, tests, Human check list — `docs/brain/**`

## Technical Considerations
- Migration numbering: `0001`–`0004` exist; this is `0005`.
- Plan 386 (per-user hide/rename on shared terms) may land first and also touch `generic.js` — reconcile in Step 0.

## Out of Scope
- Shared master + per-user overrides on every entity (plan 321 Phase 5, dropped).
- Plan 321 Phases 7–8 (dropped when 321 closed).

## Critical Questions
- Purge window N (proposal 30 days) — asked in Step 0.
