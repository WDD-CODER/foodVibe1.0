# Plan 712 — Product, equipment and supplier forms on one frame

Status: draft
Depends-on: 703, 711
Track: code
Snapshot: d06302a3

## Problem Statement
The three entity forms (product, equipment, supplier) each copy the same glass container and a `.form-header h2` at
`1.25rem / 600`, restyle `.c-form-actions` padding and the engine buttons locally (the product form even redraws
`.c-btn-primary` and shows its Cancel button as a primary button), and the product import draws a raw `<table>` and
hand field labels; the suppliers sub-pages have a hand pill nav that copies the venues one (`night/style-audit.md`
P4, P8, P9, P12, P14). This plan puts the forms on `.c-form-page` with `app-page-header` for the title, the actions on
the plain `.c-form-actions` engine with one primary button, the import table on `.c-table`, and the stylesheets on
tokens. The venue form is left to after plan 698 (it owns `src/app/pages/venues/**`).

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- `equipment/components/equipment-form/equipment-form.component.scss:9-18` `.equipment-form-container` (glass
  values), `:22-27` `.form-header h2` `1.25rem/600`, `:62` restyles `.c-form-actions` padding.
- `suppliers/components/supplier-form/supplier-form.component.scss:9-20` same container, `:25-27` h2, `:49-50` h3
  `1rem/600`, `:57` `.c-form-actions` restyle.
- `inventory/components/product-form/product-form.component.html:1-13` `.product-form-container` + `form.form-container`
  + `header.form-header > h2.form-header__title` (the edit title includes the product name) + subtitle; footer
  `.form-actions` (`.scss:317-344`) whose `button` rule restyles `c-btn-primary`; Cancel is `.c-btn-primary`
  (`html:424`); restyles `.c-btn-ghost` (`.scss:83`) and `.c-icon-btn.danger` (`:231,310,521`); icons sized three ways
  (`[size]`, `.icon-xs/.icon-sm`, `lucide-icon { width: 1.25rem }` `:303-306`); `left: 0.55rem` (`:163`). `.product-field`
  is kept on purpose (registry `form-field`).
- `inventory/components/product-form/supplier-prices/supplier-prices.component.scss:13,38-45` font sizes, weight 600.
- `inventory/components/product-import/product-import.component.html:152` raw `<table class="import-table">`
  (`.scss:95-125`, stacked cards on phones), `:26,44` `.import-field` labels; `.scss:200` restyles `.c-btn-primary`.
- `suppliers/suppliers.page.html:1-10` `nav.suppliers-nav` of `.nav-link` buttons and links (`.scss:17-76`).
- From 703: `.c-form-page`, `.c-table`, `styleFindings`; `app-page-header` slots `header-title`, `header-actions`,
  inputs `subtitleKey`, `showBack`, output `back`.

## Goals & Success Criteria
**Primary:** the three entity forms share one frame, one title style, one action row with a single primary button,
and the import preview uses the shared table.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-712.test.mjs`: `styleFindings` on every `.html`/`.scss` under `src/app/pages/equipment/components/equipment-form/`, `src/app/pages/suppliers/components/supplier-form/`, `src/app/pages/inventory/components/product-form/` (with `supplier-prices/`), `src/app/pages/inventory/components/product-import/product-import.component.{html,scss}` and `src/app/pages/suppliers/suppliers.page.{html,scss}` returns `[]`; the three form templates contain `c-form-page` and `<app-page-header`, none contains `form-header`; `product-import.component.html` has `class="c-table`; `product-form.component.html` has exactly one `c-btn-primary` in its action row.
- [auto] `pnpm run test:ci` passes, including new cases in `src/app/pages/equipment/components/equipment-form/equipment-form.component.spec.ts` and `src/app/pages/inventory/components/product-form/product-form.component.spec.ts` (the title renders in `app-page-header`; pressing Cancel still calls the existing cancel handler; Cancel has `c-btn-ghost`) and `src/app/pages/inventory/components/product-import/product-import.component.spec.ts` (three preview rows → three `tbody tr` in `.c-table`).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] the form's page · change one field, then follow a link out of the page · a question asks whether to leave or stay (`/inventory` → open a product; default `unsaved-changes-on-leave`).
- [human] open a product, an equipment item and a supplier one after the other: the three forms have the same frame, the same title size, and one green main button with a light Cancel next to it.

