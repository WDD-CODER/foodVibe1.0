# Plan 475 — Rename a measurement unit everywhere it is used, with a clear name-clash message

Status: done
Track: code
Snapshot: feb9f3da29fafafdacf2f3f12cfd22a5791d58f6

## Problem Statement
The Human validated the metadata manager (`/dashboard?tab=metadata`) on branch `mvp` and asked to fix typos in unit
names (handoff `docs/mvp/review-handoff-2026-10-21.md`, G5; decision D8 answered: **rename everywhere** — renaming a
unit must be transparent in every place that uses it).

What was verified in code on `mvp` (file:line), and what was not:
- **How units are stored.** One `taxonomyTerms` document per unit, `kind: 'unit'`, with `key` and `gramRate`
  (`shared/schemas/entities/taxonomy-term.schema.ts:124`, INV-5). The name the chef sees is the dictionary label of the
  key: chips render `item | translatePipe` (`taxonomy-kind-manager.component.html:59,78`). The label is a per-business
  `DICTIONARY_OVERRIDES` entry written by `TranslationService.updateDictionary` (`translation.service.ts:146-211`); the
  fixed base units (`SYSTEM_UNITS`, `unit-registry.service.ts:29-41`) take their label from `dictionary.json`.
- **A rename already exists for a business's own units** (plan 377): tap the chip → pencil → `app-unit-edit-dialog`
  (Hebrew name, key, gram rate; `unit-edit-dialog.component.ts`) → `onUnitEditSaved`
  (`metadata-manager.page.component.ts:749-783`). A key change is one `PUT /api/v1/data/taxonomyTerms/:id`; the server
  re-keys every referencing document in that same request (`server/routes/generic.js:594-599` → `renameTermEverywhere`
  `:161-179`, called at `:619-624`; plan 385, INV-3). A label-only change writes only the dictionary entry, so every
  screen shows the new name and no document changes. The handoff line "units can only be removed" matches the stale
  input comment "(units: delete only)" (`taxonomy-kind-manager.component.ts`, `canEdit` input) — the unit card does
  not set `[canEdit]="false"` (`metadata-manager.page.component.html:15-26`). Not reproduced in a browser: sub-task R1
  replays it first.
- **Every place that stores a unit key** (schema fields) and whether the server rename reaches it:

  | Where | Field | In `TERM_REFERENCES.unit` (`taxonomy-term.schema.ts:60-64`) |
  | --- | --- | --- |
  | products | `baseUnit` (`product.schema.ts:8`) | yes |
  | products | `purchaseOptions[].unitSymbol` (`product.schema.ts:16`) | yes |
  | products | `purchaseOptions[].uom` — the «:» unit a purchase quantity is measured in (`product.schema.ts:19`, read by `purchase-option-rate.util.ts:17-20`, written by `cook-view.page.ts:1103`, `inventory-product-list.component.ts:712`) | **no** |
  | recipes, dishes | `ingredients[].unit` (`common.schema.ts:8`), `yieldUnit`, `yieldConversions[].unit`, `prepItems[].unit`, `prepCategories[].items[].unit` (`recipe.schema.ts:19-35`) | yes |
  | menuEvents, suppliers, equipment, venues, business | no unit field (`menu-event.schema.ts`, `equipment.schema.ts`, `supplier.schema.ts`, `venue.schema.ts`, `business.schema.ts`) | n/a |

  So today a rename leaves `purchaseOptions[].uom` on the old key: `getConversion(old)` is 0, the `|| 1` fallback in
  `purchase-option-rate.util.ts:19` kicks in, and that purchase unit's price-per-base-unit becomes wrong. The same gap
  lets a unit still used only as a `uom` be deleted (`findTermReferences`, `generic.js:140-155`). The client's usage
  count for the confirm question also misses it (`unitUsage`, page `.ts:510-524`).
