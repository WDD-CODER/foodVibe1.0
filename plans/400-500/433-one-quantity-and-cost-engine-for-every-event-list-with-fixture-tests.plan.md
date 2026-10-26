# Plan 433 — One quantity and cost engine for every event list, with fixture tests

Status: done
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110
Track: code

## Problem Statement
Today every menu list computes its own quantities. The shopping list exists three times in
`menu-export.service.ts` (`exportMenuShoppingList`, `getMenuShoppingListPreviewPayload`,
`addMenuShoppingListSheetToWorkbook`), each built on `ScalingService.getScaledIngredients`, which is flat:
a prep (sub-recipe) inside a dish lands under "הכנות" and its own ingredients never reach the list. Rows are
merged by display name + unit with no unit conversion, the product waste factor (`yieldFactor`) is used only in
cost (`recipe-cost.service.ts` `computeIngredientCost`), yield division differs between cost
(`Math.max(1, yieldAmount)`) and lists (`yieldAmount || 1`), unlinked free-text rows merge with linked rows of the
same name, and the footer, preview and Excel round differently. A chef cannot trust the quantities he orders.

This plan builds the single engine every list and cost will read (spec 04.1), as pure TypeScript with
hand-computed fixture tests. No screen changes here; plan 434 wires the screens.

## Goals & Success Criteria
- Primary: one pure function `computeEventPlan` turns an event + portions into raw-product lines, prep lines,
  cost per dish and per event, a `partial` flag, missing items and errors — and the 04.1 acceptance fixture
  comes out exactly as hand-computed.

Done when:
- [x] [auto] `npx ng build` exits 0.
- [x] [auto] `npx ng test --watch=false --include='src/app/core/engine/**/*.spec.ts' --include='src/app/core/utils/purchase-option-rate.util.spec.ts'`
  passes (0 failures), and the run includes these named cases:
  - **04.1 fixture** (`event-plan.engine.spec.ts`, data from `testing/event-plan.fixture.ts`): dish "סלט" yield 10
    portions = 500 g tomato + 200 g prep "רוטב"; prep "רוטב" yield 1 kg = 800 g olive oil + 0.2 kg lemon; dish
    "פסטה" yield 5 portions = 1 kg tomato; event 100 portions סלט + 50 portions פסטה; tomato `yieldFactor` 0.8 →
    exactly one tomato raw line with `netQty` 15 (kg) and `buyQty` 18.75 (kg); olive oil `netQty` 1.6 (kg); lemon
    `netQty` 0.4 (kg); no raw line for "רוטב"; one prep line "רוטב" with `qty` 2 and `unit` `kg`, `dishId` = סלט.
  - **Fixture cost**: tomato suppliers A 6 ₪/kg and B 5 ₪/kg → `supplierId` B, `lineCost` 93.75; olive oil supplier
    B 40 ₪/kg → `supplierId` B, 64; lemon unpriced (no source) → `lineCost` null, `partial` true, `missing` = `[{ kind: 'unpriced', name: 'לימון', recipeIds: [<רוטב id>] }]`;
    `dishCosts` סלט 95.25 (partial true) and פסטה 62.5 (partial false); `eventFoodCost` = 157.75 = their sum.
  - **Cycle**: prep X uses prep Y, prep Y uses prep X → returns (does not hang), `errors` contains `{ kind: 'cycle', name: 'X' }` or `'Y'`, `partial` true.
  - **No conversion**: tomato (base kg, no purchase option "unit") used as 3 "unit" → two tomato lines: one `ok` in kg,
    one `no_conversion` in `unit` with `lineCost` null; `partial` true.
  - **Deleted**: ingredient whose `referenceId` is not in `products` → line `status: 'deleted'`, `name` = its
    `nameSnapshot`, `lineCost` null, `missing` has `kind: 'deleted'`.
  - **Unlinked**: free-text "עגבנייה" (no `referenceId`) next to linked tomato → two separate lines, the free-text one
    `status: 'unlinked'`, `productId` null, its own unit; `missing` has `kind: 'unlinked'`.
  - **Waste**: `yieldFactor` 0 or missing → `buyQty` = `netQty`.
  - **Purchase unit**: tomato purchase option "ארגז" = 10 kg (via `optionRateInBase`) → `purchase` = `{ unit: 'ארגז', count: 1.875 }`;
    `formatQty(1.875, 'ארגז')` → `{ qty: 2, unit: 'ארגז' }`. An ingredient line in "ארגז" counts 10 kg per crate.
  - **No yield**: prep with `yieldAmount` 0 → `errors` has `{ kind: 'no_yield', name }`, none of its ingredients are
    added, no division by a silent 1.
  - **No ingredients**: dish with an empty `ingredients` array → contributes nothing, `errors` has `{ kind: 'no_ingredients', name }`.
  - **Supplier choice** (`supplier-choice.spec.ts`): cheapest positive price wins; tie → first in `sources`; a source with
    price 0 is never chosen; only a global source (`supplierId: ''`) priced → `{ supplierId: null, pricePerBaseUnit: <price> }`;
    nothing priced → `{ supplierId: null, pricePerBaseUnit: null }`.
  - **Rounding** (`rounding.spec.ts`): `roundPortions(1.1 * 1.1 * 100)` → 121 (not 122); `roundPortions(126.5)` → 127;
    `formatQty(1500, 'gram')` → `{ qty: 1.5, unit: 'kg' }`; `formatQty(1000, 'gram')` → `{ qty: 1000, unit: 'gram' }`;
    `formatQty(18.754, 'kg')` → `{ qty: 18.75, unit: 'kg' }`; `formatQty(1500, 'ml')` → `{ qty: 1.5, unit: 'liter' }`;
    `formatQty(2.1, 'unit')` → `{ qty: 3, unit: 'unit' }`; `formatMoney(1234.5)` → `'₪1,234.50'`; `formatPct1(16.666)` →
    `'16.7%'`; `formatPctInt(57.14)` → `'57%'`; `roundMoney(93.745)` → 93.75.
  - **Portions**: `portionsFromDerived(event)` maps `${section._id}|${itemIndex}` → `derivedPortions` (missing → 0); a dish
    item with portions 126.0000001 is scaled as 126 (float noise dropped) and 126.4 as 127, a prep item with 5.5 (kg)
  is not rounded.
  - **Service**: `EventPlanService.planFor(event)` with a stubbed `KitchenStateService` returns the same plan as
    `computeEventPlan` on the fixture input; `costFor(<סלט id>, 100)` → `{ cost: 95.25, partial: true }`.