## Execution Mode
- Parallel: yes — after 703 and 711 (same three areas; 711 removes the list copies first).
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/equipment/components/equipment-form/**
src/app/pages/equipment/components/equipment-form/equipment-form.component.spec.ts
src/app/pages/suppliers/components/supplier-form/**
src/app/pages/inventory/components/product-form/**
src/app/pages/inventory/components/product-form/product-form.component.spec.ts
src/app/pages/inventory/components/product-import/product-import.component.html
src/app/pages/inventory/components/product-import/product-import.component.scss
src/app/pages/inventory/components/product-import/product-import.component.ts
src/app/pages/inventory/components/product-import/product-import.component.spec.ts
src/app/pages/suppliers/suppliers.page.html
src/app/pages/suppliers/suppliers.page.scss
src/app/pages/suppliers/suppliers.page.ts
scripts/test/style-712.test.mjs
src/app/pages/diagnosis/components/diag-invoice-queue/diag-invoice-queue.component.spec.ts
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — form templates and styles; validation, save paths, the unsaved-changes guard and the import apply route are unchanged (INV-4: no schema touched).

## Reuse Check

- Form frames — family: entity-form — rung: 1 — why: `.c-form-page` (703).
- Form titles — family: list-page — rung: 1 — why: `app-page-header` with the title in `header-title` (the product edit title keeps the product name).
- Action rows — family: engine-classes — rung: 1 — why: `.c-form-actions` as it is, `.c-btn-primary` (save) + `.c-btn-ghost` (cancel).
- Import preview table — family: engine-classes — rung: 1 — why: `.c-table` (`--compact`); on a phone it scrolls sideways instead of stacking cards.
- Import field labels — family: form-field — rung: 1 — why: `app-form-field`.
- Suppliers sub-nav — family: chip — rung: 1 — why: `c-chip c-chip--tab` route links (`routerLinkActive="active"`) plus a `.c-btn-ghost--sm` back button.
- none new.

## Defaults

- unsaved-changes-on-leave — applies — how: the existing `pending-changes.guard` + `useUnsavedChanges` stay wired; the card above re-checks it
- confirm-destructive-action — applies — how: the forms' existing delete confirmations are unchanged
- loading-and-error-states — exception — why: no load path changes
- one-breakpoint-set — applies — how: `$break-*` names only

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want every edit form to look the same, so that I always find save and cancel in the same place.

## Functional Requirements

### Must Have (P0)
- [ ] Equipment and supplier forms: the container class → `.c-form-page`; `.form-header` → `app-page-header` with the
  existing title key in `header-title`; the local container, header and `.c-form-actions` restyle rules go; `h3`
  section titles → `--fs-md` / `--fw-semibold`.
- [ ] Product form: `.product-form-container` → `.c-form-page` (the `edit-mode` class stays for its own layout
  rules); header → `app-page-header` (`header-title` = the same edit / add title expression; the add subtitle → the
  `subtitleKey` input with `add_product_subtitle`); the footer → `.c-form-actions` with Save `.c-btn-primary` and
  Cancel `.c-btn-ghost` (same handlers); the local `.form-actions button` rule and the `.c-btn-ghost` /
  `.c-icon-btn.danger` restyles go (use `.c-icon-btn danger` as is); icons sized only by `[size]` (14 meta, 16 buttons,
  18 header) — the `.icon-xs/.icon-sm` and `lucide-icon { width }` rules go; `left` → `inset-inline-start`.
  `.product-field` blocks stay (registry), with tokens.
- [ ] Supplier prices: literals → tokens.
- [ ] Product import: `<table class="c-table c-table--compact">` inside a `div` with `overflow-x: auto` (kept physical:
  `overflow-inline` is not supported in every browser the app targets, and the guard does not flag `overflow-x`); the phone stacked-card rules go; `.import-field` labels → `app-form-field`; the
  `.c-btn-primary` restyle goes.
- [ ] Suppliers page nav: `.nav-link` → `c-chip c-chip--tab` (links, `routerLinkActive="active"`); back →
  `c-btn-ghost--sm` with the 16 icon; the `.nav-link` rules go.
- [ ] Every literal in the touched stylesheets becomes a token (703 mapping).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. No new dictionary key; icons already registered.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Put the equipment and supplier forms on the shared form frame and header — src/app/pages/equipment/components/equipment-form/*, src/app/pages/suppliers/components/supplier-form/*
- [x] A2: Put the product form on the shared frame, header and action row with one main button, and size its icons one way — src/app/pages/inventory/components/product-form/**
- [x] A3: Draw the import preview as the shared table and its labels as shared fields — src/app/pages/inventory/components/product-import/product-import.component.*
- [x] A4: Draw the suppliers sub-navigation with the shared tab chips — src/app/pages/suppliers/suppliers.page.*
- [x] A5: Lock the forms on the shared pieces and tokens — scripts/test/style-712.test.mjs

## Technical Considerations
- The style test `scripts/test/style-712.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703, 711.
- New files: `scripts/test/style-712.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts` or `src/styles.scss` change.
- Traps: the product form's `[formGroup]` is on the `form` element — `app-page-header` may sit inside it (it holds no
  submit button); its title is an `h1` (the forms had `h2`) and the routed page has no other `h1`.

## Out of Scope
- `src/app/pages/venues/**` including the venue form (plan 698; the undefined `.btn-icon` there is an audit follow-up).
  `invoice-header-strip`, `price-impact-panel`. Field internals of `.product-field`.

## Critical Questions
- none

## Execution Notes
- behaviour: Cancel on the product form becomes a light button (one primary action per area, Polaris rule).
- behaviour: the import preview scrolls sideways on a phone instead of turning each row into a card.
- evidence: pnpm run build → 0; pnpm run lint → 0 (0 errors); pnpm run test:ci → 3208 SUCCESS; pnpm run test:scripts → pass 197, fail 0 (style-712: 4 tests); lint:icons, lint:no-native-select, lint:reuse → 0; log-query → SKIP, no database.
- scope: docs/workflow-kit/manifest.json (already in scope) got the entry for scripts/test/style-712.test.mjs.
- the two [human] items are left for the Human; no [ui] test written.