- **Name clash.** The client refuses a key that already exists (`registryHasKey`, page `.ts:758-760`;
  `renameUnit`, `unit-registry.service.ts:222-225`) with raw Hebrew literals in `.ts`. The server refuses a clash with
  a **master** key (`masterHasTerm`, `generic.js:191`, 409 at `:594-596`) but a clash with another unit of the **same
  business** only fails on the unique index after the write starts (`kind_key_business_unique`, `server/db.js:106-109`)
  and returns the generic `'Entity already exists'` (`generic.js:627`). Nothing stops two units getting the **same
  Hebrew name** under different keys, which makes typed units ambiguous (`TranslationService.resolveUnit`).
- **Master vs own units (INV-2).** Taxonomy terms are NOT cloned into a business: they are read live as master ∪ own
  (`readScope`, `server/utils/business-scope.js:18-24`; `taxonomyTerms` is `cloneable: false`,
  `server/constants/collections.js`), and master sync (`server/services/sync-master.js`) never touches them. So there is
  no "business copy" of a master unit to rename. Today a master unit is locked for everyone but the platform admin
  (`lockReasonKey`, page `.ts:200-204`; `TaxonomyStore.canEdit`); the admin's rename cascades to every business
  (`termScope`, `generic.js:69`). Fresh seeds hold only the fixed base units as master units
  (`server/services/seed-master.js:67`). This plan keeps that rule (see Critical Question 1).
- **Permissions.** `unit` is not an owner-only kind (`LOCKED_TAXONOMY_KINDS = ['eventType','menuType','station']`,
  `server/utils/permissions.js:19`), so under C-PERM a staff member may rename a unit **he created** and gets 403 on any
  other unit (`can` → `NOT_CREATOR`, `permissions.js:45`). The client shows that 403 as a generic save error
  (`TaxonomyStore.errorMessage` maps only its own errors, `taxonomy-store.service.ts:196-203`).
- **Master clones are not re-synced over a rename:** the cascade `$set`s only the unit field and leaves
  `_userModified` as it was; a clone that uses a business-own unit was already edited by the business
  (`_userModified: true`), so sync skips it (`sync-master.js:320,354`). No change needed.

## Goals & Success Criteria
- Primary: renaming a unit (its name or its key) shows the new name on every product, purchase unit, recipe and dish,
  costs stay the same, and a clash is refused with a clear message.
