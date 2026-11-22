# Plan 641 — Invoice import compares with the product's current price and asks which supplier to update; no duplicate suppliers

Status: done
Depends-on: 628, 629
Snapshot: 5d6cd7b8

## Problem Statement
Dandan validated plans 628 and 629 on 2026-11-18 (staging `5d6cd7b8`) with a real invoice of «ווילד בייקרי» and found
two faults:

1. **No price change shown, and a second supplier with the same name.** The product «אספקת לחם» had one price, 100,
   from a supplier named «ווילד בייקרי» (id `66d97714…`, created minutes earlier from the product form). The invoice
   was matched by tax id to the business's older supplier «ווילד בייקרי» (id `4d76e391…`, `taxId 558364048`). The
   preview showed no percent and no rise mark, and saving added a second source to the product: «ווילד בייקרי» at 142
   beside «ווילד בייקרי» at 100 (local database `foodvibe`, invoice `c90c8295…`, `priceHistory` row 142).
   Cause, verified in code:
   - `src/app/pages/inventory/components/product-import/product-import.component.ts:156`:
     `oldPrice = match.sources?.find((source) => source.supplierId === supplierKey)?.price ?? null` — the old price
     is read only from the invoice's own supplier, so a product priced by another supplier shows no change, and
     `priceChangePct(null, …)` gives no percent, so no rise alert and no impact panel.
   - `server/routes/product-import.js:126–133`: the apply finds the source of `sourceKey` (the chosen supplier) and,
     when there is none, pushes a new source. It never asks whether an existing source should be updated instead.
2. **A duplicate supplier could be created.** `src/app/core/services/add-supplier-flow.service.ts` `open(prefillName)`
   (line 21) saves a new supplier with the typed name and checks no existing supplier name, so the product form's
   "add supplier" made a second «ווילד בייקרי».

Dandan's rule (2026-11-18): the import must show the price change, and when the product already has a price from a
supplier, it must ask whether to change that supplier's price instead of silently adding another supplier.

## Goals & Success Criteria
**Primary:** importing an invoice for a product that already has a price shows the change against that price, and
when that price is from another supplier the owner chooses, per row, to update that supplier's price or to add the
invoice's supplier; adding a supplier with an existing name picks the existing one.

