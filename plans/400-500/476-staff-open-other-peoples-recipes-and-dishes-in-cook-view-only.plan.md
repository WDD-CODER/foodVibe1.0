# Plan 476 — Staff open other people's recipes and dishes in Cook View only

Status: done
Track: code
Snapshot: feb9f3da29fafafdacf2f3f12cfd22a5791d58f6

## Problem Statement
The Human decided (handoff `docs/mvp/review-handoff-2026-10-21.md` I1, decision D10, answered): a recipe or dish that
a staff member did **not** create opens for that staff member only in Cook View — never in the recipe builder. A
recipe the staff member created opens in the builder as today. Owners are unchanged.

Verified in code on `feb9f3da`:
- The server already refuses the edit: `server/utils/permissions.js:44-45` — staff `edit`/`delete` only when
  `doc.createdBy === user.userId`, else `NOT_CREATOR`; `server/routes/generic.js:111-114` (`authorizeEdit`) applies it
  to every PUT. Master clones are stamped with the owner as `createdBy` (`server/services/clone-master.js:40-44`), so
  they count as "not created by staff". This plan changes only where the browser sends staff.
- The client mirror exists: `PermissionService.can('edit', { type, doc })` (`permission.service.ts:39-55`) and
  `isStaff_` (`:37`). The recipe book already uses it for delete with the dish/recipe type split
  (`recipe-book-list.component.ts:127`).
- Ways into the builder for an existing item (`grep "recipe-builder"` in `src/app`):
  1. Recipe book row click / Enter / Space → `onEditRecipe` → `/recipe-builder/:id` for every signed-in user
     (`recipe-book-list.component.ts:515-517`, `:523-543`; template `recipe-book-list.component.html:192`, `:202-203`).
  2. The tab chips carry the open recipe's id across the «בונה מתכונים» and «מצב בישול» chips
     (`tab-chips.component.ts:125-133`), so from `/cook/:id` the builder chip points at `/recipe-builder/:id`.
  3. The partial-cost popover «פתח מתכון» (`partial-cost-badge.component.ts:153-157`) — **plan 466 removes this
     button and its navigation**; this plan does not touch it (the guard covers it until 466 merges).
  4. The duplicate-name link in the builder header (`recipe-header.component.html:56`) — covered by the guard.
  5. A typed or shared deep link `/recipe-builder/:id` (`app.routes.ts:122-133`, `canActivate: [authGuard]` only).
  - Not found: there is no recipe link in the menu editor (`grep` of `src/app/pages/menu-intelligence` and
    `menu-library` for `navigate`/`routerLink`: none goes to a recipe) and no global search component
    (`src/app/core/components/` has none). Cook View's own `onEdit()` (`cook-view.page.ts:1004-1007`) navigates to the
    builder but **nothing calls it** (dead code).
- Cook View has its own in-place edit mode (`enterEditMode`, `cook-view.page.ts:577-589`; buttons at
  `cook-view.page.html:9-20` (menu item) and `:238-249` (pill)) that saves through `KitchenStateService.saveRecipe`.
  For staff on someone else's recipe that save is refused by the server; the buttons must not show.
- The final report notes (`docs/mvp/final-report.md:163`) that the builder's leave-guard save and approve-stamp save
  are not gated for staff on another member's recipe; keeping staff out of the builder for those items closes that path.
