# Plan 423 — Give each product its own weight for its purchase units

Status: draft
Track: code — here (not design)
Snapshot: 8d7997e5b732007392f50cc07f40b2aa430f37d6

## Prerequisites
- Plans 377 (wt-1), 418 (wt-2) and 420 merged into `origin/main`. 377 and 418 write the product form, the unit
  window, the unit registry, the recipe ingredients table and cook view; 420 writes
  `inventory-product-list.component.ts`. Starting earlier means editing the same lines twice.

## Problem Statement
The Human's rule (2026-10-20): a purchase unit's weight belongs to the product. "1 jar" of yellow onion = 500 g;
"1 jar" of pickles may be 350 g. Adding a purchase unit to a product must define it for that product only, and a
recipe using yellow onion by the jar must count 500 g.

Planner trace on `main` at `8d7997e5`. What already works: each product stores its own
`purchaseOptions[] { unitSymbol, conversionRate, uom }`, and cost (`recipe-cost.service.ts:262`), recipe weight
(`:134`), price per unit (`product-price.util.ts:21`) and the recipe line cost
(`recipe-ingredients-table.component.ts:458`) use the product's own `conversionRate` first. What breaks the rule:

1. **The unit window makes the first product's weight a shared default.** «הוסף יחידה חדשה» in any place opens
   the one unit window, which saves the unit as a shared taxonomy term with `gramRate` (`unit-registry.service.ts:122-127`).
   After that:
   - in the product form, choosing "jar" in a purchase row pre-fills the shared 500 g
     (`product-form.component.ts:706-711`);
   - adding "jar" to pickles from a recipe line (`recipe-ingredients-table.component.ts:560-577`) or from cook view
     (`cook-view.page.ts:1080-1091`) silently saves "jar = 500 g" onto pickles, with no question;
   - when the name already exists, the window does not ask for a weight at all (`unit-registry.service.ts:115-120`).
2. **The "compare to" unit (`uom`, after the «:») is saved but never used.** Every reader multiplies
   `conversionRate` as if it were in the product's base unit. Base unit kg with "1 jar = 500 : gram" is read as
   500 kg — the cost comes out 1000× too high.
3. **Changing a product's base unit leaves its purchase rows in the old unit** (same cause as 2).
4. **INVF-C06 (S2, Code QA 2026-10-20, moved here from plan 421):** the constructor `effect` in
   `product-form.component.ts:279-306` runs when the unit window closes and does `Array.from(allUnits.keys()).pop()`
   on a `string[]`, so the base unit or purchase unit becomes a number such as `24`; cancel leaves a blank select
   and save throws in `validateForm_` (`val.baseUnit?.trim` on a number).

User stories:
- As a chef, I want to say how much one jar of *this* product weighs so that each product's jar counts right in
  every recipe.
- As a chef, I want adding a unit from inside a recipe to ask me that product's weight so that one product's
  number never lands on another.
- As a chef, I want "1 jar = 500 gram" to mean 500 g even when the product is priced per kg.

## Goals & Success Criteria
**Primary:** every purchase unit added to a product — from the product form, a recipe line or cook view — gets a
weight typed for that product; no product ever receives another product's weight; the «:» unit is respected in
every calculation; the unit window never writes a number into a unit field.

- [auto] `ng build` passes.
- [auto] `npx ng test --watch=false --include='src/app/core/utils/purchase-option-rate.util.spec.ts' --include='src/app/core/services/recipe-cost.service.spec.ts' --include='src/app/core/services/unit-registry.service.spec.ts' --include='src/app/shared/unit-creator/**' --include='src/app/pages/inventory/components/**' --include='src/app/pages/recipe-builder/components/recipe-ingredients-table/**' --include='src/app/pages/cook-view/**'`
  passes, including the new specs:
  - `optionRateInBase`: base kg, `{ conversionRate: 500, uom: 'gram' }` → `0.5`; base gram, same option → `500`;
    `uom` missing → `conversionRate` unchanged;
  - recipe cost and weight for 1 jar of a kg-priced product with "1 jar = 500 : gram" → 500 g and half the kg price;
  - unit window in product mode with a name that already exists → still requires an amount; emits
    `productUnitAdded$ { key, amount, basis }`; no taxonomy write;
  - product form: choosing an existing custom unit in a purchase row leaves the amount empty; choosing a system
    unit (`kg`, `gram`, `liter`, `ml`, `tablespoon`, `teaspoon`, `cup`) fills the exact amount; «add new unit»
    then cancel → the field holds its previous value (a string); then add → the new unit's key;
  - recipe line and cook view: «add unit» for a product opens the window in product mode and saves the typed
    amount on that product, never the shared rate.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [auto] `node server/scripts/check-unit-weights.js --target=local` exits 0 and prints the three sections of the
  Design (`uom differs`, `copied from shared`, `recipe lines on a unit the product lacks`) with a count each.
