# Plan 466 — Let the partial-cost popover fix unlinked and deleted ingredients in place

Status: done
Track: code
Snapshot: b7d21fb021191304a54e3d351bb595e648d73dfa

## Problem Statement
The «חלקי» popover (`src/app/shared/partial-cost-badge/`) lists what keeps a cost from being final. Only rows of
kind `unpriced` get something useful (a price box). Rows of kind `unlinked` (a free-text ingredient with no product)
and `deleted` (a reference to a product or prep that no longer exists) both show a button «פתח מתכון» that goes to
the first recipe holding the item. The Human (validation card 46) found that the label reads as if the item were a
recipe, and when the user is already in that recipe the popover just closes. Wanted: act by what the item is —
`unlinked` → create or link a product right there and the totals recompute; `deleted` → a clear "deleted" message.
Handoff item E3 (`docs/mvp/review-handoff-2026-10-21.md`). Placement of the popover (A4) is plan 460; this plan only
consumes it.

Verified in code on `b7d21fb0`:
- `MissingItem.kind` is `'unpriced' | 'unlinked' | 'deleted'` (`src/app/core/engine/event-plan.types.ts:61-65`).
  An `unlinked` item has no `productId`; its `name` is the row's `nameSnapshot ?? nameHebrew`
  (`recipe-cost.service.ts` `collectMissing`, ~line 100-131); a `deleted` item has `productId` = the dead reference
  and `name` = the snapshot name or the raw id. `recipeIds` = the recipes whose OWN rows hold the item (preps are
  walked, each prep id is recorded).
- `partial-cost-badge.component.html:68-76`: every non-`unpriced` row gets the «פתח מתכון» button
  (`@else if (row.openRecipeId)`); `openRecipe` (`.ts:153-157`) closes the popover and navigates to
  `/recipe-builder/<id>`. The only use of the dictionary key `open_recipe` in code is that button.
- The quick-create product modal exists and is global: `QuickAddProductModalService.open({ prefillName }): Promise<Product | null>`
  (`src/app/core/services/quick-add-product-modal.service.ts`), rendered once in `appRoot/app.component.html:24`;
  it saves through `ProductDataService.addProduct` (name + base unit, plan 438 made price/category optional) and
  returns the saved product. `ingredient-search.component.ts:241-246` is the existing caller (add-option rule 4).
  Linking an existing product is a `custom-select` with `typeToFilter` and `allowTypedAdd` (see
  `standards-domain.md` add-option rule).
- Linking a row means writing `referenceId`, `type: 'product'`, `nameSnapshot` on the stored ingredient
  (`src/app/core/models/ingredient.model.ts`); the recipe builder form uses `item_type` and does the same patch in
  `recipe-ingredients-table.component.ts` `onUnlinkedBadgeClick` (~line 189-205). Saving a stored recipe or dish goes
  through `KitchenStateService.saveRecipe(recipe)` (picks `updateDish` / `updateRecipe`, line 297).
- Hosts of the badge (5): recipe-header (cost from the unsaved FORM: `recipe-header.component.ts:132-143`, re-read on
  `ingredients.valueChanges`), menu-dish-row (`computeRecipeCostStatus` on the stored recipe), pricing-meter
  (event plan), supplier-orders, export-preview. The last four read stored recipes and products through
  `KitchenStateService` signals, so a saved recipe update refreshes them with no host code (`recipes_` is derived
  from the data-service stores, `kitchen-state.service.ts:35`) — to be confirmed per host by the specs below. Only
  recipe-header reads a form, so a saved write cannot refresh it.
- Not verified (needs the running app): that the pricing meter and the cost shown in the recipe builder body recompute
  without a reload after a link; that clicking inside the global modal does not leave the popover half closed.

## Goals & Success Criteria
- Primary: from the «חלקי» popover the user can turn an unlinked ingredient into a linked product (new or existing)
  without leaving the page, the cost recomputes, and a deleted item is explained instead of sending the user to a
  recipe.