- Success:
  - [x] [auto] `npx ng build` passes.
  - [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [x] [auto] `npm --prefix server test` passes, including new tests in `server/test/taxonomy-terms-api.test.js` ("plan 475" block): one PUT re-keying an own unit renames it in products (`baseUnit`, `purchaseOptions.unitSymbol`, `purchaseOptions.uom`), recipes (`ingredients.unit`, `yieldUnit`) and dishes (`ingredients.unit`) and leaves another business's docs on the old key; deleting a unit used only as a `purchaseOptions.uom` → 409 with `referencedBy`; re-keying onto another own unit's key → 409 `{ messageKey: 'unit_name_taken' }` and nothing changed; and in `server/test/permissions-api.test.js`: staff re-keying a unit the owner created → 403 and no document changed; staff re-keying a unit he created → 200.
  - [x] [auto] `npx ng test --watch=false --include=src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts --include=src/app/core/services/taxonomy-store.service.spec.ts --include=src/app/core/services/unit-registry.service.spec.ts` passes, including: saving a unit with the Hebrew name of another unit is refused with `unit_name_taken` and nothing is written; the usage count counts a purchase unit measured in the unit; a 409 / 403 reply with a `messageKey` is shown as that key's text.
  - [ ] [human] Replay G5 (rename a name): on `/dashboard?tab=metadata` create a unit «קופסא» (typo), use it on one product as a purchase unit and in one recipe; then open the unit, fix the name to «קופסה» and save. The product page, the recipe and the purchase-unit dropdown all show «קופסה»; the product's cost per unit and the recipe cost are unchanged.
  - [ ] [human] Replay G5 (rename a key used as a purchase basis): a product whose purchase unit reads «1 ארגז = 500 : <your unit>» keeps the same price per kilo after the unit's key is renamed.
  - [ ] [human] Name clash: renaming a unit to the name of another unit shows «כבר קיימת יחידה בשם הזה» and changes nothing.

## Execution Mode
- Parallel: no — writes `server/routes/generic.js` (also written by plan 477) and the metadata page (written by plan 468).
- Concurrent plans: 468 rewrites parts of `metadata-manager.page.component.ts/.html` (rename field, jump bar) — start after 468 merges. 477 writes `server/routes/generic.js` — run one after the other, either order. 461 writes `src/app/shared/unit-creator/**` (not touched here).
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only, never `main`.
- MVP run mode: executed per `docs/mvp/run-mode.md` — `[human]` items become validation cards in `docs/mvp/runs/475.md`, `[auto]` items are marked `[x]` only with evidence in that file.
- Depends on: plan 468 merged into `mvp` (same page files).
- Written by the Planner from handoff G5 with decision D8 = rename everywhere (2026-10-21).
- `server/generated/` is git-ignored and rebuilt by `npm --prefix server test` (`pretest` → `build:schemas`), so the `TERM_REFERENCES` change is made only in `shared/schemas`.
- No data migration: existing products whose `uom` already points at a renamed-away key cannot be detected reliably (the old key is gone); the Worker logs the count of products whose `purchaseOptions.uom` is not a known unit key (local DB, or `deferred: local MongoDB down`) in the run file for the Human.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/taxonomy-term.schema.ts
server/routes/generic.js
server/test/taxonomy-terms-api.test.js
server/test/permissions-api.test.js
src/app/core/services/taxonomy-store.service.ts
src/app/core/services/taxonomy-store.service.spec.ts
src/app/core/services/unit-registry.service.ts
src/app/core/services/unit-registry.service.spec.ts
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
docs/mvp/runs/475.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. (Likely case: R1 finds the pencil missing on an own unit because
of `taxonomy-kind-manager`; in MVP run mode add `src/app/pages/metadata-manager/components/taxonomy-kind-manager/taxonomy-kind-manager.component.ts` / `.html` to the scope block, log the decision, continue.)

## Architecture Impact
- INV-1: preserves — `server/routes/generic.js` keeps every write behind `authorizeEdit`; staff may still rename only units they created (C-PERM unchanged); the new clash check runs after the permission check.
- INV-2: preserves — master units stay master-only (platform admin); a business renames only its own unit terms; the cascade stays inside the term's scope (`termScope`); master sync is untouched.
- INV-3: preserves — the rename stays one server request that re-keys every referencing document (`renameTermEverywhere`); this plan adds the missing `purchaseOptions.uom` path to that same cascade; the client only reloads lists.
- INV-4: preserves — `shared/schemas` changes only the `TERM_REFERENCES` table, no entity shape; the server still validates every write.
- INV-5: preserves — units stay `taxonomyTerms` of kind `unit`; no new kind or collection; `unit-registry.service.ts` and `taxonomy-store.service.ts` stay facades over the store.

## Backend Impact
- Collections affected: taxonomyTerms (re-key), products / recipes / dishes (cascade, now including `purchaseOptions.uom`).
- New collections: no
- Server changes needed: yes — one more reference path; an explicit same-business clash check with a `messageKey` on both 409s.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. On `origin/mvp` find: `TERM_REFERENCES` `unit:` entry in
`taxonomy-term.schema.ts`; `renameTermEverywhere`, `masterHasTerm`, `rekeyed = current` in `server/routes/generic.js`;
`unitUsage`, `onUnitEditSaved`, `registryHasKey` in `metadata-manager.page.component.ts`; `renameUnit` in
`unit-registry.service.ts`; `errorMessage` in `taxonomy-store.service.ts`; `app-unit-edit-dialog` in the page template.
Print `ok` or `conflict: <what>` per symbol.

## User Stories
- As a chef, I want to fix a typo in a unit's name once so that every product, recipe and dish shows the right name.
- As a chef, I want a renamed unit to keep my costs exactly as they were so that a typo fix never changes a price.
- As a chef, I want to be told clearly when the new name is already taken so that I never end up with two units that look the same.

## Functional Requirements

### Must Have (P0)
- [x] A unit key rename re-keys `purchaseOptions.uom` too, in the same request as every other reference.
- [x] A unit used only as a purchase basis (`uom`) cannot be deleted while used.
- [x] Renaming onto a key another unit of the same business has → 409 with `messageKey: 'unit_name_taken'`; the master clash 409 gets the same `messageKey`.
- [x] Saving a unit whose Hebrew name equals another unit's shown name is refused on the client with `unit_name_taken`.
- [x] The confirm question's product count includes products that use the unit only as a purchase basis.
- [x] A 409 or 403 reply carrying a `messageKey` is shown as that key's text (covers the staff 403 `no_permission`).

### Nice to Have (P1)
- [ ] None.

## UI/UX Notes
- No new screen: the existing pencil → unit edit dialog (plan 377) stays the entry point; R1 confirms it is reachable for own units.
- New dictionary key: `unit_name_taken` = «כבר קיימת יחידה בשם הזה». Reused: `no_permission`, `unit_rename_confirm`, `unit_name_empty`, `taxonomy_shared_admin_only`.
- The raw Hebrew error literals on the touched lines (`onUnitEditSaved` clash message, `renameUnit` clash message) are replaced by `unit_name_taken`; other literals in these files are out of scope.

## Atomic Sub-tasks
- [x] R1: Check in the browser which unit chips offer the edit pencil today, before changing anything — as owner and as platform admin, tap an own unit, a shared unit and a base unit on `/dashboard?tab=metadata`; write a 3-row table (unit kind → pencil yes/no → dialog opens yes/no) under `## Decisions` — `docs/mvp/runs/475.md`
- [x] S1: Make a unit rename also update the purchase basis of every purchase unit — add `'purchaseOptions.uom'` to `TERM_REFERENCES.unit.products` (keeps `baseUnit`, `purchaseOptions.unitSymbol`); `renameTermEverywhere` and `findTermReferences` pick it up unchanged (nested path `purchaseOptions.$[k].uom`) — `shared/schemas/entities/taxonomy-term.schema.ts`
- [x] S2: Refuse a unit rename onto a name the business already uses, with a clear reason — in `router.put('/:type/:id')`, inside the existing `isTerm && key changed` block (after `authorizeEdit` and the schema check), look up `{ businessId: current.businessId, kind: current.kind, key: updatable.key, _id: { $ne: current._id } }` and return 409 `{ error: 'TERM_KEY_TAKEN', kind, key }` when found, adding `messageKey: 'unit_name_taken'` only when `kind === 'unit'` (other kinds keep their own client checks); add the same `messageKey` rule to the existing master-clash 409 — `server/routes/generic.js`
- [x] S3: Prove the full rename by server tests — "plan 475" describe block: one PUT re-keys an own unit in products (`baseUnit`, `purchaseOptions.unitSymbol`, `purchaseOptions.uom`), recipes (`ingredients.unit`, `yieldUnit`) and dishes (`ingredients.unit`), another business's product keeps the old key; delete blocked when only a `uom` uses it (409 `referencedBy`); own-key clash → 409 with `messageKey` and the term plus all docs unchanged — `server/test/taxonomy-terms-api.test.js`
- [x] S4: Prove staff can rename only units they created — staff (`STAFF` of `b1`) PUT `{ key }` on a unit seeded with `createdBy: 'own1'` → 403 `FORBIDDEN` and the referencing product unchanged; on a unit with `createdBy: 'st1'` → 200 and the product re-keyed — `server/test/permissions-api.test.js`
- [x] C1: Show the server's reason when a unit save is refused — in `TaxonomyStore.errorMessage`, return `translate(err.error.messageKey)` for an `HttpErrorResponse` (409 or 403) whose body has a string `messageKey`; spec for 409 `unit_name_taken` and 403 `no_permission` — `src/app/core/services/taxonomy-store.service.ts`, `src/app/core/services/taxonomy-store.service.spec.ts`
- [x] C2: Use the clear clash message in the unit service — `renameUnit`'s "already exists" branch shows `translate('unit_name_taken')` instead of the Hebrew literal; spec — `src/app/core/services/unit-registry.service.ts`, `src/app/core/services/unit-registry.service.spec.ts`
- [x] C3: Refuse a unit name that another unit already shows, and count purchase bases as uses — in `onUnitEditSaved`, when the Hebrew label changed, refuse (message `unit_name_taken`, nothing written) if any other key in `allUnitKeys_()` has `normalizeHebrew(translate(k)) === normalizeHebrew(next.hebrewLabel)`; replace the key-clash Hebrew literal with `unit_name_taken`; in `unitUsage`, also count a product when `(p.purchaseOptions ?? []).some((o) => o.uom === key)`; specs for both — `src/app/pages/metadata-manager/metadata-manager.page.component.ts`, `src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts`
- [x] V1: Build, run server and client tests, log the count of products whose `purchaseOptions.uom` is not a known unit key (or `deferred: local MongoDB down`), replay the three [human] scenarios, write the run file with evidence and the validation cards — `docs/mvp/runs/475.md`

## Technical Considerations
- Dependencies: `renameTermEverywhere` / `findTermReferences` (plan 321 Phase 3, plan 385), unit edit dialog (plan 377), `assertCan` (plan 427), `normalizeHebrew` (`src/app/core/utils/recipe-match.util.ts:3`). Reuse first: no new dialog, picker or endpoint.
- `TERM_REFERENCES` is also read by `server/scripts/lib/cleanup-fixers.js:205` (orphan-term cleanup); adding `uom` makes it count those uses too, which is correct.
- The Hebrew label and the gram rate are separate writes after the key PUT (existing plan 377 order: key → label → rate). Only the key re-key touches other documents, and it is one request (INV-3). A failed label write leaves the new key showing its English text; the existing `persistDictionaryOverride` logs it. Not changed here.
- The cascade bypasses per-document permission checks by design: a staff member renaming a unit he created also re-keys owner-created products that use it (the rename is a label fix, no money value changes). Stated so the checker does not flag it.
- `DICTIONARY_OVERRIDES` is a system type (no per-creator check, `permissions.js:21`): a label-only change by staff is not refused. Existing behaviour; out of scope.
- New code: signals, `inject()`, no `any`, single quotes / no semicolons in `.ts`. Server tests use the in-memory Mongo (run-mode live note).
- Security surface: none new; the clash check runs after `authorizeEdit`, so it reveals nothing to a caller who may not edit the term.
- Project checks: log-query [auto]; chef-side stories; new dictionary key `unit_name_taken`.

## Out of Scope
- Any export, print or preview of a recipe or a menu — plan 471, not this run.
- Letting a business owner rename a shared (master) unit or a base unit — see Critical Question 1.
- The inline Save / Cancel rename field (plan 468) — units keep their dialog.
- A data migration for `uom` values already orphaned by an earlier rename.
- Hiding the pencil from staff on units they did not create (the server refuses; C1 shows why).

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it. Still open: Q1 (shared units vs the business own units).
1. Shared units: a business owner cannot rename a unit from the shared list today (only the platform admin can, and his rename changes it for every business). The brief assumed each business has its own copy; it does not — units are read live from the shared list. Recommended: keep shared and base units locked for owners in this plan (fresh databases hold only the base units as shared units, so this hits only units the admin added to the shared list). Alternative: let an owner change only how a shared unit's name is shown in his business (a per-business label; no document changes) — a follow-up plan.
