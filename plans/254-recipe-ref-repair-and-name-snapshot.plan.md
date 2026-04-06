---
name: Recipe Ref Repair and Name Snapshot Hardening
overview: Repair 118 broken demo_XXX referenceId links in recipes/dishes via name-match migration, then harden the Ingredient model with nameSnapshot so future ID changes never silently blank out names.
todos: []
isProject: false
---

# Goal
Repair broken referenceId links between recipe ingredients and products in Mongo (demo_XXX → user-owned IDs via name match), then add nameSnapshot to the Ingredient model so future product ID changes cannot silently blank out ingredient names.

# Atomic Sub-tasks

## Phase 2 — Repair
- [ ] Task 1: `git checkout -b fix/recipe-ref-repair` — create new branch
- [ ] Task 2: Write `scripts/backup-before-repair.mjs` — dumps PRODUCT_LIST, RECIPE_LIST, DISH_LIST to `backups/<timestamp>/`; adds `backups/` to .gitignore
- [ ] Task 3: Run backup script — confirm files exist and are non-empty
- [ ] Task 4: Write `scripts/repair-recipe-references.mjs` — dry-run by default; builds demo_XXX→name map from orphaned MongoDB docs; builds name→userId-owned-id map; rewrites referenceIds; Path C fallback for unmatched; `--write` flag for real run; `--backfill-snapshot` flag to also write nameSnapshot
- [ ] Task 5: Run dry-run — report exact counts to user, STOP for approval
- [ ] Task 6: After approval — run `--write`, confirm 118 fixed, 0 unlinked

## Phase 3 — Hardening
- [ ] Task 7: `src/app/core/models/ingredient.model.ts` — add `nameSnapshot?: string`
- [ ] Task 8: `recipe-form.service.ts` `createIngredientGroup` — add `nameSnapshot: [item?.name_hebrew ?? '']` to form group
- [ ] Task 9: `recipe-form.service.ts` `buildRecipeFromForm` — add `nameSnapshot: ing.nameSnapshot ?? ''` to persisted Ingredient object
- [ ] Task 10: `recipe-form.service.ts` `patchFormFromRecipe` — patch `nameSnapshot` alongside `name_hebrew` in lastGroup.patchValue
- [ ] Task 11: `recipe-ingredients-table.component.ts` `onItemSelected` — add `nameSnapshot: item.name_hebrew` to group.patchValue
- [ ] Task 12: `recipe-ingredients-table.component.ts` `getDisplayName` — update fallback: live name → nameSnapshot → '' (unlinked)
- [ ] Task 13: `recipe-ingredients-table.component.html` — add unlinked marker `<span>` using existing shared styles when getDisplayName returns ''
- [ ] Task 14: Run `--write --backfill-snapshot` to backfill nameSnapshot for all repaired ingredients

## Phase 4 — Scraper audit
- [ ] Task 15: `scripts/seed-from-dump.js` — add pre/post product count safety check; abort if count drops

# Rules
- Branch: fix/recipe-ref-repair
- Never delete a recipe/dish document
- Always backup before Phase 2 writes
- Dry-run first, real run only after user approval
- Signals only in frontend; inject() for DI; no any types
- nameSnapshot is optional in the model (backward compat)
- No new .c-* engine classes for unlinked marker — use existing shared styles

# Done When
- Opening any previously-broken recipe shows correct Hebrew ingredient names
- Ingredient model has nameSnapshot; builder writes it on every product selection
- getDisplayName falls back to nameSnapshot when referenceId lookup fails
- Manually nulling a referenceId in Compass does NOT blank the name in UI
- seed-from-dump.js has count safety check
