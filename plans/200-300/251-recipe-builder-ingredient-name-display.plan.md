---
name: Recipe Builder Ingredient Name Display Fix
overview: Restore ingredient names in the recipe builder index by resolving them reactively from KitchenStateService at render time, with a defensive patch in the form loader.
todos: []
isProject: false
---

# Goal
Restore ingredient names in the recipe builder index by resolving them reactively from KitchenStateService at render time, with a defensive patch in the form loader.

# Atomic Sub-tasks

- [ ] Task 1: `recipe-form.service.ts` — add `name_hebrew` to `lastGroup.patchValue(...)` in `patchFormFromRecipe`
- [ ] Task 2: `recipe-ingredients-table.component.ts` — add `protected getDisplayName(group: FormGroup): string` method in GETTERS section
- [ ] Task 3: `recipe-ingredients-table.component.html` — replace `{{ group.get('name_hebrew')?.value }}` with `{{ getDisplayName(group) }}`

# Rules

- Signals only; no `any` — use narrow casts like `as 'product' | 'recipe' | null`
- Don't change the Ingredient model or the save path (`buildRecipeFromForm`) — name is not persisted, it's derived
- Don't touch `ingredient-search.component.*` — the bug is display-side only
- Follow the component's existing CRDUL ordering; add `getDisplayName` in the GETTERS section near other `get*` helpers
- `KitchenStateService` is already injected with `inject()` — do not re-inject

# Done When

- Opening any existing recipe in the builder shows the Hebrew ingredient name in every row of the "אינדקס מרכיבים" table
- Clicking an ingredient row name still opens the search to edit, and selecting a new item updates the display
- Adding a brand new ingredient row still shows the search initially and switches to the name display after selection
- Saving the recipe and reopening it still shows all names correctly
