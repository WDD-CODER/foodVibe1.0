---
name: Recipe builder real-changes confirmation
overview: The confirmation modal appears because the guard uses `form.dirty`, which stays true once the user touches the form even if they revert all changes. Implementing value-based change detection (like the product form) so the modal only shows when the current form content actually differs from the initial state.
---

# Recipe builder: confirmation only when content actually changed

## Why it happens today

- [pending-changes.guard.ts](src/app/core/guards/pending-changes.guard.ts) already supports a **value-based** check: if the route component implements `hasRealChanges()`, it uses that; otherwise it falls back to **`form.dirty`**.
- The recipe builder does **not** implement `hasRealChanges`, so the guard uses `form.dirty`.
- Angular's `dirty` is set as soon as any control's value changes from its initial value and **is not cleared** when the user changes it back. So: open recipe → change a label → change it back → leave → modal still shows.
- The recipe builder also calls `this.recipeForm_.markAsDirty()` in several places, which can make the form dirty even when the net content is unchanged.

So the root cause is: **change detection is "touched/dirty" instead of "current value vs initial value".**

## Desired behavior

- **Content changed** (current form value ≠ value when the user entered the page) → show confirmation.
- **Content unchanged** (user reverted everything, or never changed anything) → do **not** show confirmation.

## Approach: mirror product form's "initial snapshot" pattern

We store an initial snapshot when the form is loaded (or reset for new recipe), and implement `hasRealChanges()` by comparing current normalized form value to that snapshot.

## Implementation (executed)

1. **Recipe builder page:** Added `initialRecipeSnapshot_`, `getRecipeSnapshotForComparison()` (normalized JSON: numbers coerced, labels sorted, arrays in order), `hasRealChanges()`; set initial snapshot at end of `ngOnInit()` when editable; removed `hasUnsavedEdits()`.
2. **Guard:** No change; already uses `hasRealChanges()` when present.
3. **markAsDirty removed** in recipe-builder.page.ts, recipe-header.component.ts, recipe-workflow.component.ts, recipe-ingredients-table.component.ts so value comparison is the single source of truth.

No guard or route changes. Modified files: recipe-builder.page.ts, recipe-header.component.ts, recipe-workflow.component.ts, recipe-ingredients-table.component.ts.
