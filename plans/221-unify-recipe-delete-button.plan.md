---
name: Unify recipe delete button
overview: Replace the hide + permanent-delete two-button pattern with a single trash-2 button — non-admin hides, admin permanently deletes.
todos: []
isProject: false
---

# Goal — Unify recipe delete button

Replace the separate eye-off (hide) and trash-2 (permanent delete) buttons in recipe-book-list with a single unified trash-2 button. Non-admin users call `hideRecipe`; admin users call `permanentlyDeleteRecipe`. Bulk delete follows the same role-based routing.

# Atomic Sub-tasks

- [ ] `recipe-book-list.component.ts` — add `removingId_` signal; remove `hidingId_` and `permanentDeletingId_`
- [ ] `recipe-book-list.component.ts` — mark `onHideRecipe` and `onPermanentlyDeleteRecipe` private; update both to use `removingId_`
- [ ] `recipe-book-list.component.ts` — add `onRemoveRecipe(recipe)` unified public method with requireAuth gate + role-based confirm + routing
- [ ] `recipe-book-list.component.ts` — update `onBulkDeleteSelected` to call `hideRecipe` (non-admin) or `permanentlyDeleteRecipe` (admin) per recipe
- [ ] `recipe-book-list.component.html` — replace two-button block with single unified trash-2 button block guarded by `@if (isLoggedIn())`

# Constraints

- Do NOT touch `kitchen-state.service.ts`, `recipe-data.service.ts`, or `dish-data.service.ts`
- Do NOT add new dictionary keys — reuse `'delete'` for aria-label
- Keep `requireAuthService.requireAuth()` gate in the unified method
- Cook button stays as-is
- No `danger` class on the unified button

# Done when

- Signed-in non-admin sees one trash icon per row — click hides recipe (disappears from list, data stays)
- Admin sees same icon — click permanently deletes from storage
- No eye-off icon visible in recipe-book-list actions
- Bulk delete follows the same role-based routing
- `ng build` passes
