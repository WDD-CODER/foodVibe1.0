# Plan 444 — Mark unpriced products and show which prices make a total partial

Status: active
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 03.3. A product with no price counts as 0 ₪ everywhere, silently: a recipe with tomatoes (priced) and oil
(unpriced) shows a cost that looks final but is too low, and so does every dish, menu, shopping list and supplier
order that uses it. Today `getProductValidationStatus()` (`product-validation.util.ts`) lumps a missing price
together with a missing category or supplier into one "חסר פרטים" warning, so the chef cannot tell "my cost is
wrong" from "my data is untidy".

After plan 434 the quantity + cost engine already returns `EventPlan.partial` and `EventPlan.missing` (C-ENGINE) —
nothing shows them. This plan:
1. Adds a dedicated **"לא סגור סופית"** status for a product with no price > 0 anywhere (supplier price, global
   price, purchase-unit price), separate from "חסר פרטים", with its own inventory filter.
2. Adds one shared **"חלקי" badge + "חסרים מחירים" popover** (new component) and puts it on every total: menu
   (event), dish row, recipe/dish builder, shopping-list preview, supplier-order cards.
3. Lets the **owner type the missing price inside the popover**; the total and badge update at once, no
   navigation. Staff see "ממתין לתמחור של הבעלים". `product-form.component.ts` (growth-frozen) is not touched.
4. Makes recipe-level cost partial-aware in `RecipeCostService` (recursive through preps), for the builder and
   the dish rows.

## Goals & Success Criteria
**Primary:** no cost anywhere looks final while a price is missing, and the owner fixes the missing price from the
place they noticed it.

Done when:
- [x] [auto] `npx ng build` passes.
- [x] [auto] `npx ng test --watch=false --include='src/app/core/utils/product-validation.util.spec.ts' --include='src/app/core/utils/quick-price.util.spec.ts' --include='src/app/core/services/recipe-cost.service.spec.ts' --include='src/app/shared/partial-cost-badge/**/*.spec.ts' --include='src/app/pages/inventory/components/inventory-product-list/**/*.spec.ts'`
  passes, including the new specs (spec 03.3 acceptance as fixtures):
  - `isProductUnpriced`: no sources and no purchase options → `true`; a source with price 5 → `false`; sources
    all 0 but one purchase option with `priceOverride: 12` → `false`; deprecated `buy_price_global_: 3` → `false`.
  - `getProductValidationStatus`: a priced product with no category → `'incomplete'`; an unpriced product with
    category and supplier → `'valid'` (price no longer counts there); `getProductMissingFields` no longer returns
    `missing_price`.
  - `RecipeCostService.computeRecipeCostStatus`: recipe "סלט" = 1 kg tomato at 5 ₪/kg + 100 g unpriced oil
    "שמן" → `{ cost: 5, partial: true, missing: [{ kind: 'unpriced', productId: <oil>, name: 'שמן', recipeIds:
    [<salad>] }] }`; a dish using "סלט" as a prep → `partial: true` with the same oil entry, `recipeIds` holding the
    prep's id; a free-text row "קצת פטרוזיליה" → `kind: 'unlinked'`; a row pointing at a deleted product id →
    `kind: 'deleted'`; the same unpriced product in two preps of one dish → one entry with both recipe ids.
  - `withQuickPrice`: product with two supplier sources priced 0 → both get the new price; product with no
    sources → one source `{ supplierId: '', price }`; a source already priced > 0 is left unchanged.
  - Badge/popover: owner → price input + «שמור» per unpriced row; staff (`can('editMoney')` false) → text
    "ממתין לתמחור של הבעלים", no input; unlinked row text "לא מקושר"; deleted row "נמחק" with «פתח מתכון».
  - Inventory filter "לא סגור סופית" on a fixture of [unpriced+categorized, priced+no category] → only the
    unpriced one.
- [x] [auto] Engine and recipe-cost agree on "unpriced": a spec in `recipe-cost.service.spec.ts` runs the
  plan-433 engine (`computeEventPlan`) and `computeRecipeCostStatus` on the same fixture (including a product priced
  only by a purchase-option `priceOverride`) and asserts the same set of unpriced product ids — engine side taken
  from `plan.missing` entries with `kind: 'unpriced'`, never from `chooseSupplier`.
