# Plan 386 — One write-ownership rule (canWrite) + "remove for me" / "rename for me" on shared terms

Status: draft
Snapshot: adb954d97afb90d0874b524731ac7e63297d57d4

## Problem Statement
Since P3.4 (`5512ea1a`) the built-in metadata terms are single shared `__master__` docs. They
are editable only by an admin (`TaxonomyStore.canEdit`, `generic.js` `termWriteOwner`), so a
regular user sees 🔒 on every default category, allergen, unit, label, course, menu type,
prep category and section, and can't remove or rename any of them. Before the cutover each
user had a private copy and could change items for himself. The Human's rule (2026-10-05) is:
**a regular user changes/removes only what's his; the admin can also change shared items
for everyone.** There is also no single place that enforces this: each write route in
`generic.js` hand-rolls `userId` filters, which is how this regression slipped in.

## Goals & Success Criteria
- Primary: one ownership rule, enforced in one server helper with one client mirror, recorded in the brain.
- Success: a regular user can remove a default term, or rename it (display name only), **for himself only**, and other users still see the original. The admin keeps edit/delete-for-everyone and can also remove/rename a term for himself only.

## Execution Mode
- Parallel: no
- Concurrent plans: —
- Isolated DB: no (additive: override docs in `taxonomyTerms`, no migration)
- Prerequisite: Plan 385 "Unblock writes: per-user write rate limit…" merged (same files).

## Read-Write Scope