- Success:
  - [x] [auto] `npx ng test --watch=false --include='src/app/shared/partial-cost-badge/**/*.spec.ts' --include='src/app/core/services/unlinked-ingredient-link.service.spec.ts' --include='src/app/pages/recipe-builder/components/recipe-header/**/*.spec.ts'` passes, including new specs: an `unlinked` row shows the link control and no «פתח מתכון»; a `deleted` row shows the deleted note and no button; choosing an existing product calls the link service once with the row's name, the product and the row's recipe ids; the link service rewrites only the rows with no `referenceId` and the same name in each listed stored recipe (dish and recipe both), skips the recipe named by `formRecipeId`, and leaves other rows untouched; a staff member who cannot edit one of the recipes sees the no-permission note instead of the control; recipe-header patches the matching form rows when the badge emits `linked`.
  - [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [x] [auto] `npx ng build` passes.
  - [x] [auto] `grep -rn "open_recipe" src/app --include=*.html --include=*.ts` → no entries (the button and its router code are gone).
  - [ ] [human] Replay of the broken scenario: in the recipe builder open a recipe, add an ingredient by typing a name that is not a product and pressing Enter (it stays «לא מקושר»); click «חלקי» in the header → the row shows «לא מקושר» with a field «קשר או צור מוצר» and NO «פתח מתכון». Type the name and choose «הוסף "…"» → the quick-create window opens with that name filled in; save it with unit `kg` → the window closes, the row disappears from the popover (or, because the new product has no price yet, becomes a «חסר מחיר» row with a price box), the ingredient row in the recipe is now linked and the cost updates, and you are still on the same recipe page with your other unsaved edits.
  - [ ] [human] Replay (existing product): same start, but in the field pick an existing product from the list → the ingredient row becomes linked to it and the «חלקי» badge updates or disappears.
  - [ ] [human] Replay (deleted): in the product list delete a product used in a saved recipe, open that recipe, click «חלקי» → the row reads «נמחק» with the text «המוצר נמחק. הסירו אותו מהמתכון או בחרו מוצר אחר.» and no button.
  - [ ] [human] Same unlinked fix from a menu: open a menu in `/menu-intelligence/:id` whose dish has an unlinked ingredient, click «חלקי» on the dish row, link a product → the dish's «חלקי» badge and the pricing meter total update without reloading.

## Execution Mode
- Parallel: no — shares `partial-cost-badge` files with plan 460 (placement) and recipe-header with nothing else in this batch; run after 460 merges.
- Concurrent plans: 460 (writes the shared floating-panel helper and may edit `partial-cost-badge.component.scss/html` for placement); 461 and 467 do not touch these files.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only, never `main`. Executed per `docs/mvp/run-mode.md` — [human] items become validation cards in `docs/mvp/runs/466.md`.
- Depends on: 460 (A4: popover placement / off-screen). 466 does not change how the popover is positioned; if 460 has not merged, keep the current `.partial-popover` rules and rebase after.
- Drafted by the Planner from handoff E3 (2026-10-21). No open decision blocks this plan; the choices below are recommendations in Critical Questions.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/partial-cost-badge/**
src/app/core/services/unlinked-ingredient-link.service.ts
src/app/core/services/unlinked-ingredient-link.service.spec.ts
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.spec.ts
docs/mvp/runs/466.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — the new service writes recipes only through the existing `KitchenStateService.saveRecipe` (server-side permission checks of INV-1 stay the authority; the client only hides the control through `PermissionService.can`); no schema, taxonomy, server or AI file is touched, and one link is one recipe write per affected recipe via the existing API, not a new client cascade over documents of a kind (INV-3 concerns re-keying renames).

## Backend Impact
- Collections affected: recipes and dishes (ingredient rows get a product reference), products (quick-create), via the existing generic endpoints.
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. Find `MissingItem` in `event-plan.types.ts`; `collectMissing` in
`recipe-cost.service.ts`; `rows_`, `openRecipe` in `partial-cost-badge.component.ts`; `QuickAddProductModalService.open`;
`KitchenStateService.saveRecipe`; `missing_` and `ownerRecipeId_` in `recipe-header.component.ts`. Print `ok` or
`conflict: <what>` per symbol.

## User Stories
- As a chef who typed an ingredient name that is not in my inventory, I want to create or pick the product from the «חלקי» box so that the recipe cost becomes real without leaving the recipe.
- As a chef, I want a deleted ingredient to say it was deleted so that I know to replace it, instead of being sent to a recipe.
- As a chef looking at a menu, I want to fix a dish's unlinked ingredient from the menu so that the menu total updates right away.

## Functional Requirements

### Must Have (P0)
- [ ] `unlinked` row: a `custom-select` «קשר או צור מוצר» (type to filter, all inventory products, add-option «הוסף "<typed>"» that opens the quick-create window prefilled with the typed text, or with the row's name when nothing was typed). Choosing an existing product links it; creating one links the new product.
- [ ] Linking rewrites every ingredient row with no product and the same name, in every stored recipe or dish listed in the row's recipe ids, and in the open builder form when the host is the recipe builder; cost, badge and totals recompute.
- [ ] `deleted` row: tag «נמחק» plus the note «המוצר נמחק. הסירו אותו מהמתכון או בחרו מוצר אחר.» — no button, no navigation. The used-in line («בשימוש ב:») stays so the user knows where.
- [ ] «פתח מתכון» and its navigation code are removed; the `unlinked` row also gets a one-line note «רכיב ללא מוצר. קשרו אותו למוצר קיים או צרו חדש.» so the label never reads like a recipe.
- [ ] A staff member who cannot edit one of the affected recipes (not the creator) sees «אין הרשאה לשנות את המתכון הזה» instead of the control; the server stays the authority.
- [ ] The popover stays usable while the quick-create window is open (a click inside the window does not count as a click outside) and a failed save shows the existing translated error toast and logs `logging.error`.

### Nice to Have (P1)
- [ ] None.

## UI/UX Notes
- Reuse: `app-custom-select` (not a hand-built input + dropdown), the existing global quick-create modal, existing `.partial-*` classes and `c-btn-*` engines; no new `.c-*`.
- New dictionary keys (append to `public/assets/data/dictionary.json`): `partial_link_placeholder` «קשר או צור מוצר», `partial_unlinked_note` «רכיב ללא מוצר. קשרו אותו למוצר קיים או צרו חדש.», `partial_deleted_note` «המוצר נמחק. הסירו אותו מהמתכון או בחרו מוצר אחר.», `partial_linked` «המוצר קושר», `partial_link_no_permission` «אין הרשאה לשנות את המתכון הזה». Reuse `add_new_ingredient` («הוסף מרכיב חדש») as the add label key (exists, add-option rule 2).
- Add-option rule (`docs/agent/standards-domain.md`): typed text prefills the create window, cancel changes nothing, the new product is selected/linked on save, Enter / click / keyboard all work (inherited from `custom-select`).
- Popover placement and off-screen behaviour: plan 460. This plan adds rows content only.

## Atomic Sub-tasks
- [x] S1: Add one place that links a free-text ingredient to a product in stored recipes — `UnlinkedIngredientLinkService.link({ name, product, recipeIds, skipRecipeId })`: for each id found in `KitchenStateService.recipesById_()` (skip `skipRecipeId`), set `referenceId`, `type: 'product'`, `nameSnapshot` on every ingredient with no `referenceId` and `(nameSnapshot ?? nameHebrew).trim() === name`, then save through `KitchenStateService.saveRecipe`; skips recipes with no matching row; returns the count saved; plus `canLink(recipeIds, skipRecipeId)` using `PermissionService.can('edit', { type: 'recipes', doc })` — new service, spec with a dish, a recipe, a prep row and a skipped id — `src/app/core/services/unlinked-ingredient-link.service.ts`, `src/app/core/services/unlinked-ingredient-link.service.spec.ts`
- [x] S2: Give the popover a real action for ingredients with no product — in the row model add `isUnlinked`, `canLink` (from S1), `linkOptions` (all products, sorted by Hebrew name, as `{ value: id, label: name }`, plus the add sentinel `__add_product__`); inputs `formRecipeId` (default null) and output `linked` (`{ name, product }`); handler on `valueChange` links the chosen product, handler on `addNewChosen` opens `QuickAddProductModalService.open({ prefillName: typed || item.name })` and links the saved product; success toast `partial_linked`; errors logged and toasted — `src/app/shared/partial-cost-badge/partial-cost-badge.component.ts`
- [x] S3: Show the right content per kind and remove the recipe button — unlinked: tag, note `partial_unlinked_note`, the select (`app-custom-select`, `[typeToFilter]="true"`, `[allowTypedAdd]="true"`, `addNewValue="__add_product__"`, `addNewLabelKey="add_new_ingredient"`, placeholder `partial_link_placeholder`) or `partial_link_no_permission`; deleted: tag plus `partial_deleted_note`; delete the «פתח מתכון» button, `openRecipe`, `openRecipeId`, the `Router` injection and the now unused style `.partial-open` — `partial-cost-badge.component.html`, `partial-cost-badge.component.ts`, `partial-cost-badge.component.scss`
- [x] S4: Keep the popover open while the create window is in use — track `modalOpen_` around the `open()` promise and make `(clickOutside)` ignore clicks while it is true; the badge component may be destroyed when its list empties after linking, so all work after the await goes through the S1 service (not through component state) and the `linked` output is emitted before any state reset — `partial-cost-badge.component.ts`, `partial-cost-badge.component.html`
- [x] S5: Let the recipe builder show a link right away in its unsaved form — pass `[formRecipeId]="ownerRecipeId_()"` and `(linked)="onLinked($event)"` on the header badge; `onLinked` patches every `ingredients` group with no `referenceId` and `nameHebrew` trimmed equal to the name: `referenceId`, `item_type: 'product'`, `nameSnapshot`, then lets the existing `valueChanges` subscription refresh the list (no change to the frozen `recipe-builder.page.ts`) — `recipe-header.component.ts`, `recipe-header.component.html`
- [x] S6: Prove each kind and the host refresh with specs — badge: unlinked shows select and no «פתח מתכון», deleted shows the note, existing product chosen → service called with the row's ids, add-new → modal opened with the typed name, cancel → nothing linked, no-permission note; recipe-header: `linked` patches only matching form rows; update the existing badge spec that expects «פתח מתכון» and the Router provider — `partial-cost-badge.component.spec.ts`, `recipe-header.component.spec.ts`
- [x] S7: Add the five dictionary keys, build, run the specs and write the run file with the four validation cards — `public/assets/data/dictionary.json`, `docs/mvp/runs/466.md`

## Technical Considerations
- Dependencies: `QuickAddProductModalService`, `KitchenStateService.saveRecipe` / `productsById_` / `recipesById_`, `PermissionService`, `CustomSelectComponent`, `UserMsgService`, `LoggingService`.
- New files needed: `unlinked-ingredient-link.service.ts` and its spec.
- Model changes: none. Ingredient rows keep the same shape; only `referenceId`, `type`, `nameSnapshot` are set.
- Host refresh — answer to "do hosts need to refresh": menu-dish-row, pricing-meter, supplier-orders and export-preview derive from `KitchenStateService` signals, so the saved-recipe write refreshes them without host code (S6 asserts it for menu-dish-row). recipe-header reads a form, so it needs the `linked` output (S5). The recipe-builder page body (ingredient table, cost shown elsewhere) reads the same form, so the patch in S5 refreshes it; if the Worker finds a host that does not update, record it in the run file and add the smallest fix inside the scope, or escalate with `approved:`.
- Linked recipe being edited with unsaved changes: `skipRecipeId` prevents a stored write over the user's unsaved form; the form patch is saved by the user's normal Save.
- After linking, a new product has no price: it then appears in the same popover as an `unpriced` row with the price box (existing behaviour, plan 444) — expected, not a bug.
- Several recipes with the same unlinked name are all linked at once (one `saveRecipe` per affected recipe).
- Project checks: log-query [auto]; chef-side stories; Hebrew only through dictionary keys; no `any`; signals; `inject()`.

## Out of Scope
- Any export, print or preview of a recipe or a menu (export-preview, export toolbar, export services, Excel) — plan 471, not this run.
- Popover placement, off-screen clipping and shared positioning (plan 460, handoff A4).
- Removing a deleted ingredient from the recipe from inside the popover (the note tells the user to do it in the recipe; offered as a follow-up).
- Changes to how the engine produces `unlinked` / `deleted` items.
- Matching a typed name to existing products automatically (plan 463 owns the shared matcher).
- Changes to `quick-add-product-modal` itself.

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it.
1. Recommended: a `deleted` row only explains (no action). Alternative: add a «הסר מהמתכון» button that deletes the ingredient row. Not built here; say if you want it.
2. Recommended: linking by name updates every ingredient with that same unlinked name in all the listed recipes at once. Alternative: link only the one recipe the user is in. The batch version fixes the whole menu in one click.
3. Recommended: the link control is one search field with «הוסף "…"» (create) built in. Alternative: two buttons, «צור מוצר» and «קשר למוצר קיים». Tell me if you prefer two buttons.
4. Staff who did not create a recipe cannot link inside it (INV-1 unchanged): they see «אין הרשאה לשנות את המתכון הזה». Recommended as is; no invariant change is asked.