- [x] [auto] Net line count of `src/app/pages/menu-intelligence/menu-intelligence.page.ts` and
  `src/app/core/services/menu-export.service.ts` ≤ 0 for this plan: `git diff --numstat origin/mvp -- <file>`
  prints added ≤ deleted for each.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop, `/inventory`: create product "שמן בדיקה" with name + unit only → its row shows "לא סגור
  סופית". Tick the filter "לא סגור סופית" → only unpriced products remain; a priced product without a category is
  not in the list.
- [human] Recipe builder: a recipe with 1 ק"ג עגבנייה (5 ₪/ק"ג) and 100 גרם "שמן בדיקה" → the cost in the header
  shows "חלקי". Tap the badge → the popover lists "שמן בדיקה" with the recipe's name under it.
- [human] In that popover type 20 → «שמור»: the badge disappears and the cost rises by 2 ₪, still on the same
  screen.
- [human] Put a dish that uses that recipe (before pricing the oil) into a menu at `/menu-intelligence/<id>`: the
  dish row and the menu total both show "חלקי"; the shopping-list preview and the «הזמנות לספקים» card holding the
  oil show it too.
- [human] Phone width: the popover opens on tap, fits the screen and closes on tap outside.
- [human] Sign in as a staff member of the same business: the popover shows "ממתין לתמחור של הבעלים" and no price
  field.

## Execution Mode
- Parallel: no against 434, 435 and 437 (`menu-intelligence.page.ts`, `menu-export.service.ts` and the 435 supplier
  orders component); no against 432 and 420 (`inventory-product-list`); no against 428, 438 and 423 (approved map: the product-form trio — this plan does not write
  `product-form.component.ts`, but keep the map's rule); no against 441, 442, 443, 445, 446 (same page; sequential
  in lane wt-3).
- Concurrent plans: none required; check `node scripts/scope-check.mjs --overlap --plan=<this file>` against lane
  wt-1 at take time.
- Isolated DB: no — no data is reshaped. Inline price edits are normal product saves.

## Execution Notes
- Depends on: plan 434 merged (the page's `eventCost_` reads `EventPlanService.planFor(buildEventFromForm())`;
  `menu-dish-row` reads `EventPlanService.costFor`; the shopping-list preview is
  `getMenuShoppingListPreviewPayload` → `buildShoppingListTable` in `src/app/core/utils/shopping-list-table.util.ts`).
- Depends on: plan 443 merged (lane order; same page).
- Depends on: plan 428 merged (client `PermissionService.can('editMoney', …)` decides owner vs staff in the
  popover). Not in the approved map's list for 444 — added because the popover calls it; lane wt-1 reaches 428
  before wt-3 reaches 444.
- Soft dependency: plan 435 (supplier-order cards get the badge — `SupplierOrdersComponent` in
  `src/app/pages/menu-intelligence/components/supplier-orders/`, cards typed `SupplierOrderCard` from
  `src/app/core/utils/supplier-orders.util.ts`). 435 merges in lane wt-2 right after 434; if it is absent, skip the
  supplier-card half of P7 and log it as a decision in the run file.
- New page signal (consumed by 445, 446): this plan adds `protected readonly menuPlan_ = computed(() =>
  <EventPlanService field>.planFor(this.buildEventFromForm()))` — the whole `EventPlan` of the live form — and
  `eventCost_` becomes `computed(() => this.menuPlan_().eventFoodCost)`, so the footer, the badge and later the
  meter read one plan.
- Must not run at the same time as: 434, 435, 437 (Menu Intelligence page); 423, 428, 438 (product form trio);
  432, 420 (`inventory-product-list`); 441, 442, 443, 445, 446 (lane wt-3).
- Frozen-file budget: `menu-intelligence.page.ts` gains 3 lines (import, `imports: []` entry, `menuPlan_`); delete
  the unused `getServingTypeLabel()` (9 lines, no caller in the page template today) — verify no caller first. `menu-export.service.ts`: the one added property
  (`missing: plan.missing`) replaces or joins an existing line in the shopping-list payload literal; if that is
  impossible without growing the file, stop and escalate.
