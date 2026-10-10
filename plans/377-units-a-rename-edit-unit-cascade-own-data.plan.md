# Plan 377 — Units A: rename and edit a unit, with cascade to all my products and recipes

Status: draft
Track: code — here (not design)
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

> **Reality check needed (plan review 2026-10-09).** Written before 321 P3.4. The server already re-keys a unit everywhere it is used (`renameTermEverywhere` + `TERM_REFERENCES.unit` in `taxonomy-term.schema.ts`) and blocks deleting a used term (`findTermReferences`). What is really left: show the edit pencil for non-system units (`metadata-manager.page.component.html`, `target.type !== 'unit'`) and allow editing `gramRate`. Plan 378 was closed into this one.

## Problem Statement

In the metadata manager, units can only be added or deleted. There's no rename and no way to change a unit's conversion factor:

- The pencil is hidden for units (`metadata-manager.page.component.html` ~L276). A comment at .ts ~L443-446 says unit rename was deliberately left out of plan 322 because it touches cost and conversion calculations.
- `UnitRegistryService.registerUnit` (`src/app/core/services/unit-registry.service.ts` ~L160) stops early when the key exists, so the rate can't be changed.
- The delete in-use check (`metadata-manager…ts` ~L379-382) only looks at products and ignores recipe ingredients and yields.

Every place a unit key is stored (the cascade must cover all user-owned ones):

| Where | Fields |
| --- | --- |
| Registry | `KITCHEN_UNITS` (per user): `{ units: Record<key, gramFactor> }` |
| Products | `baseUnit`, `purchaseOptions[].unitSymbol`, legacy `unit_options_[].unitSymbol` (still read in `scaling.service.ts` ~L87, `recipe-ingredients-table.component.ts` ~L503) |
| Recipes and dishes | `ingredients[].unit`, `yieldUnit`, `yieldConversions[].unit`, `prepItems[].unit`, `prepCategories[].items[].unit` |
| Dictionary | the units section of `public/assets/data/dictionary.json`, plus `DICTIONARY_OVERRIDES` (per user and `__global__`) for the Hebrew label |
| Leave untouched | `TRASH_*`, `VERSION_HISTORY` snapshots |

`SYSTEM_UNITS` (kg, liter, gram, ml, unit, dish, tablespoon, teaspoon, cup, pinch, portion; `unit-registry.service.ts` ~L20-32) must stay locked.

This plan covers the user's own data. Admin "for everyone" comes in plan 378 (Units B).

## Goals & Success Criteria

- Primary: for any non-system unit, the user can (1) fix its Hebrew label, (2) rename its key, or (3) change its gram/ml factor. Rename cascades to every product and recipe field above; a factor change warns how many products and recipes are affected (costs will change) before saving.
- Primary: deleting a unit checks recipes and dishes as well as products.
- Success: after renaming unit X → Y, rg-style checks in the app show no product or recipe still using X, and costs are unchanged by a pure rename.

## Execution Mode

- Parallel: no. Run after plan 340, plan 365 (scope wording) and plan 375 (Dish types: remove colors) (metadata-manager and kitchen-state).
- Concurrent plans: none touching `kitchen-state.service.ts`, `unit-registry.service.ts` or metadata-manager
- Isolated DB: yes (bulk cascade writes)

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/unit-registry.service.ts
src/app/core/services/unit-registry.service.spec.ts
src/app/core/services/kitchen-state.service.ts
src/app/core/services/kitchen-state.service.spec.ts
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

As a chef, I want to fix a misnamed unit or its conversion once and have every product and recipe follow.

## Functional Requirements

### Must Have (P0)
- [ ] `UnitRegistryService`:
  - `renameUnit(oldKey, newKey)` refuses system units, empty keys and existing `newKey`; moves the factor, persists and updates the signal.
  - `updateUnitRate(key, rateInGrams)` refuses system units and rates ≤ 0.
