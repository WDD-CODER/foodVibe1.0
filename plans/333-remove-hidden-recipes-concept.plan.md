# Plan 333 — Remove the hidden-recipes concept

Status: active

Status:
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Recipes and dishes carry a hiddenBy[] field: when a user's id is in it, the recipe disappears for that user only. Dandan doesn't want this concept. Nothing in the UI triggers it: onHideRecipe() (recipe-book-list.component.ts:830) is never called. Deleting already goes to trash, so hiding adds nothing.

The code is still live in four places:

KitchenStateService.visibleRecipes_ filters the recipe book by it.
updateRecipe/updateDish carry it forward on every save.
hideRecipe/hideDish exist.
The model and schema define it.

Any record that was hidden in the past is invisible but still counts in the duplicate-name check, which confuses users.

## Goals & Success Criteria
Primary: no client code reads, writes or filters by hiddenBy.
Success: rg -n "hiddenBy|hideRecipe|hideDish|visibleRecipes_" src/app returns nothing. The recipe book shows every recipe and dish in the user's store.

## Execution Mode
Parallel: yes
Concurrent plans: none sharing src/app/core/services/kitchen-state.service.ts. Run after the recipe-edit duplicate-name plan ([[plans/332-recipe-edit-blocked-duplicate-name.plan.md]]), which also touches that file.
Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
docs/session-state-<branch>.md, .claude/sessions/**, .worktree-*, and the append-only
hotspots (src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/kitchen-state.service.ts
src/app/core/services/kitchen-state.service.spec.ts
src/app/core/services/recipe-data.service.ts
src/app/core/services/recipe-data.service.spec.ts
src/app/core/services/dish-data.service.ts
src/app/core/services/dish-data.service.spec.ts
src/app/core/models/recipe.model.ts
src/app/pages/recipe-book/components/recipe-book-list/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for approved: <path>; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when scope-check.mjs --drift reports REALITY: drift. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories
As a chef, I want every recipe I own to show in my recipe book, with no invisible records blocking names.

## Functional Requirements
### Must Have (P0)
- [x] Delete hideRecipe() (recipe-data.service.ts:174), hideDish() (dish-data.service.ts:159), KitchenStateService.hideRecipe() (kitchen-state.service.ts:290), and the uncalled onHideRecipe() (recipe-book-list.component.ts:830).
- [x] Remove the hiddenBy: existing?.hiddenBy ?? … carry-forward in updateRecipe (recipe-data.service.ts:157) and updateDish (dish-data.service.ts:147).
- [x] Remove visibleRecipes_ (kitchen-state.service.ts:40-44). Switch its 4 consumers in recipe-book-list.component.ts (L304, L378, L506) and .html:11 to recipes_(), and update the spec mock (recipe-book-list.component.spec.ts:44).
- [x] Mark hiddenBy in recipe.model.ts:70 as /** @deprecated legacy data only — never read or written */. Do not delete it: the strict schema and stored docs still carry it.

### Should Have (P1)
- [x] When an update saves a doc that has hiddenBy, strip the field (const { hiddenBy: _h, ...rest } = recipe), so legacy values fade out naturally.

### Nice to Have (P2)
- [ ] None.

## UI/UX Notes
No visible UI change, except that previously hidden records reappear in the recipe book. That's intended: Dandan can delete them properly.
No dictionary changes.

## Atomic Sub-tasks
- [x] A1: Remove the hide methods from the three services and the uncalled onHideRecipe.
- [x] A2: Replace visibleRecipes_ with recipes_ in recipe-book-list (ts, html, spec), then delete visibleRecipes_.
- [x] A3: Remove the hiddenBy carry-forward in both update methods; strip the field on save (P1).
- [x] A4: Mark the model field @deprecated. Run the grep in Success Criteria.
- [x] A5: Build and run the targeted specs. Update the session-state file.

## Technical Considerations
Dependencies: RecipeDataService, DishDataService, KitchenStateService, RecipeBookListComponent.
New files: none.
Model changes: the field is deprecated, not removed. shared/schemas/entities/recipe.schema.ts:46 (hiddenBy optional) and shared/schemas/field-map.v1-to-v2.ts:171 stay as they are: the schema is strict, so removing the field would make stored docs fail validation, and removing the field-map entry would break migration 0001.
The server never reads hiddenBy (verified by grep), so no server change is needed.

## Out of Scope
Changing the schema, the field map, or a DB migration to strip hiddenBy from stored docs. If wanted later, that's a separate plan with an isolated DB.
Any trash/delete behavior.

## Critical Questions
Previously hidden recipes will reappear. Is that OK?
a) Yes, I'll delete the ones I don't want (default)
b) No, move them to trash during this plan (needs server/migration scope, so a new plan)

## Success Criteria
- [auto] rg -n "hiddenBy|hideRecipe|hideDish|visibleRecipes_" src/app → only the @deprecated line in recipe.model.ts.
- [auto] npx ng test --watch=false --include=src/app/pages/recipe-book/**/*.spec.ts --include=src/app/core/services/*.spec.ts → 0 failures.
- [auto] npm run build → exit 0.
- [human] The recipe book shows all recipes and dishes. Delete a recipe → it goes to trash as before → restore it from trash → it's back.