- `canActivate` runs before the route's resolvers, so a guard must wait for recipes and dishes itself
  (`RecipeDataService.ensureLoaded()`, `DishDataService.ensureLoaded()`, as `kitchen-data-ensure-loaded.resolver.ts` does)
  and must match ids the way `recipe.resolver.ts:21-34` does (`_id`, then the user's own copy by `_masterId`).
- Growth-frozen: `cook-view.page.ts` (`docs/mvp/mvp-map.md:68`) — net lines ≤ 0.

## Goals & Success Criteria
- Primary: a staff member never lands in the recipe builder for a recipe or dish he did not create; he lands in Cook View, read-only.
- Success:
  - [x] [auto] `npx ng test --watch=false --include='src/app/core/guards/recipe-builder-access.guard.spec.ts' --include='src/app/core/services/permission.service.spec.ts' --include='src/app/pages/recipe-book/components/recipe-book-list/**/*.spec.ts' --include='src/app/core/components/tab-chips/**/*.spec.ts' --include='src/app/pages/cook-view/cook-view.page.spec.ts'` passes, including new specs: guard — staff + someone else's recipe → URL tree `/cook/<id>`; staff + someone else's dish → `/cook/<id>`; staff + own recipe → `true`; owner + any recipe → `true`; staff + unknown id → `true` (the resolver handles not-found); staff + a master id whose own copy is someone else's → `/cook/<copy id>`. Permission — `isReadOnlyRecipe` true only for signed-in staff on an item with another `createdBy`. Recipe book — staff row click on another's recipe navigates to `/cook/<id>`, on own recipe to `/recipe-builder/<id>`, owner unchanged. Tab chips — staff on `/cook/<other's id>` gets a builder chip path of `/recipe-builder`. Cook View — edit buttons hidden for staff on another's recipe.
  - [x] [auto] `git diff --numstat origin/mvp -- src/app/pages/cook-view/cook-view.page.ts` → added lines ≤ removed lines (growth-frozen file).
  - [x] [auto] `npx ng build` passes.
  - [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [human] Replay I1 as staff: sign in as a staff member, open `/recipe-book`, tap a recipe the owner made → Cook View of that recipe opens (address `/cook/…`), with no «עריכה» button and no «עריכת מתכון» in the ⋯ menu.
  - [ ] [human] Still as staff: change the address to `/recipe-builder/<the same id>` and press Enter → you land back in Cook View of that recipe. Tap the «בונה מתכונים» chip → an empty new-recipe builder opens, not the owner's recipe.
  - [ ] [human] Still as staff: create a recipe, save it, go back to `/recipe-book` and tap it → it opens in the recipe builder and you can change and save it.
  - [ ] [human] As the owner: tap any recipe (including one a staff member made) in `/recipe-book` → it opens in the recipe builder as before; Cook View still shows «עריכה».

## Execution Mode
- Parallel: no — writes `recipe-book-list.component.ts` (plan 474 edits `ngOnInit` in the same file) and `app.routes.ts` (hotspot; plan 464 also adds to it).
- Concurrent plans: 474 (same file, different method — keep both), 464 (`app.routes.ts`, a different route — append-only), 466 (removes the popover's builder link; no shared file). Run 476 after 474, or rebase onto it.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only (never `main`); executed per `docs/mvp/run-mode.md` — `[human]` items become validation cards in `docs/mvp/runs/476.md` (SETUP: an owner account with at least one recipe and one dish, and a staff member added in Settings → צוות).
- Depends on: plan 427 merged (C-PERM, `PermissionService`) — on `mvp`. Soft: plan 474 (same file).
- The server rule does not change; this is client routing plus a route guard as backstop.
- Growth-frozen `cook-view.page.ts`: the new read-only signal (about 3 lines incl. inject/import) is paid for by deleting the unused `onEdit()` (4 lines). Check `git diff --numstat` after editing it.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/permission.service.ts
src/app/core/services/permission.service.spec.ts
src/app/core/guards/recipe-builder-access.guard.ts
src/app/core/guards/recipe-builder-access.guard.spec.ts
src/app/app.routes.ts
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.spec.ts
src/app/core/components/tab-chips/tab-chips.component.ts
src/app/core/components/tab-chips/tab-chips.component.spec.ts
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/cook-view/cook-view.page.html
src/app/pages/cook-view/cook-view.page.spec.ts
docs/mvp/runs/476.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — staff still read every item of their business (other people's recipes and dishes through Cook View) and still edit only what they created; `PermissionService` gains one read-only helper built on the existing `can('edit', …)`, the server checker `server/utils/permissions.js` is untouched and stays the authority. No ADR or `Arch-approved:` needed.
- INV-3: preserves — no rename or cascade; no metadata-manager or `kitchen-state.service.ts` change.

## Backend Impact
- Collections affected: none.
- New collections: no
- Server changes needed: no — verified the server already refuses staff edits of others' items (`permissions.js:44-45`).

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. Find on `origin/mvp`: `can(` and `isStaff_` in
`permission.service.ts`; `onEditRecipe` / `onRowClick` in `recipe-book-list.component.ts`; the `openRecipeId` mapping
in `tab-chips.component.ts`; `onEdit()` and `enterEditMode` in `cook-view.page.ts`; the `recipe-builder/:id` route in
`app.routes.ts`. Print `ok` or `conflict: <what>` per symbol. If plan 466 has not merged, the popover's «פתח מתכון» still
navigates to the builder — the guard handles it; do not edit the popover.

## User Stories
- As a chef who owns the business, I want my cooks to open my recipes only to cook from them so that nobody changes my recipes by accident.
- As a cook, I want tapping a recipe to open the cooking view straight away so that I see the steps and amounts without builder screens I cannot save.
- As a cook, I want my own recipes to open in the builder so that I can keep improving them.

## Functional Requirements

### Must Have (P0)
- [ ] `PermissionService.isReadOnlyRecipe(recipe)` is true only for a signed-in staff member and an item whose `createdBy` is not his id (type `dishes` for `recipeType === 'dish'`, else `recipes`); false for owners, signed-out visitors and `null`.
- [ ] Recipe book: a row click, Enter or Space opens Cook View for a read-only item and the builder otherwise (owners and guests unchanged).
- [ ] New guard on `recipe-builder/:id` (after `authGuard`): for staff it waits for recipes and dishes, finds the item by `_id` or by `_masterId` (own copy), and redirects to `/cook/<item id>` when it is read-only; otherwise allows. Non-staff: allow at once, no waiting.
- [ ] Tab chips: on `/cook/:id` of a read-only item, the builder chip points to `/recipe-builder` (new recipe) instead of that item.
- [ ] Cook View: the two in-place edit buttons (⋯ menu «עריכת מתכון» and the «עריכה» pill) are hidden for a read-only item; the dead `onEdit()` is removed.
- [ ] `/recipe-builder` with no id (new recipe) stays open to staff.

### Nice to Have (P1)
- [ ] None.

## UI/UX Notes
- No new screens, styles or dictionary keys. Hidden buttons leave no gap (they are `@if`-removed).
- RTL and logical CSS unchanged (no SCSS edits).

## Atomic Sub-tasks
- [x] P1: Add one read-only check for recipes and dishes to the permission helper — `isReadOnlyRecipe(recipe: Recipe | null): boolean`, true only when `isStaff_()` and `!can('edit', { type: recipeType === 'dish' ? 'dishes' : 'recipes', doc: recipe })`; specs for owner, staff own, staff other's recipe, staff other's dish, signed out, null — `permission.service.ts`, `permission.service.spec.ts`
- [x] P2: Add the builder guard that sends staff to Cook View for others' items — `recipeBuilderAccessGuard: CanActivateFn`: not staff → `true`; else `await` `RecipeDataService.ensureLoaded()` and `DishDataService.ensureLoaded()`, find the item in `KitchenStateService.recipes_()` by `_id` or `_masterId`, read-only → `router.createUrlTree(['/cook', item._id])`, else `true`; `logging.info` event `recipeBuilder.staff_redirect` on redirect — `recipe-builder-access.guard.ts`
- [x] P3: Spec the guard — staff + other's recipe → `/cook/<id>`; staff + other's dish → `/cook/<id>`; staff + own → `true`; owner → `true` without calling `ensureLoaded`; staff + unknown id → `true`; staff + master id with someone else's own copy → `/cook/<copy id>` — `recipe-builder-access.guard.spec.ts`
- [x] P4: Put the guard on the builder edit route — `canActivate: [authGuard, recipeBuilderAccessGuard]` on `recipe-builder/:id` only (append the import; do not change other routes) — `src/app/app.routes.ts`
- [x] P5: Open others' recipes in Cook View from the recipe book — in `onEditRecipe` navigate to `/cook/:id` when `permission.isReadOnlyRecipe(recipe)`, else the builder as today (row click, Enter and Space all go through it); specs for staff other's, staff own, owner — `recipe-book-list.component.ts`, `recipe-book-list.component.spec.ts`
- [x] P6: Point the builder chip at a new recipe when the open item is read-only — in the chip mapping, look up `openRecipeId` in `KitchenStateService.recipesById_()` and keep the builder chip at `/recipe-builder` when `permission.isReadOnlyRecipe` is true (Cook View chip still carries the id); spec — `tab-chips.component.ts`, `tab-chips.component.spec.ts`
- [x] P7: Hide Cook View's edit buttons for read-only items and drop the unused builder link — `protected readonly readOnly_ = computed(() => this.permission.isReadOnlyRecipe(this.recipe_()))` with the `PermissionService` inject; wrap the ⋯-menu edit item and the «עריכה» pill in `@if (!readOnly_())`; delete `onEdit()`; spec: staff on other's recipe → no edit buttons, owner → buttons shown; net lines ≤ 0 — `cook-view.page.ts`, `cook-view.page.html`, `cook-view.page.spec.ts`
- [x] P8: Prove the frozen file did not grow, build, run the specs, write the run file with the validation cards (phone 375px and desktop) — `docs/mvp/runs/476.md`

## Technical Considerations
- Dependencies: `PermissionService.can` / `isStaff_`, `UserService.user_()`, `RecipeDataService.ensureLoaded`, `DishDataService.ensureLoaded`, `KitchenStateService.recipes_()` / `recipesById_()` (recipes + dishes combined, `kitchen-state.service.ts:35-39`), `Recipe.createdBy` (`recipe.model.ts:68`), `Recipe.recipeType` (`:47`).
- New files: `src/app/core/guards/recipe-builder-access.guard.ts` and its spec (functional guard, `inject()`, no class).
- The guard returns a `UrlTree` (not `router.navigate`) so the router replaces the navigation cleanly; the existing `pendingChangesGuard` on the builder is unaffected (it is `canDeactivate`).
- A recipe still loading (deep link after refresh) is handled by awaiting `ensureLoaded()` in the guard — only for staff, so owners see no delay.
- An item not found by the guard is allowed through; `recipeResolver` then shows its not-found message as today.
- Growth-frozen `cook-view.page.ts`: expected +3 (import, inject, signal) −4 (`onEdit` block) = −1.
- Security surface: UI only; the server stays the authority (`permissions.js`). Closes the UI path to the ungated builder leave-guard and approve-stamp saves for staff on others' recipes (`final-report.md:163`).
- Project checks: log-query [auto]; chef-side stories; no new dictionary keys; no server change.

## Out of Scope
- Any export, print or preview of a recipe or a menu — plan 471, not this run.
- The partial-cost popover's «פתח מתכון» button (plan 466 removes it).
- The trash page's version-history link (`version-history-panel.component.ts:76`, `/recipe-builder?view=history`, no id) — unchanged.
- Changing what staff may edit on the server, or the C-PERM contract.
- Staff seeing events by stage (handoff I2, separate decision D11).
- A "view only" note in Cook View (see Critical Questions).

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it.
1. **Tell the cook why there is no edit button?** Recommended: **no note in this plan** — Cook View is growth-frozen and the Human asked only for the routing; the edit buttons simply do not show. Alternative: one muted line «צפייה בלבד – רק מי שיצר את המתכון יכול לערוך» under the Cook View title (one new dictionary key, about 3 template lines).
2. **Builder chip for staff on someone else's recipe.** Recommended: opens a new empty recipe (`/recipe-builder`), since staff may create recipes. Alternative: hide the builder chip on that page.
