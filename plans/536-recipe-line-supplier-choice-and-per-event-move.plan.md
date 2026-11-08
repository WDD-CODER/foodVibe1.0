# Plan 536 — Each recipe line keeps its own supplier, and an event can move an item to a cheaper supplier

Status: draft
Track: code
Depends-on: none
Snapshot: 1e6f0f9ca6c8c910809b2653a39d43c45e7ae544
Supersedes: 510 (built on `feat/510-let-the-chef-pick` at `f29d3472`, failed the Human's hand test, reverted, never on main)

## Problem Statement
Plan 510 let the owner pick a product's supplier from the recipe builder, but stored the choice on the **product**
(`preferredSupplierId`). The Human failed it in hand testing (2026-11-08):
1. The choice must belong to each **recipe line**: two recipes using onion may buy it from different suppliers.
2. The «נבחר» mark on the product form's supplier price rows must not exist.
3. Event supplier orders only showed a hint; the chef must be able to **move** an item to the cheaper supplier for
   that one event, and undo it, with the hint still visible.
4. The truck popover opened off screen (it is `position: absolute` under the icon inside the scrolling table,
   `supplier-picker.component.scss` on `f29d3472`).
5. «הזול ביותר (אוטומטי)» did not work with 3+ priced suppliers. Likely cause, found while drafting: 510 cleared the
   choice by leaving `preferredSupplierId` out of the product PUT, but `PUT /api/v1/data/:type/:id` merges
   `{ ...current, ...updatable }` and `$set`s it (`server/routes/generic.js:633`, `:672-677`), so a left-out key is
   never removed — "automatic" kept the old pick. On this plan the choice lives inside `ingredients[]`, which the
   recipe save sends whole, so leaving `supplierId` off a line really clears it. The specs still cover 3, 4 and 5
   suppliers.
6. The choice did not survive sign-out/sign-in. It must be saved on the server: on the recipe (the line) and, for a
   move, on the event.
7. Kept from 510: staff see the current supplier but cannot change it.

Today on main (`1e6f0f9c`): `chooseSupplier` (`src/app/core/engine/supplier-choice.ts:12-26`) always picks the
cheapest priced supplier; recipe lines have no supplier (`shared/schemas/entities/common.schema.ts:3-12`,
`src/app/core/models/ingredient.model.ts`); the event engine keys raw lines by product only
(`src/app/core/engine/event-plan.engine.ts` contribution `key: product._id`), so one product is one order line.

## Goals & Success Criteria
**Primary:** in the recipe builder the owner picks, per ingredient line, which supplier that line is bought from
(default automatic = cheapest); the choice is saved with the recipe and costs that line; in an event's supplier
orders the owner can move an item to a cheaper supplier for that event only and move it back.

Test data for the `[human]` cards (create it first, as the owner, on `http://localhost:4200`): suppliers «דוד»,
«מכולת», «שוק»; product «בצל» (base unit kg) with prices דוד ₪4, מכולת ₪5, שוק ₪6; recipe «מרק בצל» with 2 kg בצל;
recipe «סלט» with 1 kg בצל; a saved event «בדיקת ספקים» with both dishes.

- [human] Recipe builder, «מרק בצל», בצל line: click the truck icon. The list opens fully on screen at 1280px and at
  390px wide (phone) and shows «הזול ביותר (אוטומטי)» checked, then «דוד ₪4» tagged «הזול ביותר», «מכולת ₪5», «שוק ₪6».
- [human] Pick «שוק», save the recipe: the line cost becomes ₪12. Open «סלט»: its בצל line still costs ₪4 (automatic).
- [human] Sign out, sign in, open «מרק בצל»: the בצל line is still on «שוק» (₪12).
- [human] In «מרק בצל» pick «הזול ביותר (אוטומטי)», save, reopen: the line is back on «דוד», ₪8. Repeat once with a
  fourth supplier «ירקן» ₪3 added to בצל: automatic now picks «ירקן».
- [human] Open the truck list and press Escape: the list closes, nothing changes, focus is back on the truck icon,
  and the recipe page did not close or go back.
- [human] In «מרק בצל» pick another supplier on the בצל line and, without saving, click another menu item (e.g.
  «מתכונים»): the «save or leave» question pops up. «הישאר» keeps the pick on screen; leaving without saving and
  reopening shows the old supplier.
- [human] Product «בצל» edit form: no price row shows «נבחר» or any chosen mark.
- [human] Set «מרק בצל» back to «שוק» and save. Event «בדיקת ספקים» → «הזמנות לספקים»: the שוק card has בצל with
  «זול יותר אצל דוד: ₪4 (חיסכון ₪N)» and a «העבר לדוד» button. Click it: בצל moves to the דוד card with
  «הועבר משוק לאירוע הזה» and «החזר לשוק»; the recipe «מרק בצל» itself still shows «שוק».
- [human] Close and reopen the supplier orders, then sign out and in: the move is still there. Click «החזר לשוק»: בצל
  is back on the שוק card with the hint and the «העבר לדוד» button again.
- [human] Signed in as staff: the truck icon shows the current supplier in its tooltip, the list opens but no row can
  be picked; in supplier orders the hint shows but there is no move or undo button.
- [auto] `npx ng build` passes.
- [auto] `pnpm run test:ci` passes, including the new specs named in A3–A9.
- [auto] `pnpm run test:server` passes, including the new cases in `server/test/permissions.test.js`,
  `server/test/push-to-master.test.js` and `server/test/supplier-choice-schema.test.js`.
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (read the dates: `--since=plan-start`
  may list older history, follow-up D8 of run-513-516).

## Execution Mode
- Parallel: no — shares `shared/schemas/entities/menu-event.schema.ts` and `src/app/core/models/menu-event.model.ts`
  with plan 518, and `server/utils/permissions.js` / `server/test/permissions.test.js` with plan 519. Run before or
  after them, not alongside.
- Concurrent plans: none.
- Isolated DB: no — two new optional fields; no stored document changes.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/recipe-builder.page.spec.ts
shared/schemas/entities/common.schema.ts
shared/schemas/entities/menu-event.schema.ts
shared/schemas/money-fields.ts
server/utils/permissions.js
server/routes/generic.js
server/test/permissions.test.js
server/test/push-to-master.test.js
server/test/supplier-choice-schema.test.js
src/app/core/models/ingredient.model.ts
src/app/core/models/menu-event.model.ts
src/app/core/engine/supplier-choice.ts
src/app/core/engine/supplier-choice.spec.ts
src/app/core/engine/event-plan.engine.ts
src/app/core/engine/event-plan.engine.spec.ts
src/app/core/engine/event-plan.types.ts
src/app/core/engine/event-plan.service.ts
src/app/core/engine/event-plan.service.spec.ts
src/app/core/utils/product-source.util.ts
src/app/core/utils/product-source.util.spec.ts
src/app/core/utils/supplier-orders.util.ts
src/app/core/utils/supplier-orders.util.spec.ts
src/app/core/services/recipe-cost.service.ts
src/app/core/services/recipe-cost.service.spec.ts
src/app/shared/supplier-picker/**
src/app/shared/supplier-picker/supplier-picker.component.spec.ts
src/app/shared/breadcrumbs.md
src/app/pages/recipe-builder/services/recipe-form.service.ts
src/app/pages/recipe-builder/services/recipe-form.service.spec.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/**
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.spec.ts
src/app/pages/menu-intelligence/components/supplier-orders/**
src/app/pages/menu-intelligence/components/supplier-orders/supplier-orders.component.spec.ts
docs/brain/component-families.md
```

## Read Scope

Entire repo. The 510 branch is read-only reference: `git diff origin/main...f29d3472`.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — every write still goes through `authorizeEdit` → `moneyFieldsChanged` → `assertCan('editMoney')`
  in `server/utils/permissions.js`. The line's `ingredients[].supplierId` (recipes, dishes) and the event's
  `supplierMoves` join `MONEY_FIELDS`, so staff can never change them and a staff-created recipe or event is saved
  without them. `ROW_KEY_FIELDS` gains `ingredients: '_id'` so a supplier is compared with the same line's supplier
  (reordering lines is not a money change). No new action, role or route.
- INV-2: preserves — the choice is a business's own edit of its own recipe/event (`_userModified` stamps it, so master
  sync never overwrites it). Push-to-master strips `supplierId` from every pushed line (`pushDocToMasterRecursive`,
  `server/routes/generic.js`), because a line's supplier id belongs to one business and must not reach the shared
  catalog or other kitchens. All queries stay on `business-scope.js`; `server/services/**` is not edited.
- INV-3: preserves — a recipe save and a move are one document write each; nothing loops writes per document. No
  rename re-keys a supplier id (supplier ids are not renamed; a deleted supplier is handled by the fallback below).
- INV-4: preserves — both new fields are defined once in `shared/schemas` (`ingredientSchema.supplierId`,
  `menuEventSchema.supplierMoves`) and the server validates them on every write through the existing schema check;
  the client models follow and `src/app/core/models/v2/conformance.ts` keeps compiling.
- INV-5: preserves — no taxonomy change.
- INV-6: preserves — no AI call.

## Reuse Check
- Price rule with a line's chosen supplier — family: helpers — rung: 3 — why: extend `chooseSupplier` in `src/app/core/engine/supplier-choice.ts` with an optional chosen supplier id; no second rule
- Cheaper-elsewhere hint and card saving — family: event-plan — rung: 3 — why: pure helpers next to `buildSupplierOrders` in `src/app/core/utils/supplier-orders.util.ts` (ported from 510)
- Per-event supplier move in the plan — family: event-plan — rung: 3 — why: `computeEventPlan` applies `event.supplierMoves`; no copy of the engine
- Supplier picker popover (truck button + list) — family: none — rung: 4 — why: no shared "pick one of a product's suppliers" popover exists; built in `src/app/shared/supplier-picker/` (not page-local as 510 did) with a new registry entry
- Popover placement inside the viewport — family: helpers — rung: 1 — why: `placeInViewport` from `src/app/core/utils/viewport-placement.util.ts`, as `partial-cost-badge` uses it
- Picker rows tag «הזול ביותר» — family: chip — rung: 2 — why: `.c-chip c-chip--tag c-chip--sm`
- Move / undo buttons on an order line — family: chip — rung: 2 — why: `.c-chip c-chip--tap` buttons, like plan 515's reveal control
- Staff read-only gate — family: edit-gate — rung: 1 — why: `PermissionService.can('editMoney', …)`
- Saving a move — family: entity-data-service — rung: 1 — why: `MenuEventDataService.updateMenuEvent`
- Saving the line choice — family: entity-form — rung: 1 — why: a new `supplierId` control on the existing ingredient form group; saved by the recipe's own Save

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `chooseSupplier`,
`getEffectivePrice`, `computeIngredientCost`, `createIngredientGroup`, `buildSupplierOrders`, `ROW_KEY_FIELDS`,
`pushDocToMasterRecursive`, `EventPlanService.planFor`. One line each: `ok` or `conflict: <what>`.

## User Stories
- As a chef, I pick for each recipe line which supplier I buy that ingredient from, so the recipe cost is what I
  really pay — and another recipe can buy the same product elsewhere.
- As a chef, I leave a line on automatic and it always costs the cheapest supplier, however many suppliers sell it.
- As a chef, I see in an event's supplier orders that an item is cheaper elsewhere, move it there for this event
  only, and move it back if I change my mind — my recipes stay as they are.
- As a staff cook, I see which supplier a line uses, but only the owner changes it.

## Functional Requirements

### Must Have (P0)
- [ ] Recipe line field `supplierId` (optional; absent = automatic = cheapest priced supplier), owner-only.
- [ ] Event field `supplierMoves` (optional list of `{ productId, fromSupplierId, toSupplierId }`, max 500), owner-only.
- [ ] Price rule: the line's supplier when that supplier has a positive price on the product; else the cheapest
      positive price over **all** named suppliers (any count; a tie keeps the earlier source).
- [ ] Recipe builder: truck icon on product lines whose product has 2+ priced suppliers; popover inside the viewport.
- [ ] Event supplier orders: hint + total saving; owner move / undo per line, saved on the event.
- [ ] No chosen mark anywhere on the product form.

### Should Have (P1)
- [ ] Keyboard: Arrow Up/Down move between picker rows, Enter/Space picks, Tab leaves and closes.

## UI/UX Notes
- Truck: Lucide `truck` (registered), `c-icon-btn`, next to the line cost; tooltip «בחירת ספק: <current supplier>».
  When a line has a chosen supplier the icon gets the active tone so the chef sees the line is not on automatic.
- Popover: `position: fixed`, placed with `placeInViewport({ prefer: 'below' })` from the button's
  `getBoundingClientRect()` after first render (measure, then place); `max-block-size` = the result's `maxHeight` with
  scroll inside. Min inline size 14rem; at 390px it is clamped 8px from both edges. Closes on pick, click outside,
  Escape, Tab out, window resize and page scroll.
- Rows: «הזול ביותר (אוטומטי)» first, then suppliers sorted by price ascending (name, `₪` price per base unit via
  `formatMoney`), the cheapest tagged «הזול ביותר», the current one checked (`role="listbox"` / `role="option"`,
  `aria-selected`).
- Order line hint (muted, one line under the item): «זול יותר אצל {name}: {price} (חיסכון {saving})» + owner button
  «העבר ל{name}». A moved line on the new card: «הועבר מ{from} לאירוע הזה» + owner button «החזר ל{from}». Card footer
  when > 0: «אפשר לחסוך {amount} אצל ספקים אחרים» (unmoved lines only).
- Logical CSS properties only; Hebrew RTL.
- New `dictionary.json` keys (append): `pick_supplier` «בחירת ספק», `supplier_cheapest_auto` «הזול ביותר (אוטומטי)»,
  `cheaper_at_supplier` «זול יותר אצל {name}: {price} (חיסכון {saving})», `supplier_orders_can_save` «אפשר לחסוך
  {amount} אצל ספקים אחרים», `supplier_move_to` «העבר ל{name}», `supplier_moved_from` «הועבר מ{name} לאירוע הזה»,
  `supplier_move_back` «החזר ל{name}», `supplier_move_save_first` «שמרו את האירוע כדי להעביר ספק». Reused:
  `cheapest_supplier`, `save_failed`. Do **not** add 510's `supplier_chosen`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Store the line's supplier and the event's moves, owner-only — `ingredientSchema` gets
  `supplierId: z.string().optional()`; `menuEventSchema` gets `supplierMoves: z.array(z.strictObject({ productId:
  z.string(), fromSupplierId: z.string(), toSupplierId: z.string() })).max(500).optional()`; `MONEY_FIELDS` gets
  `recipes: ['ingredients[].supplierId']`, `dishes: ['ingredients[].supplierId']` and `'supplierMoves'` appended to
  `menuEvents`; `ROW_KEY_FIELDS` gets `ingredients: '_id'`; client models `Ingredient.supplierId?` and
  `MenuEvent.supplierMoves?` (+ exported `SupplierMove` interface). Server tests: staff change/set/clear of a line's
  supplier and of `supplierMoves` is a money change and refused; reordering lines is not; a staff-created recipe is
  stored without line suppliers; schema accepts a line with `supplierId` and an event with moves and rejects 501
  moves — `shared/schemas/entities/common.schema.ts`, `shared/schemas/entities/menu-event.schema.ts`,
  `shared/schemas/money-fields.ts`, `server/utils/permissions.js`, `src/app/core/models/ingredient.model.ts`,
  `src/app/core/models/menu-event.model.ts`, `server/test/permissions.test.js`,
  `server/test/supplier-choice-schema.test.js` (new).
- [x] A2: Keep a business's supplier choice out of the shared catalog — in `pushDocToMasterRecursive` drop
  `supplierId` from every pushed ingredient line (same place the `referenceId` is re-pointed); test that the master
  copy has no line `supplierId` while the caller's own recipe keeps it — `server/routes/generic.js`,
  `server/test/push-to-master.test.js`.
- [x] A3: One price rule that honours a chosen supplier and finds the cheapest among any number — port 510's
  `chooseSupplier` change but take the choice as a second argument: `chooseSupplier(product, chosenSupplierId?)`;
  keep `cheapestSupplier(product)` from 510; `getEffectivePrice(product, chosenSupplierId?)` passes it through. Specs:
  3, 4 and 5 priced suppliers with the cheapest first, middle and last; a tie; chosen dearer wins; chosen with price 0
  / removed from `sources` falls back to the cheapest; no choice = cheapest — `src/app/core/engine/supplier-choice.ts`,
  `src/app/core/engine/supplier-choice.spec.ts`, `src/app/core/utils/product-source.util.ts`,
  `src/app/core/utils/product-source.util.spec.ts`.
- [x] A4: Recipe costs use the line's supplier — `computeIngredientCost` calls `getEffectivePrice(product,
  ing.supplierId)`; spec: same product, two recipes, two suppliers, two costs — `src/app/core/services/recipe-cost.service.ts`,
  `src/app/core/services/recipe-cost.service.spec.ts`.
- [x] A5: The event engine keeps lines per supplier and applies the event's moves — `priceOf` caches by
  `productId|chosen`; an ok contribution's key becomes `${productId}|${recipeSupplierId ?? ''}` so one product bought
  from two suppliers gives two lines; `RawLine` gains `recipeSupplierId: string | null` (supplier from the recipes)
  and `movedFrom: string | null`; a move `{ productId, fromSupplierId === recipeSupplierId, toSupplierId }` applies
  only when `toSupplierId` has a positive price on the product — then `supplierId = toSupplierId`, the line cost uses
  that price and `movedFrom = fromSupplierId`; otherwise the move is ignored. Dish and event costs follow the moved
  price. Specs: two recipes on two suppliers → two lines; a move; a move whose target lost its price; a prep
  sub-recipe line keeps its own supplier — `src/app/core/engine/event-plan.engine.ts`,
  `src/app/core/engine/event-plan.types.ts`, `src/app/core/engine/event-plan.engine.spec.ts`.
- [x] A6: The menu page's plan sees the saved moves without touching the growth-frozen page — `planFor(event)`: when
  the event has an `_id` and no `supplierMoves` key, use the stored event's `supplierMoves` from
  `MenuEventDataService.allMenuEvents_()` (a signal, so the page's computed plan, pricing and planning snapshot
  update after a move). Spec — `src/app/core/engine/event-plan.service.ts`, `src/app/core/engine/event-plan.service.spec.ts`.
- [x] A7: A shared supplier picker that always fits on screen — port 510's `supplier-picker` (template, rows, staff
  read-only, spec) into `src/app/shared/supplier-picker/` with these changes: inputs `product: Product | null`,
  `value: string | null` (the line's chosen id; null = automatic), `canEdit: boolean`; output `picked: string | null`;
  a `value` whose supplier has no positive price shows as automatic; fixed positioning with `placeInViewport`
  (UI/UX Notes); Escape closes, `stopPropagation()`s and returns focus to the button; closes on outside click, Tab
  out, resize and scroll; Arrow Up/Down/Enter/Space. Spec cases: 3 suppliers listed sorted with the tag; staff rows
  disabled and no emit; Escape emits nothing and focuses the button; placement clamps inside a 390×844 viewport
  (call the placement with a stubbed rect); a stale `value` shows automatic checked. Add the `supplier-picker` family
  entry to the registry and a line to the shared breadcrumbs — `src/app/shared/supplier-picker/**`,
  `docs/brain/component-families.md`, `src/app/shared/breadcrumbs.md`.
- [x] A8: The recipe builder line carries and saves its supplier — `createIngredientGroup` adds a `supplierId`
  control from the stored line; the save mapping writes `supplierId` only when it is set and still has a positive
  price on the line's product (so a stale or automatic choice is left off and cleared); the ingredients table renders
  `<app-supplier-picker>` on product lines, `canEdit` = `PermissionService.can('editMoney', { type })`, on pick sets
  the control, marks the form dirty and re-runs `updateLineCalculations(index)` (which now passes the control to
  `getEffectivePrice`); picking another product for the line (`onItemSelected`) or `clearIngredient` resets
  `supplierId` to null. A pick must make the form dirty through the same path the unsaved-changes check reads
  (`markAsDirty()` on the control and the form, and `hasRealChanges()` returns true), so leaving the page with an
  unsaved pick shows the «save or leave» question. Specs: save mapping keeps/drops `supplierId`; pick re-costs the
  line; a pick makes `hasRealChanges()` true; changing the product clears it; staff cannot set it — `src/app/pages/recipe-builder/services/recipe-form.service.ts`,
  `src/app/pages/recipe-builder/services/recipe-form.service.spec.ts`,
  `src/app/pages/recipe-builder/components/recipe-ingredients-table/**`.
- [x] A8b: The unsaved-changes snapshot sees a supplier pick — `getRecipeSnapshotForComparison()` in
  `src/app/pages/recipe-builder/recipe-builder.page.ts` normalizes ingredients to referenceId/nameHebrew/item_type/
  amount_net/unit only, so without this a pick is NOT a change and the «save or leave» question never shows. Add
  `supplierId: (ing?.supplierId ?? '').toString()` to the line type and to `ingNorm`; nothing else in the file
  changes (growth-frozen page). Spec in `src/app/pages/recipe-builder/recipe-builder.page.spec.ts`: after a load,
  setting a line's `supplierId` makes `hasRealChanges()` true; setting it back makes it false.
- [x] A9: Event supplier orders: hint, move and undo — port 510's `cheaperElsewhere` / `cardSavings` but compare with
  the line's `recipeSupplierId` and skip moved lines; the component shows the hint on unmoved lines and the
  «העבר ל…» button, and on moved lines «הועבר מ… לאירוע הזה» with «החזר ל…»; buttons only for the owner, disabled with
  `supplier_move_save_first` when the event has no `_id`; a click writes the stored event with the move added (or
  removed; one entry per `productId + fromSupplierId`, a new move replaces the old) through `updateMenuEvent`, the
  button is `[disabled]` + `aria-busy` while `isSaving_`, and on error shows `save_failed` and keeps the old state.
  Specs: helper with 3 suppliers; move adds, undo removes; staff sees no button; error keeps lines —
  `src/app/core/utils/supplier-orders.util.ts`, `src/app/core/utils/supplier-orders.util.spec.ts`,
  `src/app/pages/menu-intelligence/components/supplier-orders/**`.
- [x] A10: Run the full checks and paste the output into Execution Notes — `npx ng build`, `pnpm run test:ci`,
  `pnpm run test:server`, `node scripts/reuse-lint.mjs --check-registry`, `node scripts/reuse-lint.mjs --diff=origin/main`,
  log-query.

## What happens when
- **Edit:** a pick changes only the form; the recipe is saved by its Save button like any line edit. Leaving with
  an unsaved pick triggers the existing unsaved-changes check.
- **Cancel / Escape / click outside:** the popover closes, nothing changes. Escape closes only the popover (one step
  back), never the recipe page or the supplier-orders dialog behind it.
- **Save error (recipe):** the existing recipe save error path; the form keeps the pick.
- **Save error (move/undo):** toast `save_failed`; the line stays where it was.
- **The chosen supplier's price is deleted, or the supplier is deleted** (`unlinkSuppliersFromProducts` pulls it
  from `sources`): the line costs the cheapest supplier, the picker shows automatic checked, and the next recipe save
  drops the stale id. A move whose target lost its price is ignored (the line is back on the recipe's supplier); the
  stale entry is removed on the next move/undo write.
- **Product with one priced supplier:** no truck icon (a stored choice still costs correctly).
- **Recipe changed after a move** (line moved to another supplier in the recipe): the move's `fromSupplierId` no
  longer matches, so it stops applying; the new hint shows.
- **Event in execution with a frozen snapshot:** moves still change the orders; the frozen planning snapshot stays
  as it was (plan 446 rule).

## Technical Considerations
- Dependencies: `KitchenStateService` (`productsById_`, `suppliersById_`), `PermissionService`,
  `MenuEventDataService`, `EventPlanService`, `RecipeCostService`, `placeInViewport`.
- Reuse of the 510 branch (`f29d3472`): **keep** `cheapestSupplier` + the fallback logic and its specs
  (supplier-choice), `cheaperElsewhere` / `cardSavings` + specs (adapted to `recipeSupplierId`), the picker template,
  row building, staff-disabled rows and most of its spec, the order-line hint markup/SCSS and the dictionary strings
  listed above. **Change**: picker moves to `src/app/shared/`, takes `value` instead of reading the product, uses
  fixed viewport placement; the choice is a recipe-line field, not `preferredSupplierId`. **Drop**: product
  `preferredSupplierId` (schema, model, `MONEY_FIELDS.products`), `onSupplierPicked` saving the product, the
  `supplier-prices` «נבחר» mark + its spec + the `product-form.component.html` binding, `supplier_chosen`, and the
  unrelated venue/equipment changes and plan-file edits that rode on that branch.
- New files: `src/app/shared/supplier-picker/supplier-picker.component.{ts,html,scss,spec.ts}`,
  `server/test/supplier-choice-schema.test.js`.
- Model changes: `Ingredient.supplierId?`, `MenuEvent.supplierMoves?`, `SupplierMove`, `RawLine.recipeSupplierId`,
  `RawLine.movedFrom`.
- Backend / API: no new route. Generic CRUD saves both fields. One server change: push-to-master strips line
  `supplierId`.
- Auth and validation: owner-only through `MONEY_FIELDS` + `editMoney`; Zod validates shape and the 500 cap.
- Security surface: two owner-only fields; covered by permission tests. Supplier ids are only compared, never
  queried with.
- Data / migration: none. Existing recipes have no `supplierId` → automatic (cheapest), exactly today's cost.
  Existing events have no `supplierMoves` → no moves. No backfill.
- Data flow (signals): `form ingredient group.supplierId` → `updateLineCalculations` → `total_cost` control;
  `kitchenState.products_/recipes_` + `menuEventData.allMenuEvents_` → `EventPlanService.planFor` (computed) →
  `buildSupplierOrders` → `orders_` / `savings_` computed → template.
- Growth-frozen: `menu-intelligence.page.ts` is not touched (A6 is why). `recipe-builder.page.ts` gets one exception (A8b, Human 2026-11-08): `supplierId` added to the ingredient snapshot in `getRecipeSnapshotForComparison()` — about 2 lines, nothing else in that file.
- Project checks (`docs/agent/plan-checks.md`): log-query Done-when ✓, Reuse Check ✓, chef-side stories ✓,
  dictionary keys named ✓, generic entity contract + Zod in `shared/schemas/` ✓, Lucide icons already registered
  (`truck`, `check`, `undo-2`).

## Out of Scope
- A product-level preferred supplier (510's model) and any chosen mark on the product form.
- Moving all of a card's items at once, or moving to a supplier that is not cheaper.
- Changing a recipe's supplier from the event screen (a move is per event only).
- Changing frozen planning snapshots or the event closing screen.
- "No supplier" card lines (no named supplier to compare).
- Last-bought or other smarter rules.

## Critical Questions
- Q: When is a picked supplier saved — at once, or with the recipe's Save? A: with the recipe's Save (Human 2026-11-08);
  a pick makes the form dirty so the «save or leave» question pops when leaving unsaved.
- Q: Staff deleting a line (on a recipe they created) that the owner gave a supplier — allowed? A: refused with the
  existing owner-only message (Human 2026-11-08).
- Answered (Human, 2026-11-08): per-recipe-line choice; no «נבחר» mark; per-event reversible move; popover inside
  the viewport; automatic for any supplier count; server-side persistence; staff read-only.

## Execution Notes
- Base branch `main`. Plan 510 is closed as superseded by this plan.
- Step 0: drift reported (`REALITY: drift`, only the reverted 510 commits) — chooseSupplier ok, getEffectivePrice ok, computeIngredientCost ok, createIngredientGroup ok, buildSupplierOrders ok, ROW_KEY_FIELDS ok, pushDocToMasterRecursive ok, EventPlanService.planFor ok.
- `pnpm run build` -> exit 0. `pnpm run lint` -> exit 0 (0 errors, warnings pre-existing).
- `pnpm run test:ci` -> exit 0, 1760 of 1760 SUCCESS.
- `pnpm run test:server` -> first run: 11 failures in test/business-stats.test.js (E11000 dup email null in a shared test DB, unrelated); rerun of that file -> 13 passed; every other file passed (incl. permissions, push-to-master, supplier-choice-schema).
- `node scripts/reuse-lint.mjs --check-registry` -> exit 0; `--diff=origin/orch/run-536` -> ok. scope-check -> ok. kit-manifest-check -> ok.
- log-query --since=plan-start --level=error -> one old entry (2026-11-08T11:44 POST /business/team 409, before this run, not from this plan).
- Prices in the picker rows and the order hint use formatMoney (₪4.00), per the money-format rule.
