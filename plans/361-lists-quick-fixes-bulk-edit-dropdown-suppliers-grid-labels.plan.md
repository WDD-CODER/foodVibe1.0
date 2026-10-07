# Plan 361 — Lists quick fixes: bulk-edit dropdown clipped, suppliers table grid and labels

Status: draft
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Two bugs and some missing labels in the list pages:

- **The bulk-edit dropdown is cut off.** The multi-select bar's dropdowns (`app-selection-bar` → `app-custom-select` "change field" / "select value") disappear "behind the table". `.selection-bar-area` in `src/app/shared/list-shell/list-shell.component.scss` (~L44) has `overflow: hidden`, which clips the absolutely positioned `.c-dropdown` hanging below the bar. This is clipping, not z-index. The bar's own `slideInOut` animation already sets overflow during enter and leave, so the parent's rule isn't needed.
- **Suppliers table breaks on desktop.** The `gridTemplate` in `supplier-list.component.html:4` defines 8 columns (`'2fr 0.8fr 1fr minmax(48px, 0.8fr) 0.8fr 0.8fr 80px auto'`), but every row and the header produce 9 cells: name, min-order, 5 carousel slides (contact, phone, delivery, lead, linked; `display:contents` on desktop), actions, select. Each row spills into the next.
- **Raw keys on screen.** `min_order`, `no_suppliers_match` and `supplier_in_use_cannot_delete` are missing from `public/assets/data/dictionary.json`, so the raw keys show. The min-order cell renders a bare number (`{{ item.minOrderMov }}`, ~L113).
- **Mobile overlap.** Only `col-min-order` sits outside the carousel on mobile (`mobileGridTemplate '2fr 0.6fr 1fr 40px 28px'`), which crowds the row.

## Goals & Success Criteria

- Primary: bulk-edit dropdowns open fully visible over the table, in inventory, recipe-book, suppliers and equipment.
- Primary: the suppliers table aligns on desktop. On mobile it shows only name + carousel + actions + select.
- Success: no raw `min_order` / `no_suppliers_match` / `supplier_in_use_cannot_delete` text anywhere.

## Execution Mode

- Parallel: no. Run before plans 339, 341 and 349 (they touch list-shell and supplier-list).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/list-shell/list-shell.component.scss
src/app/pages/suppliers/components/supplier-list/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef bulk-editing items, I want the field and value dropdowns fully visible.
- As a chef, I want the suppliers table to line up and show Hebrew labels.

## Functional Requirements

### Must Have (P0)
- [ ] Remove `overflow: hidden` from `.selection-bar-area` (`list-shell.component.scss` ~L44). If the dropdown still renders under `.table-area`, add `position:relative; z-index:20` to `.selection-bar-area`.
- [ ] Suppliers desktop grid: 9 tracks, e.g. `'2fr 0.8fr 1fr 1fr minmax(48px, 0.8fr) 0.8fr 0.8fr 80px auto'`. Header and body cells must match in count and order.
- [ ] Suppliers mobile: move min-order into the carousel. Add `col-min-order` as the first `carouselHeaderColumn` (`label="min_order"`) and the first `cellCarouselSlide`, remove the standalone min-order header and body cells on mobile, and set `mobileGridTemplate` to `'2fr 1fr 40px 28px'`. Desktop keeps 9 visible cells (the carousel is `display:contents`).
- [ ] Min-order cell shows `₪{{ value }}`, or "—" when empty or 0.
- [ ] Dictionary (append): `min_order` = "מינימום הזמנה", `no_suppliers_match` = "לא נמצאו ספקים תואמים", `supplier_in_use_cannot_delete` = "הספק מקושר למוצרים. למחוק בכל זאת?"

### Should Have (P1)
- [ ] `.page-title` in `supplier-list.component.scss` uses the same tokens as the other lists (`var(--fs-xl)`, `var(--fw-bold)`, `var(--tracking-tight)`). Remove the leftover `padding-inline-end` at ≤620px.

### Nice to Have (P2)
- None.

## UI/UX Notes

- RTL: the carousel's first slide is min-order.
- No visual change to the selection bar other than the dropdown being visible.

## Atomic Sub-tasks

- [x] A1: Remove `.selection-bar-area` overflow; verify the bulk-edit dropdown in all 4 lists (`list-shell.component.scss`).
- [x] A2: Suppliers 9-track desktop grid (`supplier-list/**`).
- [x] A3: Min-order into the carousel; mobile grid `'2fr 1fr 40px 28px'`; ₪ formatting (`supplier-list/**`).
- [x] A4: Dictionary keys; title tokens (P1) (`dictionary.json`, `supplier-list.component.scss`).
- [ ] A5: Build, specs, check at 360px and 1280px. Update session-state.

## Technical Considerations

- Dependencies: `ListShellComponent`, `SelectionBarComponent`, `CustomSelectComponent`, `SupplierListComponent`, the current `CarouselHeaderComponent` / `CellCarouselComponent` (plan 349 replaces them later; keep this change compatible).
- New files: none.
- Model changes: none.

## Out of Scope

- Supplier inline edit (plan 341 removes it).
- Supplier delete behavior (plan 366).
- Sortable supplier columns.

## Critical Questions

- Min-order with no value:
  a) "—" (default)
  b) "₪0"

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/pages/suppliers/**/*.spec.ts --include=src/app/shared/list-shell/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Inventory → select 2 rows → bulk edit → open "שנה שדה" and the value list: fully visible over the table.
- [human] Suppliers, desktop: every row lines up under its header. Header reads "מינימום הזמנה"; cells show "₪500" or "—".
- [human] Suppliers, phone: name, carousel (first slide מינימום הזמנה), actions, select — no overlapping text.
