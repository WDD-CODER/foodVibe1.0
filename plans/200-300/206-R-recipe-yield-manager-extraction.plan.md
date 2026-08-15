---
name: RecipeYieldManager extraction
overview: Extract yield/scaling logic from recipe-header.component.ts into a plain RecipeYieldManager utility class, reducing component from ~490 to ~250 LOC.
todos: []
isProject: false
---

# Goal
Extract yield/scaling logic from `recipe-header.component.ts` into a `RecipeYieldManager` utility class.

# Atomic Sub-tasks

- [ ] Create `src/app/core/utils/recipe-yield-manager.util.ts` — plain class with constructor `(form, allUnitKeys, resetTrigger, fb)`; move all 7 computeds + all primary/secondary/toggle methods verbatim; keep `manualTrigger_` inside manager; expose `bump()`
- [ ] Update `recipe-header.component.ts` — instantiate `protected readonly yield = new RecipeYieldManager(...)`, delete all moved members (~240 LOC), add `toggleTypeWrapper`, `onPrimaryUnitChangeWrapper`, `changeSecondaryUnitWrapper`
- [ ] Update `recipe-header.component.html` — replace actual template bindings: `toggleType()→toggleTypeWrapper()`, `primaryAmount_()→yield.primaryAmount_()`, `primaryUnitLabel_()→yield.primaryUnitLabel_()`, `primaryUnitOptions_()→yield.primaryUnitOptions_()`, `currentRecipeTypeDisplay_()→yield.currentRecipeTypeDisplay_()` (×4), `onScalingChipAmountChange→yield.*`, `setPrimaryUnit→yield.*`, `secondaryConversions→yield.*`, `getSecondaryUnitOptions→yield.*`, `onSecondaryScalingChipAmountChange→yield.*`, `changeSecondaryUnit→changeSecondaryUnitWrapper`, `removeSecondaryUnit→yield.*`, `addSecondaryChipWithDefault→yield.*`
- [ ] Update `recipe-header.component.spec.ts` — update method calls to `component.yield.*`; rewrite `onPrimaryUnitChange` emit test (manager returns `'create_unit'`, component wrapper handles emit); fix bracket-access computeds to `component.yield.*`

# Constraints

- `RecipeYieldManager` is a plain class, NOT injectable — instantiated with `new` in component
- No `ChangeDetectorRef` inside the manager — component handles CDR in wrappers
- No Angular `output()` inside the manager — component handles emitting
- Single quotes, no semicolons
- Don't touch label management, metrics display, or `onCreateUnit`

# Done when

- `ng build` succeeds with no errors
- `recipe-header.component.ts` ≤ 260 LOC
- `recipe-yield-manager.util.ts` ~240 LOC
- All existing `recipe-header.component.spec.ts` tests pass
