# Plan 378 — Units B: admin "for everyone" when adding, renaming, editing or deleting a unit

Status: draft
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Plan 377 (Units A) gives users rename, factor-edit and cascade on their own data. Admins still can't publish unit changes to everyone:

- `resolvePushScope()` (`metadata-manager.page.component.ts` ~L513) only offers the scope prompt for label, course, category and allergen; units always resolve to "me". The delete push also skips units (~L422).
- The server's `PUT /:type/registry-rename-master` (`server/routes/generic.js` ~L299-350) allowlists `KITCHEN_LABELS`, `KITCHEN_COURSES`, `KITCHEN_CATEGORIES` and `KITCHEN_ALLERGENS`, and assumes an `items[]` registry.
- `KITCHEN_UNITS` is a map: `{ units: Record<key, gramFactor> }` (one doc per user plus `__master__`; cloned to new users per `server/constants/collections.js`), so the existing route can't handle it.

Semantics, the same as the other registries today: "everyone" updates `__master__` (what new users get, and users without `_userModified` on sync), plus the shared `__global__` dictionary for the Hebrew label. It does not rewrite other users' products or recipes. Units are too risky for a cross-user cascade, because they change costs.

## Goals & Success Criteria

- Primary: an admin adding, renaming, re-rating or deleting a non-system unit gets the scope prompt (texts from plan 365, `entity: 'metadata'`). "Everyone" applies the same change to the master units map and the global dictionary.
- Success: a new test signup after an admin "everyone" rename receives the renamed unit with the new factor. Regular users never see the prompt.

## Execution Mode

- Parallel: no. Run after plan 377 (Units A) and plan 365 (scope wording).
- Concurrent plans: none touching `server/routes/generic.js` or metadata-manager
- Isolated DB: yes

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/generic.js
server/test/**
src/app/core/services/http-storage.adapter.ts
src/app/core/services/async-storage.service.ts
src/app/core/services/unit-registry.service.ts
src/app/core/services/unit-registry.service.spec.ts
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As an admin, I want to fix a unit once for all future users, the same way I can for labels and categories.

## Functional Requirements

### Must Have (P0)
- [ ] Server: new `PUT /api/v1/data/KITCHEN_UNITS/unit-master` (`verifyToken`, `requireAdmin`), body `{ op: 'upsert'|'rename'|'delete', key, newKey?, rate? }`.
  - Validates keys: non-empty, no `.`, not starting with `$`, not a system unit (mirror `SYSTEM_UNITS` server-side in a small constant).
  - Validates `rate > 0` for upsert and rename-with-rate.
  - Operates on `{ userId: '__master__' }`, upserting the doc if missing:
    - upsert: `$set units.<key> = rate`
    - rename: read the factor (or use `rate`), `$set units.<newKey>`, `$unset units.<key>`
    - delete: `$unset units.<key>`
  - Then `bumpMasterVersion()`.
- [ ] Client plumbing: `HttpStorageAdapter.pushUnitToMaster(op, …)` → `AsyncStorageService` → `UnitRegistryService.pushToMaster(...)`, best-effort with an error message (same as `pushRegistryRenameToMaster`).
- [ ] Metadata manager:
  - `resolvePushScope` includes `unit` (admin only, unchanged gating).
  - On add, rename, factor edit and delete of a non-system unit, an "everyone" choice calls `pushToMaster` with the matching op, and the Hebrew label goes through `translationService.updateDictionary(key, he, 'everyone')`.
  - Remove the unit exclusions at ~L422 and ~L514.
- [ ] Server tests: each op on `__master__`; rejects a system unit, a bad key, a non-admin (403) and a bad rate.

### Should Have (P1)
- [ ] The confirm text for an admin "everyone" factor change notes that it affects new users' costs, while existing users keep their own until they sync.

### Nice to Have (P2)
- None.

## UI/UX Notes

- Scope prompt texts come from plan 365 (create, save and delete variants).
- Dictionary (append): `unit_everyone_rate_note` = "השינוי יחול על משתמשים חדשים; משתמשים קיימים שעדכנו יחידות בעצמם לא יושפעו."

## Atomic Sub-tasks

- [ ] A1: Server route plus system-unit constant plus tests (isolated DB) (`server/routes/generic.js`, `server/test/**`).
- [ ] A2: Client adapter, storage and registry plumbing (`http-storage.adapter.ts`, `async-storage.service.ts`, `unit-registry.service.*`).
- [ ] A3: Metadata scope prompt for units; wire the ops; global dictionary on "everyone" (`metadata-manager.page.component.*`).
- [ ] A4: Build, server and client tests. Manual test: admin renames a custom unit for everyone → a new signup sees the new unit. Update session-state.

## Technical Considerations

- Dependencies: `generic.js` (`bumpMasterVersion`, `requireAdmin`), `HttpStorageAdapter`, `AsyncStorageService`, `UnitRegistryService`, `MetadataManagerPageComponent`, `TranslationService.updateDictionary`, `MasterPushService` (scope texts).
- New files: none, apart from tests.
- Model changes: none.
- No cross-user writes to products or recipes (by design).
- Security surface: new admin-only write route on `__master__` — key validation blocks Mongo operator/dot-path injection (`$`, `.`); test the 403 path.

## Out of Scope

- Cascading a unit rename into other users' existing products and recipes.
- System units.

## Critical Questions

- Admin deletes a unit "for everyone" that some users still use:
  a) Remove from master only; existing users keep it (default)
  b) Block if master-derived users use it

## Success Criteria

- [auto] Server tests for `unit-master` → 0 failures.
- [auto] `npx ng test --watch=false --include=src/app/core/services/unit-registry.service.spec.ts --include=src/app/pages/metadata-manager/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] As admin: rename the custom unit "ארגז" → "ארגז 10 ק״ג" → "עדכן לכולם" → sign up a new test user → they see "ארגז 10 ק״ג" with the new factor.
- [human] As a regular user: unit edits never show a scope prompt.
