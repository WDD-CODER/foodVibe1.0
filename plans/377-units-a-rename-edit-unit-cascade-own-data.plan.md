# Plan 377 — Units A: edit a custom unit's name and conversion in the metadata manager

Status: draft
Track: code — here (not design)
Snapshot: d601af5a9c761146f41191f6c49fb56b732774d6

> **Trimmed 2026-10-17 (Planner).** The original draft (client-side cascade, `countUnitUsage`, delete check) was written before 321 P3.4. The server now does that work: changing a term's `key` re-keys every product, recipe and dish that uses it (`renameTermEverywhere` + `TERM_REFERENCES.unit` in `server/generated/schemas/entities/taxonomy-term.schema.js`), and deleting a term that is in use is refused (`findTermReferences`, `server/routes/generic.js`). What is left is the client UI only. Plan 378 was closed into this one.

## Problem Statement

In the metadata manager, units can be added and deleted but not edited:

- The units card sets `[canEdit]="false"` (`metadata-manager.page.component.html` ~L24), so the tap menu has no pencil.
- `onRenameMetadata` (`metadata-manager.page.component.ts` ~L627) has no `unit` branch; `registryRename`, `getAffectedCount` and `reloadAfterRename` ignore units. The comment at ~L468 still says unit rename is "out of scope".
- There is no way to change a custom unit's `gramRate`. `UnitRegistryService.registerUnit` returns early when the key exists.

So a typo in a unit name or a wrong conversion (e.g. "קרטון = 500g" that should be 750g) can only be fixed by delete + re-create, and delete is blocked once the unit is used.

`SYSTEM_UNITS` (kg, liter, gram, ml, unit, dish, tablespoon, teaspoon, cup, pinch, portion; `unit-registry.service.ts`) stay locked. They already show a lock reason (`unit_default_unremovable`) and must not get an edit action.

## Goals & Success Criteria

- For any custom unit the user can edit, they can change (1) its Hebrew label, (2) its English key, (3) its gram conversion, from one edit dialog.
- Key change: confirm with the number of affected products + recipes/dishes, then `taxonomy.updateByKey('unit', old, { key })` (the server re-keys everything), then reload products, recipes and dishes.
- Conversion change: confirm "this changes costs in N products and M recipes", then `taxonomy.updateByKey('unit', key, { gramRate })`.
- A pure rename leaves every recipe cost unchanged.

## Architecture Impact

- INV-3: preserves — the server stays the owner of cross-document consistency: a unit key change goes through `TaxonomyStore.updateByKey` and the server re-keys every product/recipe/dish (`renameTermEverywhere`); the client only reloads its lists, it never writes the cascade itself.
- INV-5: preserves — units stay taxonomy terms; edits use the existing `TaxonomyStore` update path and registry service, no parallel unit store.
- INV-6: preserves — no AI calls added or changed.

## Execution Mode

- Parallel: yes, with any plan not touching `metadata-manager/**`, `unit-registry.service.*` or `shared/unit-creator/**`.
- Isolated DB: yes (a key rename writes to many documents).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/unit-registry.service.ts
src/app/core/services/unit-registry.service.spec.ts
src/app/pages/metadata-manager/**
src/app/shared/unit-creator/**
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

As a chef, I want to fix a misnamed unit or its conversion once and have every product and recipe follow, without deleting and re-creating it.

## Functional Requirements

### Must Have (P0)
- [ ] `UnitRegistryService.renameUnit(oldKey, newKey)` and `updateUnitRate(key, gramRate)`: refuse system units, an empty or existing `newKey`, and a rate ≤ 0; otherwise call `taxonomy.updateByKey('unit', …)`. Errors go through `taxonomy.errorMessage` like `deleteUnit`.
- [ ] Units card: edit action for custom units only (per item — system units keep the lock and get no pencil). Replace the card-wide `[canEdit]="false"` with something per item, or rely on the existing `lockReason` if it already hides the menu for system units; check before changing `taxonomy-kind-manager`.
- [ ] Edit dialog prefilled with Hebrew label, key and conversion (reuse `unit-creator` in an edit mode if it fits; otherwise a small dialog inside `metadata-manager/**`). Shared units the user can't edit get the existing `taxonomy_shared_admin_only` message.
- [ ] Save path in `onRenameMetadata`, `unit` branch:
  - label only → `translationService.updateDictionary(key, he, 'me')`
  - key change → affected-count confirm → `renameUnit` → dictionary entry for the new key → reload products, recipes, dishes
  - conversion change → cost-impact confirm → `updateUnitRate`
  - key + conversion in one save → rename first, then the rate on the new key
- [ ] `getAffectedCount('unit', key)` counts products (`baseUnit`, `purchaseOptions[].unitSymbol`) and recipes/dishes (`ingredients[].unit`, `yieldUnit`, `yieldConversions[].unit`, `prepItems[].unit`, `prepCategories[].items[].unit`); `reloadAfterRename('unit')` reloads all three lists.
- [ ] Remove the "unit is out of scope" comment.

### Nice to Have (P2)
- None.

## UI/UX Notes

- Dictionary (append): `unit_edit` = "עריכת יחידה", `unit_rename_confirm` = "{n} מוצרים ו-{m} מתכונים יעודכנו. להמשיך?", `unit_rate_change_confirm` = "שינוי ההמרה ישנה עלויות ב-{n} מוצרים ו-{m} מתכונים. להמשיך?". Counts substituted in code.

## Atomic Sub-tasks

- [ ] A1: Let the unit registry rename a custom unit or change its conversion safely — `renameUnit` / `updateUnitRate` with guards + specs — `src/app/core/services/unit-registry.service.ts`, `unit-registry.service.spec.ts`
- [ ] A2: Add an Edit button and dialog for custom units in the metadata manager — Edit action for custom units only; edit dialog (label, key, conversion) — `src/app/pages/metadata-manager/**`, `src/app/shared/unit-creator/**`
- [ ] A3: Update every product and recipe that uses a unit when it is renamed — `unit` branch in `onRenameMetadata` + `getAffectedCount` + `reloadAfterRename`; confirms; dictionary keys; drop the out-of-scope comment — `src/app/pages/metadata-manager/metadata-manager.page.component.ts`, `public/assets/data/dictionary.json`
- [ ] A4: Prove a rename keeps costs the same and a conversion change updates them — Build + specs; manual test on the isolated DB (rename a custom unit used in 2 products and 1 recipe, cost unchanged; change its conversion, cost changes); update session-state — `docs/session-state-<branch>.md`

## Technical Considerations

- Dependencies: `TaxonomyStore.updateByKey`, `UnitRegistryService`, `TranslationService.updateDictionary`, `MetadataManagerPageComponent`, `TaxonomyKindManagerComponent`, product/recipe/dish data services (`reloadFromStorage`).
- Legacy `unit_options_[].unitSymbol` is not in `TERM_REFERENCES.unit`. If the isolated DB still has products with it, note it in the PR — don't widen scope to the server.
- New files: possibly one small edit-dialog component under `metadata-manager/components/`.

## Out of Scope

- Admin push of unit edits to everyone.
- Editing system units.
- Server changes (the re-key and delete-in-use check already exist).
- Rewriting trash and version-history snapshots.

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/core/services/unit-registry.service.spec.ts --include=src/app/pages/metadata-manager/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Metadata → units → tap a custom unit → edit → change its key → the confirm shows the counts → save → the products and recipe that used it now show the new unit, and the recipe cost is unchanged.
- [human] Change the same unit's conversion → cost-impact confirm → recipe cost changes to match.
- [human] System units (ק"ג, ליטר…) still show the lock and offer no edit.
