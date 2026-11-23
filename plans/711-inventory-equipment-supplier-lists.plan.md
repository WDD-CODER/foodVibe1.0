# Plan 711 — Inventory, equipment and supplier lists: drop engine copies, shared empty state and popup

Status: draft
Depends-on: 703
Track: code
Snapshot: d06302a3

## Problem Statement
The products, equipment and supplier lists are the app's model lists, but each restyles the same engines locally
(clickable cells, row-hover icon opacity, action-column margin, sortable-header cursor), shows "no match" as a local
text box, and uses page-local badges (`.low-stock-badge`, `c-chip amber` legacy modifier, `.allergen-btn`); the
equipment list's phone edit panel hand-draws `.c-modal-overlay`; the stock count's past counts are hand-made button
rows; and the "below minimum" list sets `display: grid` on `.c-list-row` inside a layer, which loses to the unlayered
engine `display: contents` — its rows most likely collapse (`night/style-audit.md` P5, P7, P11, P14). Plan 703 moved
the copied engine bits into `src/styles.scss`; this plan deletes the copies and converges the rest.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- Copied engine restyles: `suppliers/components/supplier-list/supplier-list.component.scss:10-20`,
  `equipment/components/equipment-list/equipment-list.component.scss:7-26`,
  `inventory/components/inventory-product-list/inventory-product-list.component.scss:11-23,184-196` (plus row tints
  written twice, layered `:199-205` and unlayered `:294-300`); `supplier-grid-row` / `equipment-grid-row`
  `{ display: contents }` repeat the engine.
- No-match boxes: `inventory-product-list.component.html:150`, `equipment-list.component.html:110`,
  `supplier-list.component.html:99` (`.no-results`, `font-size: 0.875rem`).
- `inventory-product-list.component.html:174` `.low-stock-badge` (`.scss:49-61`), `:199` `c-chip amber unpriced-badge`,
  `:241` `.allergen-btn` (`.scss:141-162`); `.scss:130` `left: -9999px`; literal `white` (`:200,271`).
- `equipment-list.component.html:181-192` phone/tablet panel: `<div class="c-modal-overlay">` + `.inline-edit-panel.as-modal`
  in `shell-modal`, closed by `onInlinePanelClickOutside()`; fields `.inline-edit-field` label + `c-input`
  (`:205-270`); row trash icon 18 (others 16).
- `inventory/components/stock-count/stock-count.component.html:121` `button.stock-count__past` rows (`.scss:45-55`);
  `:309-319` `.stock-count__base-pop` own `role="dialog"` popover placed by `placeInViewport` with `[style.left.px]`
  (registered on purpose by plan 658 — kept); `.scss:119` restyles `.c-chip--toggle`; `:70` weight 600.
- `inventory/components/stock-count/stock-below-minimum/stock-below-minimum.component.scss:6-10` layered
  `display: grid` on `.stock-below-min__row` which also has `.c-list-row`.
- From 703: `.c-list`, `.c-list-row--link`, the four promoted rules, `app-modal-shell [sheet]`, `styleFindings`.

