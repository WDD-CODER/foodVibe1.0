# Plan 369 — Recipe builder: correct prompt and yield when switching dish ↔ preparation

Status: draft
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Switching a recipe between "מנה" (dish) and "הכנה" (preparation) in the recipe builder shows the wrong modal and corrupts the yield.

- **Wrong modal.** `RecipeHeaderComponent.toggleTypeWrapper()` (`src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts` ~L217-228) opens a confirm with `type_change_confirm_message` / `type_change_confirm_header` whenever the form is dirty. Those keys don't exist in `public/assets/data/dictionary.json`, so the modal shows raw English keys. For an existing record, the save path (`recipe-builder.page.ts` ~L680-694, ~L1121-1135) asks again with `type_change_to_dish_*` / `type_change_to_preparation_*` (dictionary L330-333): two prompts for one action.
- **Yield corruption.** `RecipeYieldManager.toggleType()` (`src/app/core/utils/recipe-yield-manager.util.ts` ~L350-370) does the following:
  - dish → preparation: sets `yield_conversions[0]` to `{ amount: serving_portions, unit: 'gram' }`, so "4 portions" becomes "4 g". The header effect re-syncs from ingredient weight only when `netoConfirmed()` is false; after an AI prefill or a loaded confirmed recipe, "4 g" sticks.
  - preparation → dish: sets `serving_portions = max(1, amount)`, so a 500 g preparation becomes 500 portions.

## Goals & Success Criteria

- Primary: switching type shows at most one clear, Hebrew prompt. New recipe: a short confirm only if the form has content. Existing recipe: no prompt at toggle time (the save-time confirm stays).
- Primary: switching never produces nonsense yields. dish → preparation yields the ingredient total weight; preparation → dish yields 1 portion, or the previous portion count if the user toggles back.
- Success: dish → preparation → dish returns exactly to the original portions.

## Execution Mode

- Parallel: yes
- Concurrent plans: none touching recipe-header or `recipe-yield-manager.util.ts`. Run after plans 332 and 348 and plan 364 (Search fields part 2) (all touch recipe-header).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/recipe-builder/components/recipe-header/**
src/app/pages/recipe-builder/recipe-builder.page.html
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/core/utils/recipe-yield-manager.util.ts
src/app/core/utils/recipe-yield-manager.util.spec.ts
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

As a chef, I want to switch a recipe between dish and preparation and get a clear Hebrew prompt and sensible yield numbers.

## Functional Requirements

### Must Have (P0)
- [ ] `RecipeHeaderComponent` gets an input `isExistingRecord` (bound from the page's `recipeId_() !== null`).
  - Existing record: `toggleTypeWrapper()` toggles without a prompt; the save-time confirm remains the single prompt.
  - New record, dirty: confirm with new keys `type_toggle_header` = "שינוי סוג" and `type_toggle_to_preparation_message` = "המעבר להכנה ישנה את התפוקה למשקל הרכיבים. להמשיך?" / `type_toggle_to_dish_message` = "המעבר למנה ישנה את התפוקה למספר מנות. להמשיך?", chosen by direction.
- [ ] `RecipeYieldManager.toggleType()`:
  - Cache the last values per type in the manager (a `lastDishPortions_` and a `lastPrepYield_` `{amount, unit}` signal).
  - dish → preparation: if a cached preparation yield exists, use it. Otherwise set unit `gram`, amount = the current ingredient total weight (the value the header effect already computes), and set `netoConfirmed` false so the effect keeps it in sync.
  - preparation → dish: `serving_portions` = the cached dish portions, or 1; `yield_conversions[0]` unit `dish`.
- [ ] Spec for the manager: dish(4) → prep → dish returns 4; a new prep → dish gives 1; dish → prep uses the ingredient weight, not 4 g.

### Should Have (P1)
- [ ] Don't delete the old `type_change_confirm_*` usage silently: grep for any other reference first. None are in the dictionary, so remove the code references.

### Nice to Have (P2)
- None.

## UI/UX Notes

- Dictionary (append): `type_toggle_header`, `type_toggle_to_preparation_message`, `type_toggle_to_dish_message` (texts above).
- The existing `type_change_to_*` keys stay for the save-time confirm.

## Atomic Sub-tasks

- [ ] A1: Yield manager caching and correct conversions, plus spec (`recipe-yield-manager.util.ts`, spec).
- [ ] A2: `isExistingRecord` input; toggle prompt logic; dictionary keys (`recipe-header/**`, `recipe-builder.page.*`).
- [ ] A3: Build, specs. Manual test of new and existing, both directions. Update session-state.

## Technical Considerations

- Dependencies: `RecipeHeaderComponent`, `RecipeYieldManager`, `RecipeBuilderPage` (`recipeId_`, save-time type-change confirm, unchanged), the header weight-sync effect (`netoConfirmed`).
- New files: none.
- Model changes: none.

## Out of Scope

- The save-time type-change flow (delete + add across collections; plan 332 may touch it).
- Yield conversions beyond the first row.

## Critical Questions

- New recipe with an empty form, switching type:
  a) No prompt (default)
  b) Always prompt

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/core/utils/recipe-yield-manager.util.spec.ts --include=src/app/pages/recipe-builder/**/*.spec.ts` → 0 failures.
- [auto] `rg -n "type_change_confirm" src/app` → no matches.
- [auto] `npm run build` → exit 0.
- [human] New dish, 4 portions, 3 ingredients (~600 g) → switch to הכנה → one Hebrew prompt → yield shows ~600 g → switch back → 4 portions.
- [human] Open an existing dish → switch to הכנה → no prompt → save → the save-time Hebrew confirm appears once.
