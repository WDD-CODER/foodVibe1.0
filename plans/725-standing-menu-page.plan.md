# Plan 725 — Standing menu page: the restaurant's dishes with price, net price and cost per portion

Status: draft
Depends-on: 724
Track: code
Snapshot: 33a6c572

## Problem Statement
Plan 724 stores a restaurant's standing menu (`menuDishes`) behind the `dish_analysis` module, but nobody can see or
fill it. Dish analysis (feasibility `docs/finance/dish-analysis-feasibility.md`, slice 2; research report "Restaurant
dish and month analytics", "Updated decisions" and "Slice order changes": the revised slice 2 absorbs old slice 10)
needs the owner's dish list first: every later number is per dish. Dandan's decisions of 2026-11-24 ("decisions: all
recommended") that this page carries out:

- dish 1 (keep): the standing menu is its own owner-only list; each dish has a course, a price with VAT and a cost source.
- dish 4 (changed): a dish is costed by its recipe, by a linked bought product, by a typed cost per portion, or counted
  in units only; a units-only or partial dish is labelled, never shown as a cost of 0.
- dish 6 (refined) and N-X1: the price is typed with VAT; the net price uses the business's one VAT rate and dealer
  type (plan 723).
- N-D1: every dish carries a course so later analysis classifies within each course; the course is prefilled from the
  linked recipe.
- dish 7 (keep): the page exists only with the `dish_analysis` module; staff never see prices or costs.

The portion factor (N-D3) belongs to sales-name aliases, not to the menu dish; this page has none.

Verified on `origin/main` 33a6c572:
- `RecipeCostService` (`src/app/core/services/recipe-cost.service.ts`): `computeRecipeCostStatus(recipe)` →
  `{ cost, partial, missing }` (`:67-70`), `getRecipeCostPerUnit(recipe)` = cost ÷ `yieldAmount` (`:139-143`), the
  per-portion cost the diagnosis uses (`diag-report.component.ts:63-64`); `getCostForIngredient(ing)` (`:45-48`) costs a
  product line in any of the product's units (`computeIngredientCost`, `:347-368`). `isProductUnpriced`
  (`src/app/core/utils/product-validation.util.ts:19`).
- `KitchenStateService.recipesById_` holds both dishes and preparations (`kitchen-state.service.ts:39-43`);
  `productsById_` (`:41`). `kitchenDataEnsureLoadedResolver` loads them before a route (`app.routes.ts`, the
  diagnosis workspace route).
- Courses: `MetadataRegistryService.courses_` (`src/app/core/services/metadata-registry.service.ts:49-51`).
- `moduleGuard(keys)` (`src/app/core/guards/module.guard.ts`); `PermissionService.isOwner_` (owner or consultant) and
  `isStaff_` (`permission.service.ts:50-55`). The header builds its links in `navLinks_`
  (`src/app/core/components/header/header.component.ts:90-97`) and lists the phone bottom bar by hand
  (`header.component.html:219-224`).
- Shared pieces: `app-list-shell` + `app-page-header`, `app-empty-state`, `app-search-combobox`, `app-custom-select`,
  `app-modal-shell`, `app-row-actions-menu`, `app-partial-cost-badge`, `appNumberBox`, `ConfirmModalService`,
  `BaseEntityDataService` (`docs/brain/component-families.md`). The report page shows an owner-only notice the same
  way this page will (`report.page.html:32`, `report_owner_only`).
- Plans 720 and 721 (saved, not built): popups are centred on every screen, no bottom sheets. This page's popup uses
  `app-modal-shell` without `[sheet]`.

## Goals & Success Criteria
**Primary:** with the module on, the owner (or an acting consultant) opens «תפריט המסעדה», adds a dish with a course,
a price with VAT and one of the four cost sources, and sees in one line its net price, cost per portion (or «חלקי» /
«ללא עלות») and what is left per dish.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0.
- [auto] `pnpm run test:ci` exits 0, including `src/app/core/services/menu-dish-data.service.spec.ts`,
  `src/app/core/services/menu-dish-cost.service.spec.ts`,
  `src/app/pages/restaurant-menu/restaurant-menu.page.spec.ts`,
  `src/app/pages/restaurant-menu/components/menu-dish-dialog/menu-dish-dialog.component.spec.ts` and the updated
  `src/app/core/components/header/header.component.spec.ts`.
- [auto] `src/app/core/services/menu-dish-cost.service.spec.ts`: a recipe dish with every product priced is `costed` with
  `getRecipeCostPerUnit`'s value; one unpriced ingredient makes it `partial` with the missing list; a deleted recipe
  or product is `missing` with no number; a product dish of 0.33 of a 1-litre bottle at 12 ₪ costs 3.96; a typed dish
  costs its typed number; a units-only dish has no cost; `leftPerDish` is net price − cost only for `costed`.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/725-standing-menu-page.plan.md` → `ARCH: ok`;
  `node scripts/scope-check.mjs --reuse --plan=plans/725-standing-menu-page.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] The header shows «תפריט המסעדה» only for a business with «ניתוח מנות» switched on, and never to a staff
  member; on the phone it is in the bottom bar too.
- [human] the list's page with no items · open the page · a message says the list is empty — here: «תפריט המסעדה» of a business with no dishes says «עוד אין מנות בתפריט» with «הוספת מנה».
- [human] Add a dish linked to a recipe: the course fills in from the recipe, the row shows the price, «נטו» (price ÷
  1.18), the cost per portion and «נשאר למנה».
- [human] A dish linked to a recipe that has an ingredient without a price shows the cost with the «חלקי» badge and
  «נשאר למנה» as «לא מלא»; a dish set to «כמות בלבד» shows «ללא עלות».
- [human] A dish linked to a bought product (for example a bottle of juice, amount 1 in «יחידה») and a dish with a typed
  cost each show the right cost; switching a dish's cost source and saving keeps only the new source.
- [human] the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed — here: a dish's row menu «הסר מהתפריט», then «ביטול»: the dish stays; again with «אישור»: it leaves the list, and «הצג מנות שהוסרו» shows it with «החזר לתפריט».
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page — here: with the server stopped, «תפריט המסעדה» shows «לא הצלחנו לטעון את התפריט» and «נסו שוב».
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line — here: «תפריט המסעדה» next to «מוצרים».
- [human] Signed in as staff and opening `/restaurant-menu` by hand shows «המסך זמין לבעל העסק בלבד» and no prices.

## Execution Mode
- Parallel: yes with 726 only after this plan merges (726 depends on it); no with any open plan that edits
  `src/app/core/components/header/**` (plan 727 adds its own header link: run one after the other and union the links).
- Concurrent plans: 722, 723, 728, 729 (no shared files).
- Isolated DB: no — writes only `menuDishes` (plan 724).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/restaurant-menu/**
src/app/pages/restaurant-menu/restaurant-menu.page.spec.ts
src/app/pages/restaurant-menu/components/menu-dish-dialog/menu-dish-dialog.component.spec.ts
src/app/core/models/menu-dish.model.ts
src/app/core/services/menu-dish-data.service.ts
src/app/core/services/menu-dish-data.service.spec.ts
src/app/core/services/menu-dish-cost.service.ts
src/app/core/services/menu-dish-cost.service.spec.ts
src/app/core/components/header/header.component.ts
src/app/core/components/header/header.component.html
src/app/core/components/header/header.component.spec.ts
src/app/app.config.ts
src/app/pages/breadcrumbs.md
src/app/core/services/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/components/breadcrumbs.md
docs/brain/component-families.md
docs/modules/modules-map.md
docs/workflow-kit/manifest.json
src/app/appRoot/app.component.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — every write goes through the generic API (`MenuDishDataService` → `/api/v1/data/menuDishes`),
  where plan 724 made the type owner-only with money fields `priceWithVat` and `typedCost`; staff reads carry base
  fields only. The browser only hides: the header link and the page need `isOwner_()` (owner or acting consultant)
  and `dish_analysis`; the server stays the gate (`MODULE_OF_TYPE`, `assertCan`). No permission rule changes.
- INV-5: preserves — the course is picked from the `course` taxonomy terms (`MetadataRegistryService.courses_`); no
  term is created on this page (the course picker offers no add; new courses stay in the metadata manager).
- INV-none: preserves — no AI call, no schema change, no server change.

## Reuse Check
- `RestaurantMenuPage` (`src/app/pages/restaurant-menu/`) — family: list-page — rung: 2 — why: `app-list-shell` with `app-page-header`, search and course chips; no new list base
- `MenuDishDialogComponent` (add / edit popup) — family: modal-shell — rung: 2 — why: `app-modal-shell` with `[hasChanges]`, centred, no sheet
- recipe and product pickers in the dialog — family: search-combobox — rung: 1 — why: `app-search-combobox` as the menu dish row uses it
- course and product-unit pickers — family: search-combobox — rung: 1 — why: `app-custom-select`
- `MenuDishDataService` — family: entity-data-service — rung: 2 — why: extends `BaseEntityDataService<MenuDish>` like the knowledge items service
- `MenuDishCostService` (`src/app/core/services/menu-dish-cost.service.ts`) — family: none — rung: 4 — why: no piece costs a standing-menu dish from its four sources; it only calls `RecipeCostService` and `netPriceOf`, so the sales page and the later analysis read one cost rule
- partial cost mark — family: cost-badge — rung: 1 — why: `app-partial-cost-badge` with the missing list
- `.rm-row__*` page-local cell spacing (restaurant-menu.page.scss) — family: engine-classes — rung: 3 — why: column widths only on top of `.c-list-row`; no `.c-*` class

## Defaults

- confirm-destructive-action — applies — how: «הסר מהתפריט» opens `ConfirmModalService.open` («להסיר את "<שם>" מהתפריט? אפשר להחזיר אותה מ"מנות שהוסרו".»); cancel changes nothing.
- empty-state-on-list — applies — how: `app-empty-state` «עוד אין מנות בתפריט» with «הוספת מנה»; a search or filter with no match shows «אין מנות שמתאימות לחיפוש».
- loading-and-error-states — applies — how: `app-loader` while the dishes and the kitchen load; a failed load shows «לא הצלחנו לטעון את התפריט» with «נסו שוב» (reload); a failed save keeps the popup open with the server's message.
- unsaved-changes-on-leave — applies — how: the popup passes `[hasChanges]` so Escape or a backdrop tap asks before discarding typed values; the page itself holds no draft.
- hints-in-tooltips — applies — how: each cost-source choice carries its explanation as `[attr.title]` + `aria-describedby` (e.g. «כמות בלבד»: «נספרת במכירות, בלי עלות ובלי סיווג»); no hint text on the popup.
- leave-and-return — exception — why: the page sends the user nowhere; a missing recipe or product is picked from what exists.
- app-list-container — applies — how: `app-list-shell` + `app-page-header`, each dish one `.c-list-row` on one line at every width (long names are cut with an ellipsis; columns move behind the column carousel on a phone as the product list does).
- one-breakpoint-set — applies — how: only the shared breakpoint names; no new `@media` width.
- unit-dropdown-add — exception — why: the product-unit picker lists only that product's own units (base and purchase units); an added unit could not be costed against the product.
- anchored-popup — exception — why: the add / edit popup is a centred `app-modal-shell` (plans 720–721), not a small floating box; the row menu is the existing `app-row-actions-menu`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef who owns a restaurant, I want my standing menu in one list with each dish's price, net price and cost per
  portion, so that I see at a glance what every dish leaves me.
- As a chef, I want to add bought items (drinks, a bought dessert) by linking the product or typing their cost, so that
  they count too and are not silently zero.
- As a chef, I want a dish whose cost is incomplete marked as such, so that I never trust a number that is too low.
- As a consultant acting in a client's kitchen, I want to fill and fix the menu the same way.

## Functional Requirements

### Must Have (P0)
- [ ] **Route** `restaurant-menu` (append to `app.routes.ts`): `canActivate: [authGuard, moduleGuard(['dish_analysis'])]`,
  `resolve: { kitchenLoaded: kitchenDataEnsureLoadedResolver }`.
- [ ] **Header link** `RESTAURANT_MENU_LINK = { path: '/restaurant-menu', key: 'restaurant_menu', icon: 'utensils' }`
  in `navLinks_` after the diagnosis link, shown when `modules.has('dish_analysis') && isOwner_()`; the same entry in
  the phone bottom bar.
- [ ] **Model and data** — `src/app/core/models/menu-dish.model.ts` re-exports `MenuDish` and `DISH_COST_SOURCES` from
  the schema; `MenuDishDataService extends BaseEntityDataService<MenuDish>` (`'menuDishes'`, deferred load,
  `allDishes_`, `addDish`, `updateDish`; no delete method — leaving the menu is `active: false`).
- [ ] **Cost rule** — `MenuDishCostService.costOf(dish)` → `{ state: 'costed' | 'partial' | 'missing' | 'units',
  costPerPortion: number | null, missing: MissingItem[] }`:
  `recipe` → the recipe from `recipesById_`; none → `missing`; else `getRecipeCostPerUnit(recipe)` with `partial` from
  `computeRecipeCostStatus(recipe)`; `product` → none → `missing`; else
  `getCostForIngredient({ _id: dish._id, type: 'product', referenceId, amount: productAmount, unit: productUnit })`,
  `partial` when `isProductUnpriced`; `typed` → `typedCost`, `costed`; `units` → `units`, no cost.
  `netPrice(dish)` = `netPriceOf(priceWithVat, vatRatePct, dealerType)` from `business_().settings` (plan 723 names,
  defaults 18 and `murshe`), `null` without a price; `leftPerDish(dish)` = net − cost, only for `costed`.
- [ ] **Page** (`RestaurantMenuPage`): staff (`isStaff_()`) see only the notice `restaurant_menu_owner_only`. Otherwise
  `app-list-shell`: title «תפריט המסעדה»; one line under the title with the VAT basis (`restaurant_menu_vat_note`
  «המחירים כוללים מע״מ {{rate}}%; נטו = המחיר בלי מע״מ», or for `patur` `restaurant_menu_vat_note_patur` «עוסק פטור:
  המחיר הוא הנטו»); search by name (`normalizeHebrew`); course chips «הכול», each course in use, «ללא קורס»; a toggle
  «הצג מנות שהוסרו». Each row: name, course, price with VAT, «נטו», cost per portion (with `app-partial-cost-badge` for
  `partial`, «ללא עלות» for `units`, «המתכון נמחק» / «המוצר נמחק» for `missing`), «נשאר למנה» («לא מלא» unless
  `costed`), and a row menu «עריכה», «הסר מהתפריט» (or «החזר לתפריט» on a removed dish). Rows sort by course order,
  then name. Money via `formatMoney` (`src/app/core/engine/rounding.ts`).
- [ ] **Popup** (`MenuDishDialogComponent`, add and edit): name (required; a second active dish with the same name is
  refused with `menu_dish_name_taken`, compared through `normalizeHebrew`; `duplicateEntityNameValidator` needs
  `nameHebrew`, which a menu dish does not have); course (`app-custom-select`, optional, no add option); price with VAT
  (number ≥ 0, optional, `appNumberBox`); cost source as four `.c-chip--toggle` radios — «לפי מתכון», «מוצר שנקנה»,
  «עלות שהוקלדה», «כמות בלבד»; per source: recipe search (dishes and preparations, `app-search-combobox`; picking
  fills an empty name and an empty course from the recipe), product search + amount + unit (the product's base unit
  and purchase units), cost per portion (number ≥ 0); note (≤ 200). A live line shows «נטו», cost and «נשאר למנה» as
  the row will. Saving sends only the chosen source's fields (plan 724 refuses the others). Server refusal → its
  message in the popup, the popup stays open.

### Should Have (P1)
- [ ] A food-cost percent next to «נשאר למנה» (cost ÷ net, one decimal) for `costed` dishes.
- [ ] `src/app/pages/breadcrumbs.md` gains `restaurant-menu/`; `core/services/breadcrumbs.md` gains the two services;
  `core/models/breadcrumbs.md` the model; `docs/modules/modules-map.md` the browser side of `dish_analysis`;
  `docs/brain/component-families.md` a `### menu-dish-cost` family for `MenuDishCostService`.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; logical properties only; one line per row at every width; numbers right-aligned in their columns.
- Icon `utensils` is registered (`src/app/app.config.ts:95`, `:206`); any other icon used is registered there.
- Dictionary keys (append-only, `general`): `restaurant_menu` ("תפריט המסעדה"), `restaurant_menu_owner_only`
  ("המסך זמין לבעל העסק בלבד"), `restaurant_menu_empty` ("עוד אין מנות בתפריט"), `restaurant_menu_no_match`
  ("אין מנות שמתאימות לחיפוש"), `restaurant_menu_load_failed` ("לא הצלחנו לטעון את התפריט"), `menu_dish_add`
  ("הוספת מנה"), `menu_dish_edit` ("עריכת מנה"), `menu_dish_name` ("שם המנה"), `menu_dish_course` ("קורס"),
  `menu_dish_no_course` ("ללא קורס"), `menu_dish_price_with_vat` ("מחיר כולל מע״מ"), `menu_dish_net_price` ("נטו"),
  `menu_dish_cost_per_portion` ("עלות למנה"), `menu_dish_left` ("נשאר למנה"), `menu_dish_left_unknown` ("לא מלא"),
  `menu_dish_no_cost` ("ללא עלות"), `menu_dish_recipe_gone` ("המתכון נמחק"), `menu_dish_product_gone` ("המוצר נמחק"),
  `menu_dish_source` ("מקור העלות"), `menu_dish_source_recipe` ("לפי מתכון"), `menu_dish_source_product`
  ("מוצר שנקנה"), `menu_dish_source_typed` ("עלות שהוקלדה"), `menu_dish_source_units` ("כמות בלבד"),
  `menu_dish_source_recipe_hint` ("העלות מחושבת מהמתכון לפי מחירי היום"), `menu_dish_source_product_hint`
  ("העלות היא מחיר המוצר לפי הכמות למנה"), `menu_dish_source_typed_hint` ("עלות למנה שאתם מקלידים"),
  `menu_dish_source_units_hint` ("נספרת במכירות, בלי עלות ובלי סיווג"), `menu_dish_pick_recipe` ("בחירת מתכון"),
  `menu_dish_pick_product` ("בחירת מוצר"), `menu_dish_product_amount` ("כמות למנה"), `menu_dish_product_unit`
  ("יחידה"), `menu_dish_typed_cost` ("עלות למנה (₪)"), `menu_dish_note` ("הערה"), `menu_dish_remove`
  ("הסר מהתפריט"), `menu_dish_remove_confirm` ("להסיר את \"{{name}}\" מהתפריט? אפשר להחזיר אותה מ\"מנות שהוסרו\"."),
  `menu_dish_restore` ("החזר לתפריט"), `menu_dish_show_removed` ("הצג מנות שהוסרו"), `menu_dish_saved` ("המנה נשמרה"),
  `menu_dish_name_taken` ("כבר יש מנה בשם הזה בתפריט"), `restaurant_menu_vat_note`
  ("המחירים כוללים מע״מ {{rate}}%; נטו = המחיר בלי מע״מ"), `restaurant_menu_vat_note_patur`
  ("עוסק פטור: המחיר הוא הנטו"), `restaurant_menu_module_off` ("ניתוח מנות כבוי לעסק הזה"), and the existing `all` ("הכל") for the first course chip.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Let the app load and save standing-menu dishes — model re-export and data service with a spec — src/app/core/models/menu-dish.model.ts, src/app/core/services/menu-dish-data.service.ts, src/app/core/services/menu-dish-data.service.spec.ts
- [ ] A2: Work out each dish's cost per portion and what it leaves, honestly marking partial and missing — MenuDishCostService over RecipeCostService and netPriceOf, with a spec of every source — src/app/core/services/menu-dish-cost.service.ts, src/app/core/services/menu-dish-cost.service.spec.ts
- [ ] A3: Add the menu page with search, course chips, removed dishes and the owner-only notice — route, page, rows, row menu, empty and error states — src/app/pages/restaurant-menu/**, src/app/app.routes.ts
- [ ] A4: Add the dish popup with the four cost sources and a live cost line — pickers, validation, server refusals — src/app/pages/restaurant-menu/components/menu-dish-dialog/**
- [ ] A5: Show the menu link only to the owner or consultant of a business with dish analysis — header pills, drawer and phone bottom bar, with a spec case — src/app/core/components/header/header.component.ts, src/app/core/components/header/header.component.html, src/app/core/components/header/header.component.spec.ts
- [ ] A6: Prove the page and the popup with unit tests — add, edit, switch source, remove with confirm, restore, staff notice — src/app/pages/restaurant-menu/restaurant-menu.page.spec.ts, src/app/pages/restaurant-menu/components/menu-dish-dialog/menu-dish-dialog.component.spec.ts
- [ ] A7: Add the Hebrew words — the keys of UI/UX Notes — public/assets/data/dictionary.json
- [ ] A8: Record the page in the maps and run every automatic check — paste outputs under Execution Notes — src/app/pages/breadcrumbs.md, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md, docs/brain/component-families.md, docs/modules/modules-map.md

## What happens when
- The business has no VAT setting stored yet: 18% and `murshe` (plan 723's defaults); the note under the title says so.
- A dish has no price: «נטו» and «נשאר למנה» show «—»; the cost still shows.
- A linked recipe has `yieldAmount` 0 or missing: `getRecipeCostPerUnit` uses 1 (existing rule); the row is costed as
  the whole recipe. The builder records it as `seen:` if a real recipe does this.
- The products or recipes fail to load: the resolver's existing error path; dishes still list with «—» costs.
- The module is switched off while the page is open: the next save answers 403 `MODULE_OFF` and the popup shows
  `restaurant_menu_module_off` («ניתוח מנות כבוי לעסק הזה»); the next navigation goes to `/dashboard`.
- Two people edit one dish: the last save wins (generic PUT), as every other entity today.

## Technical Considerations
- Dependencies: plan 724 (`menuDishes`, `netPriceOf`, `DISH_COST_SOURCES`, the module); plan 723 (`vatRatePct`,
  `dealerType` in business settings and `BUSINESS_SETTINGS_DEFAULTS`).
- Cost is live (dish 5): today's prices, the same as the recipe book. Freezing happens at the shared month close
  (N-X2, later plan).
- Patur: the net price is the price; the cost is used as stored. Grossing costs up with VAT for a patur dealer is the
  analysis function's job (plan 724, Out of Scope) — the note under the title is honest about the price only.
- New files: the page folder, the dialog, the two services, the model. Model changes: none (plan 724).
  Backend / API: none. Data / migration: none.
- Known collision: plan 727 adds a header link for the month page; whichever merges second unions `navLinks_` and
  the bottom bar. Branch `chore/restaurant-staging` may add a restaurant group to the tab chips; this plan adds no
  tab chip (plan 726 does).
- Security: no new endpoint; the server is the gate (plan 724).

## Out of Scope
- Monthly sales and returns (plan 726), the analysis function and screen, the sales file import and aliases, labour
  per dish, the new-dish calculator, copying the consultant diagnosis menu into the standing menu.
- A hard delete of a dish (leaving the menu is `active: false`).

## Critical Questions
- none — Dandan chose every recommended option on 2026-11-24; choices the decisions do not settle are `behaviour:`
  decisions below for him to grade.

## Execution Notes
- Planner 2026-11-24: written from the research report and Dandan's decisions.
- behaviour: the page lives at /restaurant-menu with its own header link (not under the events menu library), because a restaurant may have dish analysis without events — reverse: put it as a chip of the menus group
- behaviour: a partial cost shows its number with the badge but no «נשאר למנה» — the number is too low and must not be read as profit — reverse: show «נשאר למנה» with the badge too
- behaviour: leaving the menu is reversible (active: false), so no hard delete is offered — reverse: add a delete for dishes with no sales
