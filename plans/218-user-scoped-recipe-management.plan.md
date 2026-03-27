---
name: User-scoped recipe management
overview: Any authenticated user can add recipes with ownership; users soft-hide their own; admins hard-delete any recipe.
isProject: false
---

# User-Scoped Recipe Management

## Goal
Implement ownership-aware recipe management: signed-in users create recipes with their `createdBy` id; they can hide their own recipes from their view (soft-delete); admins can permanently delete any recipe.

## Atomic Sub-tasks

- [ ] Task 1: `user.model.ts` + `user.service.ts` — add `role?: 'admin' | 'user'` to User interface; pass through `_toUser()`
- [ ] Task 2: `recipe.model.ts` — add `createdBy?: string` and `hiddenBy?: string[]`
- [ ] Task 3: `recipe-data.service.ts` + `dish-data.service.ts` — inject UserService via `inject()`; attach `createdBy` on `addRecipe` / `addDish`
- [ ] Task 4: `recipe-data.service.ts` + `dish-data.service.ts` — add `hideRecipe(id)` / `hideDish(id)` methods (append userId to `hiddenBy[]`, call `updateRecipe`)
- [ ] Task 5: `recipe-data.service.ts` + `dish-data.service.ts` — add `permanentlyDeleteRecipe(id)` / `permanentlyDeleteDish(id)` methods (storage.remove directly, bypass trash)
- [ ] Task 6: `kitchen-state.service.ts` — add `visibleRecipes_` computed signal; add `hideRecipe()` + `permanentlyDeleteRecipe()` orchestration methods routing by isDish
- [ ] Task 7: `recipe-book-list.component.ts` + `.html` — show Hide button for recipe owner; Delete (hard) button for admin only; consume `visibleRecipes_()`
- [ ] Task 8: Security Officer review

## Constraints
- Signals only — no BehaviorSubject, no subscribe() for state
- inject() for all DI — no constructor injection
- No `any` — type everything explicitly
- Do not rewrite add-recipe (recipe-builder) form UI
- Do not touch styles.scss or any .c-* engine classes
- `/recipe-builder` route already has `canActivate: [authGuard]` — no route change needed

## Done When
- Signed-in user submits a recipe and it saves with their `createdBy` id
- That user sees a Hide option on their own recipes; recipe disappears from their view but DB record remains
- Admin user sees a Delete option that permanently removes the recipe
- Non-authenticated user hitting `/recipe-builder` is redirected (already working)