- [ ] `KitchenStateService.cascadeRenameUnitForAll(oldKey, newKey): Promise<{ products: number; recipes: number }>`:
  - Updates every product and recipe/dish field in the table above.
  - Uses `applyProductCascadeUpdate` and `applyCascadeUpdate`, so the activity log and version history are recorded without a toast per item.
  - Leaves the numeric amounts untouched.
- [ ] `countUnitUsage(key)` covering products and recipes/dishes, all fields. Used by delete (blocks or warns with counts), rename confirm and rate-change confirm.
- [ ] Metadata manager, units only:
  - Show the edit action for non-system units (in the tap menu from plan 340). It opens the unit editor (reuse unit-creator in an edit mode) prefilled with the Hebrew label, key and factor.
  - Save path:
    - label-only change → `translationService.updateDictionary(key, he, 'me')`
    - key change → confirm "{n} מוצרים ו-{m} מתכונים יעודכנו", then `renameUnit` + cascade + dictionary entry for the new key
    - factor change → confirm "שינוי ההמרה ישנה עלויות ב-{n} מוצרים ו-{m} מתכונים", then `updateUnitRate`
  - System units keep the lock badge and have no edit.
- [ ] Remove the "unit rename out of scope" comment and the units exclusion where it's no longer true (the user scope only).
- [ ] Specs:
  - registry rename and rate guard rules
  - cascade touches every field (a fixture product with base, purchase and legacy options; a recipe with ingredient, yield, conversions, prep items and prep category items)
  - usage count

### Should Have (P1)
- [ ] Rename and rate change in one save: rename first, then the rate.

### Nice to Have (P2)
- None.

## UI/UX Notes

- Dictionary (append): `unit_edit` = "עריכת יחידה", `unit_rename_confirm` = "{n} מוצרים ו-{m} מתכונים יעודכנו. להמשיך?", `unit_rate_change_confirm` = "שינוי ההמרה ישנה עלויות ב-{n} מוצרים ו-{m} מתכונים. להמשיך?", `unit_in_use_delete` = "היחידה בשימוש ב-{n} מוצרים ו-{m} מתכונים".
- Counts are substituted in code.

## Atomic Sub-tasks

- [ ] A1: Registry `renameUnit` / `updateUnitRate` plus spec (`unit-registry.service.*`).
- [ ] A2: `countUnitUsage` and `cascadeRenameUnitForAll` plus specs, covering all fields (`kitchen-state.service.*`).
- [ ] A3: Metadata UI: edit for non-system units; unit-creator edit mode; confirms (`metadata-manager/**`, `shared/unit-creator/**`).
- [ ] A4: Delete in-use check covers recipes.
- [ ] A5: Build, specs. Manual test against the isolated DB: rename a custom unit used in 2 products and 1 recipe; check the cost is unchanged. Update session-state.

## Technical Considerations

- Dependencies: `UnitRegistryService`, `KitchenStateService` (`applyCascadeUpdate`, `applyProductCascadeUpdate`), `TranslationService.updateDictionary`, `MetadataManagerPageComponent`, `UnitCreatorComponent`, recipe-cost (read-only verification).
- New files: none.
- Model changes: none.
- `UNIT_ALIASES` / `MASS_UNITS` in `recipe-cost.constants.ts` reference system units only, so they're untouched.

## Out of Scope

- Admin push of unit changes to everyone (plan 378, Units B).
- Renaming or editing system units.
- Rewriting trash and version-history snapshots.

## Critical Questions

- Deleting a unit that's in use:
  a) Block, showing the counts (default)
  b) Allow after a warning (leaves items with an unknown unit)

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/core/services/unit-registry.service.spec.ts --include=src/app/core/services/kitchen-state.service.spec.ts --include=src/app/pages/metadata-manager/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Metadata → units → edit a custom unit "קרטון" → rename → the confirm shows the counts → save → the products and recipe using it now show the new unit; recipe cost is unchanged.
- [human] Change its factor → the cost-impact confirm → costs update accordingly.
- [human] System units (ק"ג, ליטר…) show a lock and no edit.
