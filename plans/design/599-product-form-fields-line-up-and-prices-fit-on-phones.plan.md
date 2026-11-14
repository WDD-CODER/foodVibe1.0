# Plan 599 — Product form fields line up on desktop and inventory prices fit on phones

Status: draft
Track: design
Depends-on: none
Snapshot: afc44e92a6feab13662761f19e5456c724d13fc3

## Problem Statement

Two high findings from the full Style QA run of 2026-11-14, both on the inventory screens:

1. **Product form, desktop (V3-07412591, V3-580e81b8).** On `/inventory/add` and `/inventory/edit/:id` at 1366px the
   mandatory section (`.form-section--mandatory` in
   `src/app/pages/inventory/components/product-form/product-form.component.scss`) uses
   `grid-template-columns: repeat(auto-fit, minmax(120px, 1fr))` with `grid-auto-flow: dense`. In the ~640px card that
   makes four columns: name and category on the right, an empty cell held by `<app-product-price-lock>` (its
   `:empty { display: none }` rule exists only inside the ≤620px media block), the purchase price alone on the far left,
   and the base unit dropped alone onto the next row.
2. **Inventory list, phone (V6-d422e36e).** On `/inventory/list` at 375px the price column is cut: 100.85 shows as
   "100.8", 37.80 as "37.8". The list's phone grid is `[mobileGridTemplate]="'2fr 1.8fr 0.8fr 40px 28px'"`
   (`inventory-product-list.component.html`); 0.8fr is about 60px, narrower than a price with its "₪" suffix, and the
   centred cell (`.col-price-readonly { justify-content: center }`) spills under the category column.

## Goals & Success Criteria
**Primary:** on desktop the product form's mandatory fields sit in two even columns — name and category on the first row, purchase price and base unit on the second — with no empty cell. at 375px every inventory price, including the longest on the first page, shows all its digits and the "₪".

Done when:
- [human] Nothing else moved: the phone layout of the product form (already two columns) and the desktop inventory list are unchanged.
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [ui] At 1366x768 on `/inventory/add` signed in, the purchase-price field and the base-unit field have the same top
  (±4px), and the name field and the price field have the same width (±4px) — `e2e/ui/599-1.spec.ts`, screenshot
  `screens/599-1.png`
- [ui] At 375x812 on `/inventory/list` signed in, for each of the first 8 rows the `.col-price-readonly` cell's
  `scrollWidth` is not larger than its `clientWidth`, and its box does not overlap the category cell's box —
  `e2e/ui/599-2.spec.ts`, screenshot `screens/599-2.png`
- [human] Open "add product" on a desktop window and the inventory list on a phone-sized window: the form looks tidy in
  two columns, and every price on the list is whole.

## Execution Mode

- Parallel: yes — no other open plan writes these two components.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/product-form/product-form.component.scss
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss
e2e/ui/599-1.spec.ts
e2e/ui/599-2.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — stylesheet and one template input change on two inventory components; no server, schema,
  ownership or AI path is touched.

## Reuse Check

- none — no new component, util, pipe, service or `.c-*` class; the list keeps `app-list-shell`'s existing
  `mobileGridTemplate` input.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef adding a product at my desk, I want the price next to its unit so that I fill the form in a natural order.
- As a chef checking stock on my phone, I want to read every price in full so that I never misread 100.85 as 100.8.

## Functional Requirements

### Must Have (P0)
- [ ] Product form: `.form-container .form-section.form-section--mandatory` uses `repeat(2, minmax(0, 1fr))` at every
  width (the column rule moves out of the ≤620px block). At every width `app-product-price-lock` spans the full row and
  `app-product-price-lock:empty { display: none }` applies. Name and category (`> :nth-child(-n + 2)`) span the full
  row on phones only (that rule stays inside the ≤620px block); on desktop they share the first row, one column each.
- [ ] Inventory list: change the phone template to give the price column a floor that fits "100.85 ₪" at `--fs-base`,
  e.g. `'2fr 1.6fr minmax(4.75rem, auto) 40px 28px'`; the Worker checks the longest price on the first page at 375px
  and 320px and adjusts the floor if needed.
- [ ] `.col-price-readonly` at ≤620px: `justify-content: flex-start` (right-aligned in RTL, next to the category) and
  `min-inline-size: 0`, so a long value never spills into the neighbouring cell.

### Should Have (P1)
- [ ] At 320px the price still shows in full; if it cannot, the category column narrows first (it already truncates).

## UI/UX Notes

- RTL: "start" is the right side; logical properties only.
- Numbers keep `font-variant-numeric: tabular-nums`.

## Atomic Sub-tasks

- [ ] 599-A1: Lay out the product form's required fields in two even columns on desktop with no empty cell — mandatory grid out of the phone block, price-lock hidden when empty at all widths — src/app/pages/inventory/components/product-form/product-form.component.scss
- [ ] 599-A2: Give the inventory price column enough room on phones that every price shows in full — mobileGridTemplate price floor — src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html
- [ ] 599-A3: Keep a long price inside its own cell instead of spilling under the category — .col-price-readonly phone alignment — src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss
- [ ] 599-A4: Prove the desktop form rows line up and the phone prices are whole — e2e/ui/599-1.spec.ts, e2e/ui/599-2.spec.ts

## Technical Considerations

- `minmax(0, 1fr)` columns stop long Hebrew labels from widening one column.
- Backend / API impact: none. Auth: none. Security surface: none. Data / migration: none.

## Out of Scope

- The product form's purchase-unit and optional sections.
- The desktop inventory list grid.
- Equipment, supplier and venue forms (their layouts were not flagged).

## Critical Questions

- none

## Execution Notes
