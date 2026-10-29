# Plan 510 — Let the chef pick a product's supplier and see when another is cheaper

Status: draft
Track: code
Depends-on: 473
Snapshot: 2d91fb2bb7830b12d590f56dcbefbd00359ae7b9

## Problem Statement
Part 2 of the per-supplier price work (handoff B5, D5). After plan 473 each supplier has its own price and every cost
uses the cheapest one. The chef still cannot say "I buy onions from David" — today the price rule
(`chooseSupplier`, `src/app/core/engine/supplier-choice.ts:12-26`) always picks the cheapest, nothing stores a chosen
supplier (no `preferredSupplierId` anywhere; recipe lines have no supplier, `src/app/core/models/ingredient.model.ts:1-10`),
and the event supplier orders (`src/app/pages/menu-intelligence/components/supplier-orders/`,
`src/app/core/utils/supplier-orders.util.ts:60-92`) never say that an item is cheaper at another supplier.

## Goals & Success Criteria
- Primary: from the recipe builder the owner picks which supplier a product comes from (default: cheapest), and the
  event supplier orders show when another supplier sells it for less.
- [ ] [human] Recipe builder, onion line (David 4 ₪, Grocery 5 ₪): a truck icon shows; clicking it lists «דוד» 4 ₪
      marked «הזול ביותר» (checked, automatic) and «מכולת» 5 ₪.
- [ ] [human] Picking «מכולת» changes that line's cost to the 5 ₪ price at once; reopening the recipe keeps it; a
      different recipe using onion also costs it at 5 ₪ (the choice belongs to the product).
- [ ] [human] Choosing «הזול ביותר (אוטומטי)» goes back to the cheapest supplier.
- [ ] [human] A product with only one priced supplier shows no truck icon.
- [ ] [human] Event supplier orders: onion sits on Grocery's card with the line hint «זול יותר אצל דוד: ₪4 (חיסכון ₪N)»
      and the card shows the total possible saving; nothing moves on click (information only).
- [ ] [human] Logged in as staff: the truck icon shows the current supplier but the list cannot be changed.
- [ ] [human] Product form: the chosen supplier's price row shows «נבחר».
- [ ] [auto] `npx ng build` passes.
- [ ] [auto] `npx ng test --watch=false` passes, including new specs for the price rule with a chosen supplier and for
      the cheaper-elsewhere hint.
- [ ] [auto] `npm test --prefix server` passes, including a permissions test that staff cannot change
      `preferredSupplierId`.