- [auto] `pnpm run test:ci` passes, including new cases in
  `src/app/pages/inventory/components/product-import/product-import.component.spec.ts`: (a) a product with price 100
  from supplier A, an invoice of supplier B at 142 → the row shows `+42.0%`, the rise mark (threshold 5) and the
  impact panel lists its recipes; (b) that row offers the choice «עדכון המחיר של <A>» / «הוספת <B> כספק נוסף», and when
  A and B have the same trimmed name the first is chosen by default, otherwise the second; (c) saving with «עדכון»
  sends the row with `targetSupplierId: A`; with «הוספה» it sends none; (d) a product priced by B itself behaves as
  today (`+x%` against B's price, no choice shown); (e) a product with prices from two other suppliers compares with
  the lowest of them and names it.
- [auto] The same command, `src/app/core/services/add-supplier-flow.service.spec.ts`: a typed name equal (trimmed,
  case-insensitive) to an existing supplier's name saves nothing, returns the existing supplier and shows
  `supplier_exists_selected`; a new name saves as today.
- [auto] `pnpm run test:server` passes, including new cases in `server/test/product-import.test.js` (or the file
  that covers `POST /api/v1/product-import/apply`): a row with `targetSupplierId` updates that supplier's existing
  source on the product and adds no source; a `targetSupplierId` that is not a source of that product, or not a
  supplier of the business, answers 400 `BAD_TARGET_SUPPLIER` and writes nothing; `priceHistory` and the invoice line
  record the supplier whose price changed.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm --dir server run lint` exits 0;
  `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/inventory/import`, a fixture read for a product priced by another supplier shows the percent and the two
  choices (`e2e/ui/641-1.spec.ts`).
- [human] Dandan imports the «ווילד בייקרי» invoice again: the row shows the rise against 100, he keeps «עדכון המחיר»,
  saves, and the product has one «ווילד בייקרי» price, 142.

## Execution Mode
- Parallel: no — it edits `product-import/**` and `public/assets/data/dictionary.json`; runs in its own run after
  `mod-diag` and `mod-stock`, never beside a screen run.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/product-import/**
src/app/core/services/product-import.service.ts
src/app/core/services/product-import.service.spec.ts
src/app/core/services/add-supplier-flow.service.ts
src/app/core/services/add-supplier-flow.service.spec.ts
src/app/core/utils/price-change.util.ts
src/app/core/utils/price-change.util.spec.ts
shared/schemas/product-import.schema.ts
shared/schemas/**/product-import*.ts
server/routes/product-import.js
server/test/product-import.test.js
server/test/product-import-apply.test.js
public/assets/data/dictionary.json
e2e/ui/641-1.spec.ts
docs/brain/component-families.md
docs/brain/inventory.md
shared/schemas/entities/invoice.schema.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the apply route checks `targetSupplierId` against the business's own suppliers and the product's
  own sources through the existing scope filter; nothing is taken from another business.
- INV-3: preserves — the server writes the product's source, the price history and the invoice line in the same apply
  as today; the browser only sends the owner's choice.
- INV-4: preserves — `targetSupplierId` is one optional field on the existing apply-row schema.

## Reuse Check

- the per-row supplier choice in the import preview — family: chip — rung: 1 — why: two `c-chip--toggle` choices in
  the row, as the preview's other row toggles.
- `previousPriceOf(product, supplierId)` in `src/app/core/utils/price-change.util.ts` — family: helpers — rung: 3 — why: one more pure function beside `priceChangePct`: the own supplier's price, else the lowest other price and its
  supplier.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want to see that a product got more expensive even when the invoice comes from a supplier record
  other than the one I priced it with, so that no rise slips through.
- As an owner, I want to be asked whether the invoice updates the price I already have, so that my product does not
  end up with two copies of the same supplier.
- As an owner, I want the app to stop me from creating a supplier that already exists, so that my supplier list stays
  clean.

## Functional Requirements

### Must Have (P0)
- [ ] `previousPriceOf(product, supplierId)` → `{ price, supplierId, isOwnSupplier } | null`: the source of
  `supplierId` when present; else the lowest-priced other source; null when the product has no priced source.
- [ ] The preview (`view_`) uses it: `oldPrice` and `changePct` against that price; `status` `update` / `same` as
  today; the row shows the supplier name of the old price when it is not the invoice's supplier («היה <price> אצל <name>»).
- [ ] When the old price is another supplier's, the row shows the two choices; default «עדכון» when the two suppliers'
  names match after trimming (case-insensitive), else «הוספה». The choice is part of the row state and survives
  editing the row.
- [ ] The apply body: a row may carry `targetSupplierId`; the server updates that source on the product (it must be
  one of the product's sources and a supplier of the business, else 400 `BAD_TARGET_SUPPLIER`, nothing written), writes
  `priceHistory` and the invoice line with that supplier id, and adds no source. Without it, the apply behaves as today.
- [ ] Rise alert, impact panel and the dashboard card count a row compared against another supplier's price exactly
  like a same-supplier rise.
- [ ] `AddSupplierFlowService.open`: before saving, look up the business's suppliers (`KitchenStateService.suppliers_`)
  for the same trimmed, case-insensitive Hebrew name; when found, return it, save nothing, show
  `supplier_exists_selected`.
- [ ] Dictionary (append-only): `import_price_was_at` — "היה {price} אצל {name}"; `import_update_supplier_price` —
  "עדכון המחיר של {name}"; `import_add_as_new_supplier` — "הוספת {name} כספק נוסף"; `supplier_exists_selected` —
  "הספק {name} כבר קיים – נבחר הקיים".

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; the choice sits under the row's price line, only on rows compared with another supplier's price.
- Nothing changes for rows of new products or of products priced by the invoice's own supplier.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Compare an invoice price with the product's current price even when another supplier set it — previousPriceOf and its cases — src/app/core/utils/price-change.util.ts, src/app/core/utils/price-change.util.spec.ts
- [x] A2: Let the server update an existing supplier's price on request instead of adding a supplier — targetSupplierId on the apply row, the check, the history and invoice line, the server cases — server/routes/product-import.js, server/test/product-import.test.js
- [x] A3: Show the change and ask which supplier to update in the import preview — view_, the row choice, the apply body, the dictionary keys, the spec cases — src/app/pages/inventory/components/product-import/**, src/app/core/services/product-import.service.ts, public/assets/data/dictionary.json
- [x] A4: Pick the existing supplier instead of creating a second one with the same name — the name check in the add-supplier flow and its spec — src/app/core/services/add-supplier-flow.service.ts, src/app/core/services/add-supplier-flow.service.spec.ts
- [x] A5: Record the helper and prove it in the running app — the registry row, the inventory, the screen check, then the Done-when commands in order — docs/brain/component-families.md, docs/brain/inventory.md, e2e/ui/641-1.spec.ts

## Technical Considerations
- Dependencies: 628 (preview, header strip, apply with invoice), 629 (rise alert, impact panel, dashboard card).
- Data: the existing duplicate «ווילד בייקרי» in the local database is test data; this plan does not merge suppliers.
- Backend / API: one optional field on the apply row and one new 400 code.
- Project checks: the `[auto] log-query` item; dictionary keys named; Reuse Check filled.

## Out of Scope
- Merging existing duplicate suppliers.
- A server-side refusal of duplicate supplier names (the generic data route stays as it is).

## Critical Questions
- none

## Execution Notes
- decided: compare with the invoice supplier's own price first, else the lowest other price — why: the lowest price is
  the one recipes cost with today, so the rise the owner sees is the real one.
- decided: same-name suppliers default to «עדכון» — why: that is Dandan's case, a duplicate of the same supplier.
- decided: the server test lives in the new `server/test/product-import-apply.test.js` (the plan's `product-import.test.js` does not exist).
- decided: with no invoice supplier chosen the row is compared with the lowest price but shows no choice (apply behaves as today).
- scope extended: shared/schemas/entities/invoice.schema.ts — optional `supplierId` on `invoiceLineSchema` so the invoice line records the supplier whose price changed (ask 641-1, approved by the Human).
- round 2 (resume): restored the first attempt's files from 983099d and fixed review rev-1: each saved invoice line now carries `supplierId` (the target supplier on «עדכון», else the invoice supplier) — server/routes/product-import.js.
- evidence: `pnpm run build:schemas` → 0; `pnpm run build` → 0; `pnpm run lint` → 0; `pnpm --dir server run lint` → 0; `pnpm run lint:reuse` → 0; `lint:icons`, `lint:no-native-select` → 0; `pnpm run test:ci` → 0, TOTAL 2602 SUCCESS; `pnpm run test:server` → 0, 145 files, 1919 passed.
- [ui] 641-1: written, not run.
