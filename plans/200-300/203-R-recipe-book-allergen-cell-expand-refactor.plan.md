---
name: Recipe-book allergen + cell-expand refactor
overview: Extract allergen resolution to a pure util and deduplicate expand-state management, reducing recipe-book-list from 735 to ~590 LOC.
todos: []
isProject: false
---

# Goal
Reduce `recipe-book-list.component.ts` from 735 to ~590 LOC by extracting recursive allergen resolution into a pure utility function and replacing 4 inline expand signals + 8 expand methods with two `CellExpandState` instances.

# Atomic Sub-tasks
- [ ] Create `src/app/core/utils/recipe-allergens.util.ts` — export `MAX_ALLERGEN_RECURSION = 5` and pure `resolveRecipeAllergens(recipe, allRecipes, allProducts, maxDepth): string[]`
- [ ] Create `src/app/core/utils/cell-expand-state.util.ts` — `CellExpandState` class with `expandAll_`, `expandedIds_`, `isExpanded`, `toggleOne`, `toggleAll`, `closeAll`, `reset`
- [ ] Update component: import both utils; replace 4 signals with `allergenExpand` and `labelsExpand` instances
- [ ] Update component: replace `getRecipeAllergens` recursive body with thin wrapper; import `MAX_ALLERGEN_RECURSION` for `getRecipeProductIds`
- [ ] Update component: delete `toggleAllergenExpandAll`, `toggleAllergenPopover`, `closeAllergenView`, `toggleLabelsExpandAll`, `toggleLabelsPopover`, `closeLabelsView`, `isAllergenCellExpanded`, `isLabelsCellExpanded`; add 2 close wrappers; simplify `resetExpandedCells`
- [ ] Update HTML template: replace 6 method refs with `allergenExpand.*` / `labelsExpand.*` direct calls; replace 4 `isAllergenCellExpanded`/`isLabelsCellExpanded` refs
- [ ] Verify: `ng build` passes; component under ~600 LOC

# Constraints
- `CellExpandState` is a plain class — NOT an injectable service
- `resolveRecipeAllergens` is a pure function — no Angular DI
- Single quotes in TS, no semicolons
- Do not touch `filteredRecipes_`, filter categories, ingredient search, row actions, or export code
- Keep `MAX_ALLERGEN_RECURSION = 5` — defined in `recipe-allergens.util.ts`, imported where needed
- `closeAllergenView` / `closeLabelsView` keep existing selectors (`.table-header .col-allergens` / `.table-header .col-labels`)

# Verification
- `ng build` succeeds with no errors
- `recipe-book-list.component.ts` is under ~600 LOC
- `recipe-allergens.util.ts` ~45 LOC, `cell-expand-state.util.ts` ~35 LOC
- Allergen column: header click expands all, cell click expands one, outside click closes
- Labels column: same pattern
- Allergen filters show correct values (recursive resolution intact)
- Navigation reset clears all expanded cells