## Goals & Success Criteria
**Primary:** the three model lists carry no local copy of an engine, show the shared empty state, and the two broken or
hand-made pieces on the stock screens use the shared list.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-711.test.mjs`: `styleFindings` on every `.html`/`.scss` under `src/app/pages/inventory/components/{inventory-product-list,invoices-list}/`, `src/app/pages/inventory/components/stock-count/` (excluding `stock-ai-draft/`), `src/app/pages/equipment/components/equipment-list/` and `src/app/pages/suppliers/components/supplier-list/` returns `[]`, with one allow entry `{ rule: 'hand-drawn-dialog', file: 'src/app/pages/inventory/components/stock-count/stock-count.component.html', why: 'base-amount popover (plan 658, anchored-popup default) is a popover, not a modal' }`; none contains `no-results`, `low-stock-badge`, `c-chip amber`, `stock-count__past"`.
- [auto] `pnpm run test:ci` passes, including new cases in `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.spec.ts`, `src/app/pages/equipment/components/equipment-list/equipment-list.component.spec.ts`, `src/app/pages/suppliers/components/supplier-list/supplier-list.component.spec.ts` (a search with no match → one `app-empty-state`), `src/app/pages/equipment/components/equipment-list/equipment-list.component.spec.ts` (on a phone width editing a row renders `app-modal-shell` and, with no change typed, Escape closes it through `onInlinePanelClickOutside()`), `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts` (two past counts → two `.c-list-row`) and a new `src/app/pages/inventory/components/stock-count/stock-below-minimum/stock-below-minimum.component.spec.ts` (two items → two `.c-list-row` whose cells are direct grid items of one `.c-list`).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line (`/inventory`, `/inventory/equipment`, `/suppliers`; default `app-list-container`).
- [human] `/inventory/stock-count` with an item under its minimum: the "below minimum" rows show name, count, minimum and unit side by side on one line (today they may stack).
- [human] `/inventory/equipment` on a phone: tap the edit icon of a row — a popup sheet opens; tap outside — it closes as before.