- [human] The Human runs `node server/scripts/check-unit-weights.js --target=atlas` (agents may not read
  production) and reviews the lists. A non-zero `uom differs` line means those products' costs will change after
  the merge (they were wrong) — the Human decides before merge.
- [human] `/inventory`: yellow onion → «הוסף יחידת רכש» → «הוסף יחידה חדשה» "צנצנת" = 500 גרם → save. Pickles →
  «הוסף יחידת רכש» → choose "צנצנת" → the amount is empty; type 350 → save. Reopen both: onion shows 500, pickles 350.
- [human] A recipe with 1 צנצנת onion and 1 צנצנת pickles → the weight shows 850 g and each line's cost matches
  its own product.
- [human] In the recipe builder, add "צנצנת" to a third product from its line's unit list → the window asks
  «כמה שוקלת צנצנת אחת של <product>?» before saving.
- [human] `/inventory/add`: base unit → «הוסף יחידה חדשה» → «ביטול» → the base unit still shows what it showed
  before; repeat and add a unit → the new unit is selected; the product saves.

## Execution Mode
- Parallel: after the prerequisites, yes — check `node scripts/scope-check.mjs --overlap --plan=<this>` at take
  time (plan 421 shares no file).
- Concurrent plans: 407 (wt-3) — no shared files.
- Isolated DB: yes for the check script's local run (slot DB); no app data is written by this plan.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/purchase-option-rate.util.ts
src/app/core/utils/purchase-option-rate.util.spec.ts
src/app/core/utils/product-price.util.ts
src/app/core/services/recipe-cost.service.ts
src/app/core/services/recipe-cost.service.spec.ts
src/app/core/services/unit-registry.service.ts
src/app/core/services/unit-registry.service.spec.ts
src/app/shared/unit-creator/**
src/app/pages/inventory/components/product-form/**
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.spec.ts
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/cook-view/cook-view.page.spec.ts
server/scripts/check-unit-weights.js
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside
the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and why it can't be done in-scope;
offer `approved: <path>`; then append the path to the scope block above and retry.

## Architecture Impact

- INV-5: preserves — units stay terms in `taxonomyTerms` (one shared name per unit, `gramRate` still required by
  the schema); only how a product's purchase row gets its number changes.
- INV-4: preserves — no schema change; `purchaseOptions[].uom` already exists and is now read.
- INV-3: preserves — adding a unit to a product from a recipe line or cook view stays one product save, as today.
- INV-none for `server/scripts/check-unit-weights.js`: read-only script.

## Step 0 — Reality Check

Runs always (plans 377 and 418 change these files). Check by symbol after they merge: `registerUnit`,
`openUnitCreator`, `unitAdded$`, `getConversion`, `SYSTEM_UNITS` in `unit-registry.service.ts`; `save` in
`unit-creator.component.ts`; the constructor `effect`, `onBaseUnitValueChange`, `onUnitSymbolValueChange`,
`onUomValueChange`, `addPurchaseOption`'s `unitSymbol` subscription and the `unitAdded$` subscription in
`product-form.component.ts`; `onUnitChange` and the line cost in `recipe-ingredients-table.component.ts`;
`addUnitFor` in `cook-view.page.ts`; `getRowWeightContributionG` / `computeIngredientCost` in
`recipe-cost.service.ts`; `getPricePerUnit` / `calcBuyPriceGlobal` in `product-price.util.ts`; `onUnitChange` in
`inventory-product-list.component.ts`. If 418's prefill changed how the window opens, keep its behavior and add
product mode on top. Print one line per symbol: `ok` or `conflict: <what>`.

## Design

### 1. One helper that reads a purchase row in base units
New `src/app/core/utils/purchase-option-rate.util.ts`:
`optionRateInBase(product: Pick<Product, 'baseUnit'>, opt: PurchaseOption_, registry: UnitRegistryService): number`
= `opt.conversionRate × registry.getConversion(opt.uom || base) / registry.getConversion(base)`, where `base =
product.baseUnit || 'gram'`; returns `opt.conversionRate` when `uom` is empty or equals `base`. Every reader that
multiplies `conversionRate` today uses it instead: `recipe-cost.service.ts` (`getRowWeightContributionG`,
`computeIngredientCost`), `product-price.util.ts` (`getPricePerUnit`, `calcBuyPriceGlobal`),
`recipe-ingredients-table.component.ts` line cost, `inventory-product-list.component.ts` `onUnitChange`. Because
the row's number now stays relative to its own «:» unit, changing the product's base unit no longer breaks the
rows (problem 3) — no rescaling code needed.

### 2. Unit window in product mode
- `unit-registry.service.ts`: `openUnitCreator(context?: { existingUnitSymbols?: string[]; forProduct?: { name:
  string; baseUnit: string } })`. New `productUnitAdded$ = new Subject<{ key: string; amount: number; basis: string }>()`.
- `registerUnit` with `forProduct` set: same name resolution and "already on this product" refusal as today; then
  - name not in the registry → `taxonomy.add('unit', key, { gramRate })` as today (the schema needs a rate; it is
    only ever used outside products, e.g. a recipe yield unit);
  - name already in the registry → **no** taxonomy write and **no** shortcut: the amount and basis are still required;
  - both → emit `productUnitAdded$ { key, amount, basis }` (and `unitAdded$` for existing listeners), close.
- `unit-creator.component.*`: in product mode the title is `unit_creator_title_for_product` («יחידה חדשה עבור
  {{name}}»), the amount label is `unit_amount_for_product` («כמה שוקלת {{unit}} אחת של {{name}}?»), and the
  basis select defaults to the product's base unit. Without `forProduct` nothing changes.
- New dictionary keys (append): `unit_creator_title_for_product`, `unit_amount_for_product`.

### 3. Callers that add a unit to a product
- **Product form, purchase row «הוסף יחידה חדשה»** (`onUnitSymbolValueChange`): open with `forProduct: { name:
  current product name, baseUnit }`; on `productUnitAdded$` set the row to `{ unitSymbol: key, conversionRate:
  amount, uom: basis }` and recompute its suggested price as today.
- **Product form, purchase row picks an existing unit** (`addPurchaseOption`'s `unitSymbol` subscription): system
  units (`SYSTEM_UNITS` keys) keep the exact pre-fill; any other unit leaves `conversionRate` empty (it is already
  `Validators.required`) and sets `uom` to the base unit, so the chef types this product's number.
- **Recipe line `__add_unit__`** and **cook view `addUnitFor`** for a product: open with `forProduct`; save the
  product option from `productUnitAdded$` (`conversionRate: amount, uom: basis`); drop the shared-rate math
  (`unitFactor / baseFactor`). Non-product rows (sub-recipes) keep today's behavior.
- **INVF-C06:** delete the constructor `effect` that reacts to `isCreatorOpen_` (`product-form.component.ts:279-306`),
  and `activeRowIndex_` / `isBaseUnitMode_` / the `unitAdded$` subscription at `:342` if nothing else needs them.
  One private helper serves the three `NEW_UNIT` handlers (base unit, purchase-row unit, purchase-row «:» unit):
  `private pickNewUnit_(control, previous: string, onAdded: (e) => void)` — clears the control, opens the window,
  then takes the first of `productUnitAdded$` / `unitAdded$` (→ `onAdded`) or the window closing without an add
  (`toObservable(this.unitRegistry.isCreatorOpen_)` filtered to `false` → restore `previous`), with `take(1)` and
  `takeUntilDestroyed(this.destroyRef)`. `previous` is the control's last non-`NEW_UNIT` value.

### 4. Read-only check of existing data
`server/scripts/check-unit-weights.js` (CommonJS, same env loading, targets and "never print a URI" rule as
`server/scripts/check-name-lengths.js`). Prints three sections, one line per hit (`<collection> <_id> <name> …`)
and a count:
- `uom differs` — products with a purchase option whose `uom` is set and differs from `baseUnit` (their costs
  change after this plan);
- `copied from shared` — products with a non-system purchase unit whose `conversionRate` equals the shared
  `gramRate` converted to the product's base unit (likely copied from another product — review them);
- `recipe lines on a unit the product lacks` — recipe/dish ingredient lines whose unit is a non-system unit missing
  from the referenced product's `purchaseOptions` (they fall back to the shared rate; left as is, see Out of Scope).
Exit 0 always (it is a report, not a gate).

## Functional Requirements

### Must Have (P0)
- [ ] One helper reads a purchase row in base units, honoring its «:» unit, used by every reader.
- [ ] Adding a unit to a product anywhere asks that product's amount; an existing unit name never skips it.
- [ ] Choosing an existing custom unit in a purchase row does not pre-fill another product's number.
- [ ] The unit window never writes a number into a unit field; cancel restores the previous unit.
- [ ] Read-only check of existing products and recipe lines, local and Atlas.

### Won't Have (this plan)
- Removing the shared `gramRate` from unit terms (schema change, INV-4/INV-5).
- Changing the fallback for recipe lines whose unit is missing from the product (the check counts them first).
- Rewriting existing product data.

## Atomic Sub-tasks
- [ ] U1: Read every purchase unit in the product's base unit, honoring the unit after the colon — optionRateInBase util + spec; use it in recipe-cost, product-price, ingredients-table line cost, inventory list unit change — src/app/core/utils/purchase-option-rate.util.ts, src/app/core/services/recipe-cost.service.ts, src/app/core/utils/product-price.util.ts, recipe-ingredients-table.component.ts, inventory-product-list.component.ts
- [ ] U2: Let the unit window ask how much one unit of this product weighs, also for an existing unit name — forProduct context, productUnitAdded$, product-mode title and label, two dictionary keys, specs — src/app/core/services/unit-registry.service.ts, src/app/shared/unit-creator/**, public/assets/data/dictionary.json
- [ ] U3: Make the product form use this product's own number for every purchase unit — product-mode add, no shared pre-fill for custom units, pickNewUnit_ replaces the close effect (INVF-C06), specs — src/app/pages/inventory/components/product-form/**
- [ ] U4: Ask the product's own weight when a unit is added from a recipe line or cook view — product mode, save the typed amount, drop the shared-rate math, specs — recipe-ingredients-table.component.ts, cook-view.page.ts and their specs
- [ ] U5: Add a read-only check that lists products and recipe lines the old behavior may have got wrong — three sections, local and Atlas — server/scripts/check-unit-weights.js
- [ ] U6: Build, test, run the local check and hand you the Atlas check and the onion/pickles checks — ng build, the listed specs, log-query, check script on local; Human runs Atlas and the four app checks — this plan file

## Technical Considerations
- Dependencies: `toObservable` from `@angular/core/rxjs-interop` (already used in the app).
- Backend / API: none; one read-only server script.
- Auth and validation: none new; `conversionRate` stays required in the form.
- Security surface: the check script reads `server/.env` through dotenv and never prints secrets; read-only.
- Data / migration: none written. Products whose `uom` differs from `baseUnit` get a different (correct) cost —
  the Atlas check lists them before merge.
- Translation: two new keys in `dictionary.json` (append).
- Project checks: log-query Done-when item added; Hebrew canonical values — unit names keep going through the
  existing `ensureKeyForContext` resolution (`docs/agent/standards-domain.md`).

## Out of Scope
- Recipe lines on a unit the product lacks keep the shared-rate fallback; the check script counts them, and a
  follow-up decides.
- Sub-recipe yield units and units added outside a product (recipe header, AI draft editor, quick-add modal) keep
  today's shared behavior.
- META-C08 (plan 421), SHELL-C15 and INV-C11 (plan 420).
