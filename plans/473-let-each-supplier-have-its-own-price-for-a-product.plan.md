# Plan 473 — Let each supplier have its own price for a product

Status: draft
Track: code
Depends-on: none
Snapshot: 2d91fb2bb7830b12d590f56dcbefbd00359ae7b9

## Problem Statement
Handoff B5 (`docs/mvp/review-handoff-2026-10-21.md`, Source #50). The data already holds one price per supplier
(`Product.sources: { supplierId, price }[]`, `src/app/core/models/product.model.ts:20-31`), but nothing lets the chef
enter different prices, and five places overwrite every supplier with one price:

- Product form: one price box (`buy_price_global_`, `product-form.component.ts:348`, `.html:70`); save copies it to
  every selected supplier (`product-form.component.ts:923-940`).
- Quick-edit panel: same copy (`quick-edit-product-panel.component.ts:173-183`).
- Inventory list: inline price edit (`inventory-product-list.component.ts:815`) and unit change (`:751`) write one price
  to every source; bulk supplier change (`:799`) replaces all sources with one source at the lowest price.

Two separate pickers decide "the price": `getEffectivePrice` (`src/app/core/utils/product-source.util.ts:7-11`, lowest
price, no supplier) used by recipe cost, the recipe builder, exports and the inventory list; and `chooseSupplier`
(`src/app/core/engine/supplier-choice.ts:12-26`, cheapest supplier + price) used by the event engine and supplier orders.
They can disagree (a no-supplier source counts in one, not the other).

This plan is part 1 of 2. Plan 510 adds the chef's supplier choice in the recipe builder and the "cheaper elsewhere"
hint in supplier orders, on top of the one price rule built here.

## Goals & Success Criteria
- Primary: each supplier of a product keeps its own price, entered in the product form, and every cost in the app
  uses the same rule — the cheapest priced supplier.
- [ ] [human] Onion with suppliers David (4 ₪) and Grocery (5 ₪): both prices save; reopening the form shows both.
- [ ] [human] Adding a third supplier to that onion pre-fills its price box with 4 ₪ (the first supplier's price); the
      chef can change it before saving.
- [ ] [human] A new product with no price: adding the first supplier shows an empty price box with «ממתין למחיר»
      ("waiting for price"); the product still shows the «לא סגור סופית» mark in the inventory list.
- [ ] [human] A recipe using 1 kg of that onion costs it at 4 ₪ in the recipe builder; the event supplier orders put
      the onion on David's card.
- [ ] [human] Inventory list: hovering the onion's price shows both supplier prices; editing the price inline on a
      product with 2 suppliers opens the product form instead of overwriting both.
- [ ] [auto] `npx ng build` passes.
- [ ] [auto] `npx ng test --watch=false` passes, including the new specs for the price rule and the price rows.
- [ ] [auto] `git diff --numstat origin/main -- src/app/pages/inventory/components/product-form/product-form.component.ts`
      shows added ≤ removed (growth-frozen file, `_shared/tech-stack.md`).
- [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no. Do not run alongside 499, 500, 501 or 502 — they share the product form, recipe ingredients table and
  quick-edit panel. Run 473 before 510.

## Execution Notes
- Base branch `main` (the mvp branches are all merged; the old "base origin/mvp" note is retired).
- Decisions (Human, 2026-10-29): cost default is the cheapest priced supplier; a newly added supplier copies the first
  supplier's price and stays editable; supplier prices stay owner-only money fields (already true: `MONEY_FIELDS.products`
  covers `sources[].price`, `shared/schemas/money-fields.ts:7`).
- `product-form.component.ts` is growth-frozen (net ≤ 0): the price rows go into a new child component, and the old
  copy-to-all save code is removed from the form.
- `purchaseOptions[].priceOverride` keeps winning over source prices where it does today; not changed here.
- The legacy shim (`product-data.service.ts:47-57`, `buy_price_global_` → same price for all suppliers) stays as is.

## Reuse Check
- One price rule — family: helpers — rung: 2 — why: extend `chooseSupplier` in `src/app/core/engine/supplier-choice.ts`; `getEffectivePrice` becomes a thin wrapper over it so every reader shares one rule
- Supplier price rows in the product form — family: form-field — rung: 4 — why: no list-of-labelled-money-inputs component exists; new `supplier-prices` child built from `app-form-field` rows because the product form is growth-frozen
- Supplier chips — family: multi-pick — rung: 1 — why: keep the existing supplier chip select as is
- Per-supplier tooltip in the inventory list — family: chip — rung: 1 — why: reuse the existing price-cell tooltip, add lines only

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/engine/supplier-choice.ts
src/app/core/engine/supplier-choice.spec.ts
src/app/core/utils/product-source.util.ts
src/app/core/utils/product-source.util.spec.ts
src/app/pages/inventory/components/product-form/**
src/app/pages/inventory/components/inventory-product-list/**
src/app/shared/quick-edit-product-panel/**
```

## Read Scope

Entire repo.

## Escalation Protocol

If a Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and
why; offer `approved: <path>`; then append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — supplier prices already are owner-only money fields; no permission file changes.
- INV-2: preserves — no tenancy or master-sync change; master sync already merges sources by supplierId.
- INV-3: preserves — no cascade or rename.
- INV-4: preserves — no schema change; `sources[]` already has a price per supplier.
- INV-5: preserves — no taxonomy change.
- INV-6: preserves — no AI call.

## Backend Impact
- None. Prices are written through the existing generic product route; the server does not compute costs.
- Security surface: none new — the money-field check already compares each supplier's price row by `supplierId`.
- Data / migration: none. Existing products whose suppliers share one price simply show that price on each row.

## Step 0 — Reality Check
Before S1: grep `getEffectivePrice` and `chooseSupplier` on main and confirm the reader list in the Problem Statement
(recipe-cost.service.ts:352, recipe-ingredients-table.component.ts:629, product-price.util.ts:19,
kitchen-state.service.ts:141, event-plan.engine.ts:75-92, supplier-orders.util.ts). Record any new reader in Execution
Notes; readers outside scope keep working because only the helpers' internals change.

## User Stories
- As a chef, I enter each supplier's own price for a product so that my costs use the cheapest real price.
- As a chef, I add a second supplier and get the first price pre-filled, so I only type when it differs.

## Functional Requirements

### Must Have (P0)
- [ ] One price row per selected supplier in the product form (supplier name, price, per base unit).
- [ ] First supplier gets the product's existing price, or an empty «ממתין למחיר» box; each later supplier copies the
      first row's price; every row is editable; removing a supplier removes its row.
- [ ] One price rule everywhere: cheapest priced supplier; with no priced supplier, the no-supplier price; else none.
- [ ] No screen overwrites all suppliers with one price any more.
- [ ] Inventory list price tooltip lists each supplier's price.

## UI/UX Notes
- 0 suppliers: the form keeps today's single price box.
- 1+ suppliers: the single box is replaced by the supplier price rows under the supplier chips, in chip order; the
  cheapest row shows a small «הזול ביותר» chip.
- Hebrew strings via `translatePipe` + `dictionary.json` (append only): «ממתין למחיר», «הזול ביותר», «מחיר לפי ספק».

## Atomic Sub-tasks
- [ ] S1: Make one shared rule pick a product's price, so recipes, events and lists never disagree — chooseSupplier stays the cheapest priced supplier; getEffectivePrice returns chooseSupplier's price, then buy_price_global_, then 0; specs for ties, zero prices and the no-supplier source — src/app/core/engine/supplier-choice.ts, src/app/core/utils/product-source.util.ts, their specs
- [ ] S2: Add a price row for each supplier in the product form, pre-filled from the first supplier — new supplier-prices child component (inputs: suppliers, prices; output: prices changed), with spec; first row = existing price or empty «ממתין למחיר», later rows copy row 1 — src/app/pages/inventory/components/product-form/supplier-prices/**
- [ ] S3: Save each supplier's own price instead of copying one price to all — wire the child into the form, build sources from the rows, remove the copy-to-all code; product-form.component.ts net lines ≤ 0 — src/app/pages/inventory/components/product-form/**
- [ ] S4: Stop the quick-edit panel from overwriting every supplier with one price — with 2+ suppliers show the per-supplier rows (reuse S2's component) or open the full form — src/app/shared/quick-edit-product-panel/**
- [ ] S5: Stop inventory-list edits from wiping per-supplier prices — inline price and unit change edit in place only for 0–1 supplier, else open the form; bulk supplier change keeps each kept supplier's price and gives a new one the cheapest price — src/app/pages/inventory/components/inventory-product-list/**
- [ ] S6: Show every supplier's price in the inventory list tooltip so the chef sees who is cheaper — src/app/pages/inventory/components/inventory-product-list/**
- [ ] S7: Run the full checks and paste the output — ng build, headless ng test, the frozen-file numstat, log-query — Execution Notes

## Technical Considerations
- Prices are per base unit (`ProductSource.price`); the rows show the base unit next to each box.
- A source with `supplierId: ''` (no supplier) is replaced by the supplier rows once a supplier is added, carrying its
  price into row 1.

## Out of Scope
- The chef choosing a supplier per product in the recipe builder, and the "cheaper elsewhere" hint in supplier
  orders — plan 510.
- Preferred-supplier logic inside the price rule — plan 510.
- `purchaseOptions[].priceOverride` behaviour, product import, master sync, exports' layout.

## Critical Questions
- Answered 2026-10-29 (Human): D2 copy the first price to new suppliers; D3 prices owner-only; split into 473 + 510;
  base `main`.