- [human] the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed (`/inventory/equipment` → a row's delete, then cancel; default `confirm-destructive-action`)
- [human] the list's page with no items · open the page · a message says the list is empty (`/suppliers` → search "zzzz"; default `empty-state-on-list`)
- [human] any page with a small floating box · open it on a row near the top and on a row near the bottom of the screen · it is as wide as its text, sits right above or below the row, and is never cut off (`/inventory/stock-count` → the base-amount box of the first and of the last line — unchanged by this plan; default `anchored-popup`)

## Execution Mode
- Parallel: yes — after 703. Plan 712 (the forms of the same three areas) runs after this one.
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/inventory-product-list/**
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.spec.ts
src/app/pages/inventory/components/invoices-list/**
src/app/pages/inventory/components/stock-count/stock-count.component.html
src/app/pages/inventory/components/stock-count/stock-count.component.scss
src/app/pages/inventory/components/stock-count/stock-count.component.ts
src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
src/app/pages/inventory/components/stock-count/stock-below-minimum/**
src/app/pages/inventory/components/stock-count/stock-below-minimum/stock-below-minimum.component.spec.ts
src/app/pages/equipment/components/equipment-list/**
src/app/pages/equipment/components/equipment-list/equipment-list.component.spec.ts
src/app/pages/suppliers/components/supplier-list/**
src/app/pages/suppliers/components/supplier-list/supplier-list.component.spec.ts
scripts/test/style-711.test.mjs
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — templates and styles of three lists and two stock lists; product, equipment, supplier and stock writes are unchanged (the stock count's reads in `server/routes/stock.js` are not touched).

## Reuse Check

- Row click / hover / action-column / sort-header bits — family: engine-classes — rung: 1 — why: promoted to `src/styles.scss` by 703 (`.c-list-row--link`, row-hover icon rule, `.c-sortable-header` `user-select`); copies deleted.
- No-match boxes — family: empty-state — rung: 1 — why: `app-empty-state icon="search"`.
- Low stock, unpriced, allergen buttons — family: chip — rung: 1 — why: `c-chip c-chip--tag c-chip--sm c-chip--amber|--red`, allergens as `c-chip c-chip--tap`.
- Equipment phone edit panel — family: modal-shell — rung: 1 — why: `app-modal-shell [sheet]="true"` around the same `panelBody` template; fields `app-form-field`.
- Past counts and below-minimum rows — family: list-page — rung: 1 — why: `.c-list` (703).
- none new.

## Defaults

- app-list-container — applies — how: the three model lists stay on `app-list-shell`; the two stock lists inside the count screen use `.c-list` (703's in-panel form)
- empty-state-on-list — applies — how: `app-empty-state`
- unsaved-changes-on-leave — applies — how: the sheet's `(dismissed)` calls the existing `onInlinePanelClickOutside()`, which already asks save / leave through `mayLeaveRowPanel_()`; `[hasChanges]` is not set, so the question is asked once
- confirm-destructive-action — applies — how: existing delete confirmations unchanged
- anchored-popup — applies — how: the stock count's base-amount popover is not changed
- one-breakpoint-set — applies — how: `$break-*` names only

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef doing the weekly count, I want the "below minimum" list to read in one line per product, so that I see at once what to order.

## Functional Requirements

### Must Have (P0)
- [ ] Delete the copied engine rules from the three list stylesheets and add `.c-list-row--link` to their row
  elements; delete the redundant `{ display: contents }` row rules; keep one copy of the inventory row tints
  (the unlayered one) with token colours.
- [ ] `.no-results` boxes → `app-empty-state icon="search"` with each list's existing no-match key (inside a
  full-width cell, as the recipe book places its empty state).
- [ ] Inventory badges → chips as in the Reuse Check; `left: -9999px` → the shared `.visually-hidden` class; `white` →
  `var(--color-text-on-primary)`.
- [ ] Equipment phone/tablet panel: `@if (!isDesktop_() && editingItem_(); as item)` renders, in `shell-modal`,
  `app-modal-shell [sheet]="true" size="md" labelKey="edit"
  (dismissed)="onInlinePanelClickOutside()"` around the same `panelBody`; the hand overlay goes. The desktop
  expanded row is unchanged. Panel fields `.inline-edit-field` → `app-form-field`. Row trash icon 16.
- [ ] Stock count: past counts → `ul.c-list[role=list]` (`--list-cols: minmax(0, 1fr) auto auto`: date · lines ·
  status chip) with `.c-list-row--link` and the same click handler; `.c-chip--toggle` restyle → removed (engine look);
  weight → `--fw-semibold`; the `[style.left.px]` placement of the popover stays (runtime-dynamic, allowed by cssLayer
  "no inline styles unless the value is runtime-dynamic").
- [ ] Below minimum: the wrapper becomes `div.c-list[role=table]` with `--list-cols: 2fr 1fr 1fr 1fr`; the head row
  uses `.c-grid-header-cell`; the layered `display: grid` rules go.
- [ ] Every literal in the touched stylesheets becomes a token (703 mapping).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. Icons 16 in rows. No new dictionary key; icons already registered.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Remove the copied engine rules from the three model lists and show their no-match case as the shared empty state — src/app/pages/inventory/components/inventory-product-list/*, src/app/pages/equipment/components/equipment-list/*, src/app/pages/suppliers/components/supplier-list/*, src/app/pages/inventory/components/invoices-list/*
- [ ] A2: Turn the inventory badges into shared chips — src/app/pages/inventory/components/inventory-product-list/*
- [ ] A3: Open the equipment edit panel on phones in the shared popup sheet with shared fields — src/app/pages/equipment/components/equipment-list/*
- [ ] A4: Draw past counts and the below-minimum list as shared rows so they stay on one line — src/app/pages/inventory/components/stock-count/stock-count.component.*, src/app/pages/inventory/components/stock-count/stock-below-minimum/*
- [ ] A5: Lock the lists on the shared pieces and tokens — scripts/test/style-711.test.mjs

## Technical Considerations
- The style test `scripts/test/style-711.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703.
- New files: `src/app/pages/inventory/components/stock-count/stock-below-minimum/stock-below-minimum.component.spec.ts` (if absent), `scripts/test/style-711.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts` or `src/styles.scss` change.
- Traps: `app-modal-shell` must stay inside the `shell-modal` slot (list-shell comment, plan 362) or it is clipped by
  the table's `backdrop-filter`; the equipment form group lives on `panelBody` — do not move `[formGroup]`.

## Out of Scope
- Product, equipment and supplier forms and the product import (plan 712). `stock-ai-draft`. The base-amount popover.

## Critical Questions
- none

## Execution Notes
- behaviour: the equipment phone panel becomes a bottom sheet (`[sheet]="true"`), the shared phone popup form; on tablet it is the centred popup.
- behaviour: Escape now also closes the equipment sheet, through the same leave question a backdrop tap already asks (`mayLeaveRowPanel_`).