```scope
server/utils/can-write.js
server/routes/generic.js
server/test/**
shared/schemas/entities/taxonomy-term.schema.ts
src/app/core/services/permission.service.ts
src/app/core/services/permission.service.spec.ts
src/app/core/services/taxonomy-store.service.ts
src/app/core/services/taxonomy-store.service.spec.ts
src/app/core/services/metadata-registry.service.ts
src/app/core/services/menu-event-type.service.ts
src/app/core/services/menu-section-categories.service.ts
src/app/core/services/preparation-registry.service.ts
src/app/pages/metadata-manager/**
public/assets/data/dictionary.json
docs/brain/decisions/0016-write-ownership-rule.md
docs/brain/gotchas/backend.md
docs/brain/index.md
AGENTS.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories
- As a chef (regular user), I want to remove a built-in category I never use, so that my lists stay clean, without affecting anyone else.
- As a chef (regular user), I want to rename a built-in term the way my kitchen calls it, without affecting anyone else.
- As the admin, I want to choose "for me" or "for everyone" when I remove or rename a shared item.
- As the admin, I want shared items to stay editable for everyone by me only.

## Functional Requirements

### Must Have (P0)
- [ ] **`server/utils/can-write.js`**: `canWrite(user, doc)` returns `doc.userId === user.userId || (doc.userId === '__master__' && user.role === 'admin')`. `ownerFilter(req)` gives the Mongo `userId` filter for writes (own, or own ∪ master for an admin). `generic.js` PUT `/:type/:id`, DELETE `/:type/:id` and DELETE `/:type/bulk` use these instead of inline `userId: req.user.userId` / `termWriteOwner`. Behavior for non-taxonomy collections is unchanged.
- [ ] **Per-user override doc:** the taxonomy term schema gets two optional fields on `termShape`: `hidden?: true` and `displayName?: string` (min 1). A user's own term doc with the same `kind`/`key` as a master term is an **override** of it: `hidden: true` = "removed for this user"; `displayName` = "renamed for this user" (display only — the `key` and every reference stay the master key). The unique index `kind_key_user_unique` already allows one override per user per term.
- [ ] **POST override (taxonomyTerms with `hidden` and/or `displayName`)** is allowed for any signed-in user only when master has that `kind`/`key` (skip the `masterHasTerm` 409 for this case). With `hidden: true` it is **blocked (409 + `referencedBy`) when the user's own docs still use the key** (`findTermReferences` scoped to the caller), the same rule as delete. A `displayName`-only override has no reference check (the key doesn't change). Changing it later = PUT on the caller's own override (covered by `canWrite`).
- [ ] **GET taxonomyTerms** (signed-in): return master ∪ own, minus master terms the caller has hidden; a caller's `displayName` override is merged onto the returned master term; the override docs themselves are not returned. With `?includeHidden=1`, return the hidden overrides too (for the restore list). Anonymous reads are unchanged.
- [ ] **Restore / reset name:** clearing `hidden` or `displayName` PUTs the override without that field; when neither field is left, DELETE the override. Skip the reference check for override docs.
- [ ] **Client `PermissionService`** (`src/app/core/services/permission.service.ts`) has `canWrite(doc)` with the same rule as the server, and `isShared(doc)`. `TaxonomyStore.canEdit` delegates to it. Add `TaxonomyStore.hideForMe(kind, key)`, `restoreForMe(kind, key)`, `renameForMe(kind, key, displayName)` and `resetNameForMe(kind, key)`.
- [ ] **Display:** the registry facades show `displayName ?? key`, so every picker shows the user's name while stored references stay the master key.
- [ ] **Metadata Manager** (main page, `preparation-category-manager`, `section-category-manager`, menu types). On a shared term:
  - non-admin: the 🔒 badge is replaced by ✏ "rename for me" and 🗑 "remove for me" (confirms, then `hideForMe`). A short "shared" hint (dictionary key) is kept. A term renamed for me shows ↺ "reset name".
  - admin: 🗑 and rename both open `confirmModal.openTernary` with "for me / for everyone". "For me" calls `hideForMe` / `renameForMe`; "for everyone" keeps the existing delete / re-key rename flow.
  - Own terms are unchanged (full rename/delete).
- [ ] **Brain:**
  - ADR `docs/brain/decisions/0016-write-ownership-rule.md`. It records that the rule (owner; admin also over `__master__`; per-user remove/rename of shared terms via an override doc) supersedes the P3.4 "shared terms admin-only, no per-user overrides" note, and that it is the taxonomy slice of 0008 D1.
  - One hard-rule line in `AGENTS.md`: "Write routes authorize through `server/utils/can-write.js`; never hand-roll `userId` write filters."
  - Gotcha in `backend.md`: "P3.4 dropped per-user removal → users lost CRUD on defaults".
  - Index line in `docs/brain/index.md`.

### Should Have (P1)
- [ ] "Removed items" disclosure per Metadata Manager section (from `?includeHidden=1`) with a ↺ restore button.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL, `translatePipe` only. Append-only new keys in `dictionary.json` (hotspot): `taxonomy_remove_for_me`, `taxonomy_remove_for_me_confirm`, `taxonomy_rename_for_me`, `taxonomy_reset_name`, `taxonomy_shared_hint`, `taxonomy_removed_items`, `taxonomy_restore`, `taxonomy_scope_me`, `taxonomy_scope_everyone`.
- Lucide icons already in use (`trash-2`, `x`, `lock`, `pencil`, `rotate-ccw` — verify `pencil` and `rotate-ccw` with `npm run lint:icons`).

## Atomic Sub-tasks
- [ ] A1: `can-write.js` + unit tests. Refactor `generic.js` PUT/DELETE/bulk-DELETE to use it. Existing `generic.test.js` + `taxonomy-terms-api.test.js` stay green (`server/utils/can-write.js`, `server/routes/generic.js`, `server/test/**`).
- [ ] A2: Schema `hidden` + `displayName`. POST override rules (allowed only over a master key; `hidden` blocked when own docs reference it; `displayName` no ref check). PUT own override. GET filtering + `displayName` merge + `includeHidden`. Restore/reset clears the field, deletes the override when empty. Tests for each, including: user B still sees the term user A hid, and still sees the original name of the term user A renamed (`taxonomy-term.schema.ts`, `generic.js`, `server/test/**`).
- [ ] A3: `PermissionService` + spec. `TaxonomyStore.canEdit` delegates. `hideForMe` / `restoreForMe` / `renameForMe` / `resetNameForMe` + spec. Facades show `displayName ?? key` (`permission.service.ts`, `taxonomy-store.service.ts`, registry facades).
- [ ] A4: Metadata Manager main page: non-admin "rename for me" / "remove for me" / "reset name", admin ternary for remove and rename (`src/app/pages/metadata-manager/**`).
- [ ] A5: Same for prep-category, section-category and menu-type UIs.
- [ ] A6: Dictionary keys (append-only) (`public/assets/data/dictionary.json` — hotspot).
- [ ] A7 (P1): Removed-items disclosure + restore.
- [ ] A8: ADR 0016, AGENTS.md hard-rule line, gotcha, brain index.
- [ ] A9: Grep for any place that renders a term key without going through the facades (so a `displayName` override wouldn't show). If it's outside the scope, raise it via the Escalation Protocol.

## Technical Considerations
- Dependencies: `TaxonomyStore`, the six registry facades (they read through the store, so hidden terms vanish from every picker and renamed terms show the new name; nothing else reads `taxonomyTerms`), and `confirmModal.openTernary`.
- `generic.js` is not growth-frozen, but keep the net growth small: logic goes in `can-write.js`.
- Security surface: authorization logic for all write routes moves into `can-write.js` — tests must cover non-owner PUT/DELETE being refused and a regular user being unable to write a `__master__` doc.
- New files: `server/utils/can-write.js`, `src/app/core/services/permission.service.ts` (+ spec), `docs/brain/decisions/0016-write-ownership-rule.md`.
- Model changes: `hidden?: true` and `displayName?: string` on the taxonomy term schema (`npm run build:schemas`).
- Hebrew canonical values: n/a (`displayName` is display-only; keys stay canonical).

## Success Criteria
- [auto] `npm --prefix server test` → exits 0, and the new can-write, hidden-override and displayName-override tests pass.
- [auto] `npx ng build` → exits 0.
- [auto] `npx ng test --watch=false --browsers=ChromeHeadless` → exits 0.
- [auto] `npm run lint:icons` → exits 0.
- [auto] `git grep -n "userId: req.user.userId" -- server/routes/generic.js` → no matches in the PUT `/:type/:id`, DELETE `/:type/:id` and DELETE `/:type/bulk` handlers.
- [human] As a **regular user**: Metadata Manager → a default category shows 🗑 (no 🔒). Remove it, and it disappears; it's also gone from the product form's category picker.
- [human] As the regular user: rename a default category "for me" → the new name shows in Metadata Manager and the product form's picker; products that use it still show it (under the new name).
- [human] Sign in as **another user** → the removed category is still there, and the renamed one has its original name.
- [human] As the regular user: "reset name" brings the original name back.
- [human] As the regular user, try removing a default allergen used by one of your products → blocked with the product's name.
- [human] As **admin**: 🗑 on a shared label opens "for me / for everyone". "For me" hides it only for you. Rename on a shared label also offers "for me / for everyone".
- [human] (P1) "Removed items" → ↺ restore brings it back.

## Out of Scope
- Kitchen/team hierarchy (chef → sous chefs): discarded by the Human 2026-10-05.
- Per-user re-keying of shared terms (only the display name changes per user).
- Phase 5 whole-document overrides for products/recipes.

## Critical Questions
- Q1 (resolved 2026-10-05 → **b**): a regular user can rename a shared term for himself only — display name stored on the override doc; key unchanged.