- Decision (Planner review): an unpriced product no longer triggers the amber "חסר פרטים" row badge in the recipe
  ingredients table — price moves to its own "לא סגור סופית" status and the header "חלקי" badge covers the cost;
  "חסר פרטים" keeps meaning missing category or supplier only (spec 03.3 separates the two).
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/product-validation.util.ts
src/app/core/utils/product-validation.util.spec.ts
src/app/core/utils/quick-price.util.ts
src/app/core/utils/quick-price.util.spec.ts
src/app/core/utils/export.util.ts
src/app/core/services/recipe-cost.service.ts
src/app/core/services/recipe-cost.service.spec.ts
src/app/core/services/menu-export.service.ts
src/app/core/services/export.service.spec.ts
src/app/shared/breadcrumbs.md
src/app/shared/partial-cost-badge/**
src/app/shared/export-preview/**
src/app/pages/inventory/components/inventory-product-list/**
src/app/pages/recipe-builder/components/recipe-header/**
src/app/pages/menu-intelligence/components/menu-dish-row/**
src/app/pages/menu-intelligence/components/supplier-orders/**
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.ts
public/assets/data/dictionary.json
```


## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — no schema, server, taxonomy or AI change. The inline price edit is an ordinary product
  `PUT` through `ProductDataService.updateProduct`; the server's permission checker (427) still decides who may
  change `sources[].price`. No `*-data.service.ts`, `permission.service.ts` or `generic.js` file is written.

## Step 0 — Reality Check

Runs when `scope-check.mjs --drift` reports drift (it will). Check by symbol, print `ok` or `conflict: <what>`:
- Plan 433/434: `EventPlan`, `MissingItem`, `computeEventPlan` in `src/app/core/engine/`. On the engine side "unpriced" is
  read only from `plan.missing` (`kind: 'unpriced'`) or a raw line's `lineCost === null` — never from `chooseSupplier`
  alone (it does not see the `purchaseOptions[].priceOverride` fallback that `computeEventPlan` applies, 433 Design
  step 4). No engine file is edited by this plan. `buy_price_global_` reaches the engine as
  a `supplierId: ''` source via `ProductDataService.normalizeProduct` (~L99). In `menu-intelligence.page.ts`: the
  injected `EventPlanService` field and `eventCost_` (434 W5); in `menu-export.service.ts`:
  `getMenuShoppingListPreviewPayload` and its `buildShoppingListTable` call (434 W2); in `menu-dish-row`: `costFor`
  (434 W6).
- Plan 435: `SupplierOrdersComponent` (`components/supplier-orders/`), `SupplierOrderCard` / `buildSupplierOrders`
  in `src/app/core/utils/supplier-orders.util.ts`, and the card's "חלקי" text (`partial_total` key).
- Plan 428: `PermissionService.can(action, ctx)`.
- Plan 438: whether the product form still writes `buy_price_global_` (kept as a fallback in `isProductUnpriced`).
- This repo: `getProductValidationStatus`, `getProductMissingFields`, `VALIDATION_FIELD_ICONS` in
  `product-validation.util.ts`; `showIncompleteOnly_`, `useListState('inventory', …)` in
  `inventory-product-list.component.ts`; `computeRecipeCost`, `computeIngredientCost`, `MAX_RECURSION_DEPTH` in
  `recipe-cost.service.ts`; `currentCost` input in `recipe-header.component.ts`; `ExportPayload` in
  `export.util.ts`; `getServingTypeLabel` in the page (frozen-budget offset).

## User Stories
- As a chef, I want products without a price marked "לא סגור סופית" so that I see at once which prices I still owe.
- As a chef, I want every cost that uses an unpriced product marked "חלקי" so that I never quote from a number that
  is too low.
- As a chef, I want to type the missing price right where I noticed it so that I fix the cost without leaving the
  menu.
- As a staff cook, I want to see that the owner still has to price an item so that I know the total is not final.

## Functional Requirements

### Must Have (P0)
- [ ] "לא סגור סופית" = no `sources[].price > 0`, no `purchaseOptions[].priceOverride > 0`, no deprecated
  `buy_price_global_ > 0`. Shown as its own label in the inventory list; its own filter chip; URL-kept.
- [ ] "חסר פרטים" (`incomplete`) = missing category or supplier only; it never makes a total partial.
- [ ] A total is partial when any of these takes part, recursively through preps: unpriced product, unlinked
  (free-text) ingredient, reference to a deleted product or prep. A partial total shows the computed number plus
  "חלקי", never "—".
- [ ] "חלקי" + popover on: menu total (footer), each dish row in the menu, recipe/dish builder header cost,
  shopping-list preview, each supplier-order card.
- [ ] Popover lists each missing item once (same product in several recipes → one row with all recipe names):
  unpriced → name + recipe names + owner price input; unlinked → "לא מקושר", click opens the recipe in the builder
  where the existing link flow lives; deleted → "נמחק", no edit, «פתח מתכון».
- [ ] Owner saves a price from the popover → product updated, totals and badge update at once, no navigation.
  Staff → "ממתין לתמחור של הבעלים".

### Should Have (P1)
- [ ] none.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- One shared standalone component `partial-cost-badge` (`src/app/shared/partial-cost-badge/`): input
  `missing: MissingItem[]` (renders nothing when empty), small amber chip "חלקי" with `alert-triangle`; click or
  Enter toggles the popover; hover opens it on desktop. The popover is part of the same component (one folder:
  badge + popover), positioned with logical properties, max width `min(22rem, calc(100vw - 2rem))`, closes on
  Escape and outside click (`clickOutside` directive). Reuse the shared popover look of
  `src/app/shared/change-popover/` if it fits; run the `cssLayer` skill first.
- Inline price row: number input (₪ per the product's base unit, label `quick_price_per_unit` with the unit name),
  «שמור». Money shown through `formatMoney` (C-ENGINE `rounding.ts`).
- Inventory: amber chip "לא סגור סופית" in the row's validation cell (beside the existing badges); filter chip
  next to `filter_incomplete`, icon `coins` (already registered).
- No new icons: `alert-triangle`, `coins` and `chevron-left` (for «פתח מתכון») are already registered.
- New `dictionary.json` keys (append to `general`):

| key | Hebrew |
|---|---|
| `product_unpriced` | לא סגור סופית |
| `filter_unpriced` | לא סגור סופית |
| `missing_prices_title` | חסרים מחירים |
| `missing_used_in` | בשימוש ב: |
| `quick_price_per_unit` | מחיר ל{{unit}} |
| `quick_price_save` | שמור מחיר |
| `quick_price_saved` | המחיר נשמר |
| `awaiting_owner_price` | ממתין לתמחור של הבעלים |
| `open_recipe` | פתח מתכון |

Reused, not added: `partial_total` "חלקי", `line_status_unlinked` "לא מקושר", `line_status_deleted` "נמחק" (plan 434).

## Atomic Sub-tasks
- [x] P1: Give an unpriced product its own status, separate from missing category or supplier — isProductUnpriced(product) (sources, purchaseOptions priceOverride, buy_price_global_); getProductValidationStatus and getProductMissingFields stop counting price + spec — src/app/core/utils/product-validation.util.ts, src/app/core/utils/product-validation.util.spec.ts
- [x] P2: Show "לא סגור סופית" in the inventory list and let the chef filter by it — label in the validation cell; showUnpricedOnly_ signal + chip + useListState urlParam unpriced (BooleanParam); filter in the products computed + spec — src/app/pages/inventory/components/inventory-product-list/**
- [x] P3: Make recipe costs report what is missing, through every prep — RecipeCostService.computeRecipeCostStatus(recipe) → { cost, partial, missing: MissingItem[] } and findMissing(ingredients, ownerRecipeId, depth) (unpriced via isProductUnpriced, unlinked = no referenceId, deleted = id not in productsById_/recipesById_; merges by productId or name; stops at MAX_RECURSION_DEPTH); computeRecipeCost unchanged; engine-agreement spec — src/app/core/services/recipe-cost.service.ts, src/app/core/services/recipe-cost.service.spec.ts
- [x] P4: Add one badge with a missing-prices popover that the owner can price from — PartialCostBadgeComponent (input missing; owner check PermissionService.can('editMoney', { type: 'products', doc }); save = ProductDataService.updateProduct(withQuickPrice(product, price)) then toast quick_price_saved; staff text awaiting_owner_price; unlinked/deleted rows navigate to /recipe-builder/<recipeId>); pure withQuickPrice(product, price) util + specs — src/app/shared/partial-cost-badge/**, src/app/core/utils/quick-price.util.ts, src/app/core/utils/quick-price.util.spec.ts
- [x] P5: Mark the recipe and dish builder cost as partial — recipe-header computes missing from form().getRawValue().ingredients via RecipeCostService.findMissing (re-read when currentCost or KitchenStateService.products_ change) and shows the badge next to the cost; the builder page itself is not edited — src/app/pages/recipe-builder/components/recipe-header/**
- [x] P6: Mark each dish in a menu and the menu total as partial — menu-dish-row shows the badge from computeRecipeCostStatus(its recipe).missing; page .ts adds menuPlan_ (eventCost_ reads it), the import, and deletes getServingTypeLabel (net ≤ 0); template puts the badge beside the total in .financial-footnote bound to menuPlan_().missing — src/app/pages/menu-intelligence/components/menu-dish-row/**, src/app/pages/menu-intelligence/menu-intelligence.page.html, src/app/pages/menu-intelligence/menu-intelligence.page.ts
- [x] P7: Mark the shopping list and each supplier order as partial — ExportPayload gains optional missing?: MissingItem[]; getMenuShoppingListPreviewPayload sets missing: plan.missing on the payload it builds from buildShoppingListTable (no net growth in menu-export.service.ts); export-preview renders the badge beside the summary when missing is non-empty; each SupplierOrderCard in SupplierOrdersComponent shows the badge with the plan.missing items whose productId is in card.lines (replaces 435's partial_total text) — src/app/core/utils/export.util.ts, src/app/core/services/menu-export.service.ts, src/app/shared/export-preview/**, src/app/pages/menu-intelligence/components/supplier-orders/**
- [x] P8: Add the Hebrew labels — keys from UI/UX Notes, appended — public/assets/data/dictionary.json
- [x] P9: Build, test, check both frozen-file budgets and the error log, then hand over the checks — ng build, the Done-when ng test command, git diff --numstat for both files, log-query; slot servers up; [human] cards — this plan file

## Technical Considerations
- Dependencies: `KitchenStateService` (`productsById_`, `recipesById_`, `products_`), `ProductDataService.updateProduct`,
  `PermissionService` (428), `EventPlan`/`MissingItem` types and `formatMoney` (433), the page's `eventCost_` (434,
  rebased here on the new `menuPlan_`), plan 435's `SupplierOrdersComponent` / `SupplierOrderCard`.
- New files needed: `quick-price.util.ts` (+spec), `src/app/shared/partial-cost-badge/` (component + spec).
- Model changes: `ExportPayload.missing?: MissingItem[]` (client-only interface).
- Backend / API: none. The price save is the existing `PUT /api/v1/data/products/:id`.
- Auth and validation: owner-only enforced by the server (427 strips/403s money fields for staff); the client
  shows the input only when `can('editMoney')`. Price input: number ≥ 0, ≤ 2 decimals; 0 or empty disables
  «שמור».
- Security surface: none new (one numeric input; product names rendered by interpolation).
- Data / migration: none. Existing products without any price start showing "לא סגור סופית" — intended.
- Behaviour change to note in the PR: the recipe ingredients table's amber "חסר פרטים" row badge no longer fires
  for a missing price alone (price moved to the new status; the header badge covers it). See the Planner decision
  in Execution Notes.
- Lazy loading: the badge is imported only by lazy routes (inventory, recipe builder, menu intelligence) — no
  initial-bundle growth (plan 419).
- Project checks: log-query Done-when; chef-side stories; dictionary keys listed; RTL logical CSS; no new icons;
  `[human]` checks on phone and desktop.

## Backend Impact
- Collections affected: `products` (written through the existing generic PUT from the popover).
- New collections: no.
- Server changes needed: no.

## Contracts (verbatim from the approved map)

**C-ENGINE (433; consumers 434, 435, 437, 441, 444, 445, 446)**
- Folder `src/app/core/engine/` (pure TS, no Angular DI in the core): `event-plan.types.ts`, `event-plan.engine.ts` (`computeEventPlan(input: EventPlanInput): EventPlan`), `rounding.ts`, `supplier-choice.ts` (`chooseSupplier(product): { supplierId: string | null, pricePerBaseUnit: number | null }`), plus `event-plan.service.ts` (Angular wrapper `EventPlanService.planFor(event)` building the input from KitchenState + registries).
- `EventPlanInput = { event: MenuEvent, portionsByItem: Map<string, number>, products: Product[], recipes: Recipe[] /* recipes + dishes */, units: UnitConversion }` — item key `${section._id}|${itemIndex}`.
- `EventPlan = { rawLines: RawLine[], prepLines: PrepLine[], dishCosts: DishCost[], eventFoodCost: number, partial: boolean, missing: MissingItem[], errors: EngineError[] }`.
  - `RawLine = { productId: string | null, name: string, unit: string /* base unit */, netQty: number, buyQty: number, purchase?: { unit: string, count: number }, supplierId: string | null, lineCost: number | null, dishIds: string[], status: 'ok' | 'unlinked' | 'deleted' | 'no_conversion' }`
  - `PrepLine = { prepId: string, name: string, qty: number, unit: string, dishId: string, station: string }`
  - `DishCost = { itemKey: string, recipeId: string, cost: number, partial: boolean }`
  - `MissingItem = { kind: 'unpriced' | 'unlinked' | 'deleted', productId?: string, name: string, recipeIds: string[] }`
  - `EngineError = { kind: 'cycle' | 'no_yield', name: string }`
- `rounding.ts`: `roundPortions(x)` (round to 6 decimals, then ceil — only for portion-unit items), `formatQty(qty, unit)` (kg/liter ≤ 2 decimals, g/ml integer, units ceil; >1000 g → kg, >1000 ml → liter), `formatMoney(n)` (₪, 2 decimals), `formatPct1(n)` (1 decimal), `formatPctInt(n)`.
- Until 440 merges, `portionsByItem` comes from `portionsFromDerived(event)` (reads stored `derivedPortions`).

**C-PERM (427; client mirror 428)**
- `server/utils/permissions.js`: `can(user, action, { type, doc?, patch? }) → { ok: true } | { ok: false, reason }` and `assertCan(req, res, action, ctx)` → sends 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }` (Hebrew "אין לך הרשאה לפעולה הזו").
- Actions: `create`, `edit`, `delete`, `editMoney`, `changeStage`, `addNote`, `markArrival`, `manageTeam`, `editSettings`, `editTaxonomy`.
- Rules: owner → all in own business. Staff → create all entity types; edit/delete only `doc.createdBy === user.userId`; `editMoney`, `manageTeam`, `editSettings`, `editTaxonomy` (eventType, menuType, station) never; `changeStage` only on events they created; `addNote`, `markArrival` on any event. A staff-created product is saved with money fields stripped.
- Money fields: `shared/schemas/money-fields.ts` exports `MONEY_FIELDS: Record<type, string[]>` — products: `sources[].price`, `purchaseOptions[].priceOverride`; menuEvents: `pricePerGuest`, `extraCosts`, `targetsOverride`, `deposit`, `closing.suppliers[].actualPaid`, `closing.actualExtraCosts`, `closing.actualRevenue`; businesses: `settings`, `baseline`. Later plans that add a money field append it here.
- Client: `src/app/core/services/permission.service.ts` `can(action, ctx): boolean` (computed from user signal); UI hides/locks by the same rules; server decides.
- Before 427 merges: every signed-in user counts as owner.

## Out of Scope
- Changes to `product-form.component.ts` (growth-frozen) — the full form keeps its own price fields.
- The pricing meter's "חלקי" marks on every meter number (plan 445 reads `EventPlan.partial`).
- The recipe-book list's cost column; stale-price alerts; choosing a supplier from the popover (price only).
- Any change to the engine (`src/app/core/engine/**`) — "unpriced" is read from `plan.missing` / `lineCost === null`.

## Critical Questions
None — spec 03.3 fixes the rules; owner/staff split comes from C-PERM.