- [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [x] [auto] `git diff --name-only origin/main...HEAD` lists only paths inside the Read-Write Scope below.

No `[human]` item: this plan has no screen; plan 434 carries the on-screen checks.

## Execution Mode
- Parallel: yes — new files under `src/app/core/engine/` plus one widened signature in
  `purchase-option-rate.util.ts`; no hotspot. Run `node scripts/scope-check.mjs --overlap --plan=<this>` at take time.
- Concurrent plans: lane 1 (424–432, 448) and lane 3 (438–447) plans. 440 (`engine/portions.ts`) and 441
  (`engine/event-plan.service.ts`) also write under `src/app/core/engine/`, but both depend on this plan, so they never
  run alongside it.
- Isolated DB: no — pure client code, no data written.

## Execution Notes
- Depends on: plan 423 merged (creates `src/app/core/utils/purchase-option-rate.util.ts` `optionRateInBase`, which
  the engine uses for purchase units).
- Lane wt-2: 423 → **433** → 434 → 435 → 436 → 437 → 430.
- Must not run at the same time as: none from the map's hotspot list (this plan writes no shared hotspot).
- Consumers that will read this engine: 434, 435, 437, 441, 444, 445, 446 — keep every exported name exactly as in
  the C-ENGINE contract below. Plan 447 later appends `formatDecimal1(n)` to `rounding.ts` (map extension); leave
  room for it, do not add it here.
- Portions wiring: this plan always uses `portionsFromDerived`, even if 440 has merged. Plan 441 (K1) swaps
  `EventPlanService.planFor` to `computePortions` and deletes `portions-from-derived.ts` with its spec.
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
  Under run mode every `origin/main` in a Done-when command reads `origin/mvp`.

## Contracts (verbatim from the approved MVP map)

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

**C-PORTIONS (440; consumed by 433 via EventPlanService, 441)**
- `src/app/core/engine/portions.ts`: `computePortions(event: MenuEvent, recipes: Recipe[]): Map<string, { portions: number, coefficient: number, overridden: boolean }>`; portions = portionsPerDiner × guests × coefficient; coefficient default = eventTypeSnapshot.coefficient × servingTypeSnapshot.coefficient (not rounded); override → `coefficientOverride` (> 0, ≤ 2 decimals).

### Contract extensions this plan adds (additive — no existing name changes; Planner to fold into the map)
- `EngineError.kind` adds `'no_conversion'` (a prep used in a unit that cannot convert to its yield unit) and
  `'no_ingredients'` (a dish or prep with no ingredients — spec "אין מצרכים").
- `PrepLine` adds `category: string` (a mise item's `categoryName`, a linked prep's `course`, else `''`),
  `source: 'prep' | 'mise'` (linked sub-recipe vs. a dish's own `prepItems`/`prepCategories` row; a mise row's
  `prepId` is `mise:<name>`) and `note?: string` (the dish ingredient row's `note`). Plan 437 needs all three.
- `PrepLine.station` = the serving dish's `defaultStation` trimmed, `''` when none (consumers show "כללי").
- `UnitConversion = { getConversion(key: string): number, has(key: string): boolean }` (defined here; the map
  named the type only).
- `rounding.ts` adds `roundMoney(n): number` (2 decimals, numeric, for Excel cells); `formatQty` returns
  `{ qty: number, unit: string }` (numbers, so Excel keeps numeric cells and each screen picks its own unit label).
- `EventPlanService` adds `costFor(recipeId: string, portions: number): { cost: number, partial: boolean }` (one
  dish alone — for the dish row and the recipe pick in plan 434).
- `src/app/core/engine/portions-from-derived.ts` exports `portionsFromDerived(event)` (plan 441 replaces its call
  site in `EventPlanService` with `computePortions` from plan 440 and deletes the file).
- "Unpriced" means no price after both `chooseSupplier` and the purchase-option `priceOverride` fallback (Design
  step 4). Consumers that ask "is this product unpriced?" read `plan.missing` (`kind: 'unpriced'`) or
  `RawLine.lineCost === null`, never `chooseSupplier` alone.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/engine/**
src/app/core/utils/purchase-option-rate.util.ts
src/app/core/utils/purchase-option-rate.util.spec.ts
src/app/core/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — new pure client code under `src/app/core/engine/`; no route, schema, taxonomy, data
  service or AI file is written. `purchase-option-rate.util.ts` only widens a parameter type.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol:
`optionRateInBase` in `src/app/core/utils/purchase-option-rate.util.ts` (plan 423) and its third parameter type;
`getEffectivePrice` / `getSupplierIds` in `product-source.util.ts`; `UNIT_ALIASES`, `MASS_UNITS`, `VOLUME_UNITS` in
`recipe-cost.constants.ts`; `amountInRecipeYieldUnit` in `recipe-cost.service.ts`; `products_`, `recipes_`,
`productsById_` in `kitchen-state.service.ts`; `globalUnits_`, `getConversion` in `unit-registry.service.ts`;
`Recipe.prepItems` / `prepCategories` / `defaultStation` / `course`, `Ingredient.type` / `referenceId` /
`nameSnapshot` / `note`, `MenuItemSelection.derivedPortions` in the models. If plan 440 has already merged, still use `portionsFromDerived`
(plan 441 swaps it). Print `ok` or `conflict: <what>` per symbol.

## User Stories
- As a chef, I want the quantities of a prep inside a dish to reach my shopping list as raw products so that I
  don't forget the oil and lemon of a sauce.
- As a chef, I want the same product from two dishes on one line, in one unit, so that I order once.
- As a chef, I want the waste of a product counted so that I buy enough after cleaning.
- As a chef, I want a clear error instead of a frozen screen when two preps use each other.

## Functional Requirements

### Must Have (P0)
- [x] Recursive expansion of preps inside dishes and preps, no depth limit, factor = needed qty in the prep's
      yield unit ÷ prep `yieldAmount`.
- [x] Cycle detection (direct or indirect) with an `EngineError`, never an infinite loop.
- [x] Raw lines aggregated by product id in the product's base unit; preps never become raw lines.
- [x] Waste: `buyQty = netQty ÷ yieldFactor`; `yieldFactor` 0, negative or missing → 1.
- [x] Purchase units through `optionRateInBase`; `purchase.count = buyQty ÷ rate` (unrounded).
- [x] Unlinked rows never merge with product rows; deleted references flagged; unconvertible units on their own line.
- [x] Yield 0/empty is an error, not a silent 1; the same yield division for cost and quantity.
- [x] Supplier choice: cheapest positive price per base unit, tie → first source, no priced supplier → global
      price (`supplierId: ''` source, then a purchase option `priceOverride` converted to base) with
      `supplierId: null`.
- [x] `lineCost = buyQty × pricePerBaseUnit` (after waste, before purchase rounding); `eventFoodCost` = Σ line costs
      = Σ dish costs.
- [x] Rounding helpers as in the contract; the engine itself never rounds except `roundPortions` on dish items.

### Should Have (P1)
- [x] A reusable fixture builder so plans 434/435/437 specs assert the same numbers.

## UI/UX Notes
- No UI. Dictionary keys for engine statuses and errors are added by the plans that show them (434, 435, 437).

## Design

### Files (all new under `src/app/core/engine/`, pure TS — no `inject`, no Angular import except in the service)
- `event-plan.types.ts` — the contract types plus the extensions above. `MenuEvent`, `Product`, `Recipe` imported
  from `@models/*`.
- `rounding.ts` — `roundPortions`, `formatQty`, `formatMoney`, `formatPct1`, `formatPctInt`, `roundMoney`.
  - `roundPortions(x) = Math.ceil(Math.round(x * 1e6) / 1e6)`.
  - One private helper `roundTo(n, d) = Math.round(Number((n * 10 ** d).toPrecision(15))) / 10 ** d` does every
    decimal rounding (`Number.EPSILON` is too small above 2 — `93.745 * 100` is `9374.4999…`).
  - `roundMoney(n) = roundTo(n, 2)` (93.745 → 93.75).
  - `formatQty(qty, unit)`: key = `UNIT_ALIASES[unit] ?? unit`. `gram` > 1000 → `kg` (÷1000); `ml` > 1000 → `liter`.
    `kg`/`liter` → `roundTo(q, 2)`; `gram`/`ml` → `Math.round`;
    any other unit (unit, crate, jar, portion…) → `Math.ceil` after rounding to 6 decimals.
  - `formatMoney(n)` → `'₪' + roundMoney(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
    (matches today's `₪{{ x | number:'1.2-2' }}` footer).
  - `formatPct1(n)` → `n.toFixed(1) + '%'` after `roundTo(n, 1)`; `formatPctInt(n)` → `Math.round(n) + '%'`.
- `supplier-choice.ts` — `chooseSupplier(product)`: from `product.sources` with non-empty `supplierId` and
  `price > 0`, the lowest price; ties keep the earlier source. Else a source with empty `supplierId` and `price > 0`
  (today's "global price" shape, see `product-data.service.ts` `normalizeProduct`) → `supplierId: null`. Else
  `{ null, null }`. (`priceOverride` on a purchase option needs unit conversion, so the engine applies it — see below.)
- `units.ts` — `unitFamily(key)`: `'mass'` for `MASS_UNITS`, `'volume'` for `VOLUME_UNITS`, `'count'` for `unit`,
  else `'custom'`; `toBase(amount, unit, product, units)` returns the amount in the product's base unit or `null`:
  same key → amount; a purchase option with `unitSymbol === unit` → `amount × optionRateInBase(product, opt, units)`;
  same family (mass↔mass, volume↔volume) → `amount × getConversion(unit) / getConversion(base)`; otherwise `null`
  (mass↔volume is **not** converted — no water assumption). `toYield(amount, unit, prep, units)` does the same into
  the prep's `yieldUnit`, trying `prep.yieldConversions` first (same rule as `amountInRecipeYieldUnit`).
- `portions-from-derived.ts` — `portionsFromDerived(event)`.
- `event-plan.engine.ts` — `computeEventPlan(input)`:
  1. For each section/item (key `${section._id}|${i}`): recipe = by id among `recipes`; missing → skip with a
     `deleted` missing item. Portions = `portionsByItem.get(key) ?? 0`; for a dish (`recipeType === 'dish'`, or
     `prepItems`/`prepCategories` present) use `roundPortions(portions)`; a prep item is not rounded (its portions
     are already in its yield unit, spec 03.1).
  2. Yield ≤ 0 → `no_yield` error, skip. Factor = portions ÷ `yieldAmount`.
  3. `expand(recipe, factor, path: string[], dishItem)` walks `ingredients`:
     - product ref found → `toBase`; `null` → a `no_conversion` line keyed `productId|unit`; else add to the line
       keyed `productId` (net += amount); record dish id and the direct recipe id for `missing.recipeIds`.
     - product ref not found → `deleted` line keyed `deleted|referenceId`.
     - prep ref found → if its id is in `path` → `cycle` error, stop that branch; yield ≤ 0 → `no_yield`; `toYield`
       `null` → `no_conversion` error; else push a `PrepLine` (qty in yield unit, `dishId` = the menu item's recipe,
       `station` = the menu item dish's `defaultStation`, `category` = prep `course ?? ''`, `source: 'prep'`,
       `note` = the ingredient's `note`) and recurse with factor = qty ÷ prep `yieldAmount`.
     - prep ref not found → `deleted` line (name from `nameSnapshot`).
     - no `referenceId` → `unlinked` line keyed `unlinked|name|unit`.
     - a dish's `prepItems` and `prepCategories` items (de-duplicated exactly like `ScalingService.getScaledPrepItems`)
       → `PrepLine` with `source: 'mise'`, `prepId: 'mise:' + name`, qty = quantity × factor, `unit` = its `unit`,
       `category` = its `categoryName` (`''` when absent).
     - recipe with no ingredients (and, for a dish, no mise items) → `no_ingredients` error.
     A menu item that is itself a prep also gets one `PrepLine` for itself (qty = portions, its yield unit).
  4. After expansion, per product line: `buyQty = netQty ÷ (yieldFactor > 0 ? yieldFactor : 1)`; price =
     `chooseSupplier(product)`, falling back to the first purchase option with `priceOverride > 0`
     (`priceOverride ÷ optionRateInBase`) with `supplierId: null`; `lineCost = price == null ? null : buyQty × price`;
     `purchase` = first purchase option whose `unitSymbol` ≠ base and rate > 0 → `{ unit, count: buyQty ÷ rate }`.
  5. Dish cost = the same per-line formula applied to that item's own contributions (kept per item during
     expansion), so Σ `dishCosts.cost` = `eventFoodCost` = Σ non-null `lineCost`. `DishCost.partial` and
     `EventPlan.partial` are true when any unpriced, unlinked, deleted or `no_conversion` line or any error touches them.
  6. `missing`: one entry per unpriced product (by id), per unlinked name and per deleted reference, with the
     distinct recipe ids that use them directly.
- `event-plan.service.ts` — `@Injectable({ providedIn: 'root' }) EventPlanService`: `planFor(event)` accepts
  `MenuEvent | Omit<MenuEvent, '_id'>` (the menu page builds the latter), builds the input from
  `KitchenStateService.products_()` / `recipes_()` and a `UnitConversion` over `UnitRegistryService`
  (`getConversion`, `has: k => k in globalUnits_()`), with `portionsFromDerived(event)`; `costFor(recipeId,
  portions)` runs the engine on a one-section, one-item event and returns that item's dish cost.
- `testing/event-plan.fixture.ts` — `buildFixtureInput()` returning the 04.1 fixture for this plan's specs and later
  plans' specs (434, 435, 437): products עגבנייה (base `kg`, `yieldFactor` 0.8, sources A 6 / B 5, purchase option
  `{ unitSymbol: 'ארגז', conversionRate: 10, uom: 'kg' }`), שמן זית (base `kg`, source B 40), לימון (base `kg`, no
  source); suppliers A "ספק א" (phone `050-1234567`) and B "ירקן" (phone `052-7654321`); recipes סלט, רוטב, פסטה as
  in the fixture case; event "אירוע בדיקה", date `2026-11-20`, 100 guests, one section, items סלט (`derivedPortions`
  100) and פסטה (50). Also exports `FIXTURE_IDS` and `FIXTURE_SUPPLIERS: Supplier[]` (suppliers are not part of
  `EventPlanInput`; the engine only returns `supplierId`).

## Atomic Sub-tasks
- [x] E1: Define the engine's input and output shapes so every later screen shares one vocabulary — contract types plus the listed extensions — src/app/core/engine/event-plan.types.ts
- [x] E2: Add one place for quantity, money and percent rounding, with the 121-not-122 float check — roundPortions, formatQty, formatMoney, formatPct1, formatPctInt, roundMoney + spec — src/app/core/engine/rounding.ts, rounding.spec.ts
- [x] E3: Pick each product's supplier by the cheapest price, with a fallback to the general price — chooseSupplier + spec — src/app/core/engine/supplier-choice.ts, supplier-choice.spec.ts
- [x] E4: Convert amounts into the product's base unit or the prep's yield unit, or flag it — toBase, toYield, unitFamily; widen optionRateInBase's registry parameter to Pick<UnitRegistryService, 'getConversion'> — src/app/core/engine/units.ts, src/app/core/utils/purchase-option-rate.util.ts (+ spec case with a plain object)
- [x] E5: Expand preps inside dishes into raw lines, prep lines and dish costs, stopping on cycles — computeEventPlan per the Design steps 1–6 — src/app/core/engine/event-plan.engine.ts
- [x] E6: Write the 04.1 fixture once and test every listed case against hand-computed numbers — buildFixtureInput + engine spec (fixture, cost, cycle, no conversion, deleted, unlinked, waste, purchase unit, no yield, no ingredients) — src/app/core/engine/testing/event-plan.fixture.ts, event-plan.engine.spec.ts
- [x] E7: Read today's stored portions until the coefficients plan lands — portionsFromDerived + spec — src/app/core/engine/portions-from-derived.ts, portions-from-derived.spec.ts
- [x] E8: Give screens one Angular entry point to the engine for a whole event or a single dish — EventPlanService.planFor, costFor + spec with stubbed KitchenStateService and UnitRegistryService — src/app/core/engine/event-plan.service.ts, event-plan.service.spec.ts
- [x] E9: Note the new engine folder in the core map so the next agent finds it — breadcrumbs skill — src/app/core/breadcrumbs.md
- [x] E10: Build, run the engine specs and the log check, and report the evidence — ng build, ng test include list, log-query — this plan file

## Technical Considerations
- Dependencies: `optionRateInBase` (plan 423), `UNIT_ALIASES` / `MASS_UNITS` / `VOLUME_UNITS`
  (`recipe-cost.constants.ts`), `KitchenStateService`, `UnitRegistryService`. Nothing existing calls the engine yet.
- New files needed: listed in Design.
- Model changes: none to entity models; new engine types only.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: log-query Done-when present; no dictionary keys, icons or CSS in this plan; breadcrumbs updated
  for the new `core/engine/` subtree; pure utilities (no I/O, no argument mutation) per `standards-angular.md`.
- Spec timing: `standards-angular.md` defers specs to `/ship`; this plan's specs ARE the deliverable (04.1 asks for
  automated fixture tests), so they are written with the code.
- Performance: the menu library sorts by food cost and will call the engine once per event (plan 434); keep
  `computeEventPlan` O(ingredients) with `Map` lookups (`productsById`, `recipesById` built once per call).

## Backend Impact
None — no route, schema, collection or server code changes.

## Out of Scope
- Any screen, list, preview or Excel change (plan 434), supplier orders (435), stations (436), prep sheets (437).
- Coefficients and the portions formula (440/441); until then the engine reads stored `derivedPortions`.
- Partial badges and the missing-prices popover (444); the engine only reports `partial` and `missing`.
- Recipe-builder cost and weight (`recipe-cost.service.ts`) — unchanged; the engine is for event lists and costs.
- Mass↔volume conversion without a product purchase option (flagged `no_conversion`, never guessed).
- Warehouse stock deduction, standing orders.

## Critical Questions
None. Decision taken (spec-aligned, reversible): grams and millilitres are never converted into each other
implicitly; such a row shows as "לא ניתן לאחד – חסרה המרה" until the product gets a purchase option.