- [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no. Runs after 473 merges. Do not run alongside 499, 500 or 502 (they share the recipe ingredients table).

## Execution Notes
- Base branch `main`.
- Decisions (Human, 2026-10-29): D1 the choice is stored on the product, not per recipe line, so one event never buys
  the same product from two suppliers; D3 owner only — `preferredSupplierId` becomes a money field; D4 the order hint
  is information only, no switch button.
- The choice falls back to the cheapest when the chosen supplier has no price or was removed from the product, so a
  stale `preferredSupplierId` never breaks a cost (no cleanup on supplier delete needed).
- `recipe-builder.page.ts` and `menu-intelligence.page.ts` are growth-frozen: do not touch them; all new UI lives in
  child components.

## Reuse Check
- Price rule with a chosen supplier — family: helpers — rung: 2 — why: extend `chooseSupplier` (made the single rule by plan 473) with the product's `preferredSupplierId`
- Cheaper-elsewhere calculation — family: event-plan — rung: 2 — why: add a pure helper next to `buildSupplierOrders` in `supplier-orders.util.ts`; the engine and plan snapshot stay as they are
- Supplier picker in the recipe line — family: chip — rung: 4 — why: no small "pick one of a product's suppliers" popover exists; new `supplier-picker` child inside the recipe ingredients table, using the existing popover styling of `partial-cost-badge`
- Read-only for staff — family: edit-gate — rung: 1 — why: reuse `PermissionService` `editMoney` as the gate
- Saving the choice — family: entity-data-service — rung: 1 — why: save through the existing product data service

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/product.schema.ts
shared/schemas/money-fields.ts
src/app/core/models/product.model.ts
src/app/core/engine/supplier-choice.ts
src/app/core/engine/supplier-choice.spec.ts
src/app/core/utils/supplier-orders.util.ts
src/app/core/utils/supplier-orders.util.spec.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/**
src/app/pages/menu-intelligence/components/supplier-orders/**
src/app/pages/inventory/components/product-form/supplier-prices/**
server/test/permissions.test.js
```

## Read Scope

Entire repo.

## Escalation Protocol

If a Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and
why; offer `approved: <path>`; then append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — staff still never change money fields; `preferredSupplierId` is added to `MONEY_FIELDS.products`
  so the existing `editMoney` check covers it; `server/utils/permissions.js` is not edited.
- INV-2: preserves — the choice is a business's own product edit; master sync already never overwrites a changed item.
- INV-3: preserves — one product write per choice; no cascade.
- INV-4: preserves — the new optional field is defined once in `shared/schemas/entities/product.schema.ts` and the
  server validates it like every other product field.
- INV-5: preserves — no taxonomy change.
- INV-6: preserves — no AI call.

## Backend Impact
- Schema: `preferredSupplierId: z.string().optional()` on products. No route change; generic CRUD saves it.
- Auth: owner-only through `MONEY_FIELDS` (`moneySignature` handles a plain path; a staff-created product has it
  stripped like other money fields).
- Data / migration: none — absent means "cheapest".
- Security surface: one more owner-only field; covered by the new permissions test.

## Step 0 — Reality Check
Confirm plan 473 is merged (`chooseSupplier` is the single rule and `getEffectivePrice` wraps it). Confirm how
`moneySignature` (`server/utils/permissions.js:130-136`) treats a plain string path, and how staff-created products
strip money fields (grep `MONEY_FIELDS` in `server/`). Record findings in Execution Notes.

## User Stories
- As an owner, I pick the supplier I really buy onions from, right where I build the recipe, so its cost is true.
- As an owner, I see on the event's supplier orders when an item is cheaper elsewhere, so I can decide to change.

## Functional Requirements

### Must Have (P0)
- [ ] Product field `preferredSupplierId` (optional, owner-only).
- [ ] Price rule: the chosen supplier's price when it has one, else the cheapest priced supplier.
- [ ] Recipe builder: supplier icon on lines whose product has 2+ priced suppliers; picker lists name + price per base
      unit, cheapest marked, current choice checked, an «הזול ביותר (אוטומטי)» option clears the choice.
- [ ] Supplier orders: per-line hint and per-card total saving when a cheaper priced supplier exists.
- [ ] Product form price rows mark the chosen supplier.

## UI/UX Notes
- Icon: Lucide `truck`, in the ingredient line next to the cost cell; tooltip shows the current supplier's name.
- Picker: small popover, one row per priced supplier (name, ₪ per base unit), radio-style check; closes on pick.
- Hint: one muted line under the item in the supplier card; card footer «אפשר לחסוך ₪N אצל ספקים אחרים».
- Hebrew strings via `translatePipe` + `dictionary.json` (append only).

## Atomic Sub-tasks
- [ ] P1: Let a product remember which supplier the owner buys it from, owner-only — optional preferredSupplierId in the product schema and model; add it to MONEY_FIELDS.products; server permissions test that staff cannot change it — shared/schemas/entities/product.schema.ts, shared/schemas/money-fields.ts, src/app/core/models/product.model.ts, server/test/permissions.test.js
- [ ] P2: Make the price rule use the chosen supplier and fall back to the cheapest — chooseSupplier honours preferredSupplierId when that source is priced; specs for chosen, chosen-unpriced and chosen-removed — src/app/core/engine/supplier-choice.ts, src/app/core/engine/supplier-choice.spec.ts
- [ ] P3: Add a supplier icon to recipe lines so the owner can pick whose price to use — new supplier-picker child (inputs: product, can edit; output: picked supplier or automatic), with spec; saves the product through the product data service; read-only for staff — src/app/pages/recipe-builder/components/recipe-ingredients-table/**
- [ ] P4: Show in the event supplier orders when an item is cheaper at another supplier — pure helper beside buildSupplierOrders returning cheaper supplier, price and saving per line and per card, with spec; render the line hint and card total — src/app/core/utils/supplier-orders.util.ts, its spec, src/app/pages/menu-intelligence/components/supplier-orders/**
- [ ] P5: Mark the chosen supplier in the product form's price rows — src/app/pages/inventory/components/product-form/supplier-prices/**
- [ ] P6: Run the full checks and paste the output — ng build, headless ng test, server tests, log-query — Execution Notes

## Technical Considerations
- The saving per line = (chosen price − cheapest price) × the line's quantity in base units (`RawLine.buyQty`).
- Changing the choice re-costs every recipe using that product through the existing product signal; the Worker
  confirms the recipe builder line updates without a reload.

## Out of Scope
- A per-recipe-line supplier choice (rejected, D1).
- A "switch to the cheaper supplier" button in supplier orders (D4: information only for now).
- "Last bought" or other smarter rules; changing frozen event snapshots.
- Per-supplier prices themselves — plan 473.

## Critical Questions
- Answered 2026-10-29 (Human): D1 product-level choice; D3 owner only; D4 information only; split from 473.
