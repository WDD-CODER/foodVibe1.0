# Plan 746 — The other five lists get falling columns: recipe book, suppliers, equipment, clients, invoices

Status: draft
Depends-on: 745
Track: code
Snapshot: 43053fec

## Problem Statement
Plan 745 builds the measured mode of the list container (columns fall into the carousel one by one as the list gets
narrower) and proves it on the product list. This plan moves the other table lists onto it, with the fall order
Dandan approved on 2026-11-25 ("table approved"):

| List | Always stay | Fall order (first → last) |
|---|---|---|
| Recipe book | name, type, actions | rating → labels → allergens → cost |
| Suppliers | name, actions | linked products → lead time → minimum order → delivery days → contact → phone |
| Equipment | name, actions | consumable → scaling rule → category → owned quantity |
| Clients | name | requests count → events count → tags → kinds → last contact → phone |
| Invoices (no carousel today) | supplier, date | file → saved at → lines count → invoice number |

Left as they are, by his agreement: the stock count (one column that could fall), the front desk knowledge list
(one column, not a table), the platform business list (not on the list container).

Verified on `origin/main` 43053fec (file:line) — the columns and today's templates:
- Recipe book — `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html:5-10`:
  `'2fr 1fr 1fr minmax(48px, 0.8fr) minmax(80px, 0.7fr) minmax(72px, 0.85fr) 80px auto'` (the date column is always
  hidden: `shouldHideDateColumn_ = signal(true)`, `.ts:152`), mobile `'2fr 0.7fr 1.8fr 40px 28px'`. Columns:
  `col-name` (fixed), `col-type` (fixed), `col-labels`, `col-allergens`, `col-rating`, `col-cost` (slides; header
  `:79-171`, rows `:189-…`), `c-col-actions`, `col-select`.
- Suppliers — `src/app/pages/suppliers/components/supplier-list/supplier-list.component.html:5-6`:
  `'2fr 0.8fr 1fr 1fr minmax(48px, 0.8fr) 0.8fr 0.8fr 80px auto'`, mobile `'2fr 1fr 40px 28px'`. Columns:
  `col-name` (fixed), slides `col-min-order`, `col-contact`, `col-phone`, `col-delivery`, `col-lead`, `col-linked`
  (header `:56-85`, rows `:103-170`), `c-col-actions`, `col-select`.
- Equipment — `src/app/pages/equipment/components/equipment-list/equipment-list.component.html:5-6`:
  `'2fr 1fr minmax(48px, 0.8fr) 1.2fr 0.8fr 80px auto'`, mobile `'2fr 1fr 40px 28px'`. Columns: `col-name` (fixed),
  slides `col-category`, `col-owned`, `col-scaling`, `col-consumable` (header `:56-106`, rows `:114-166`),
  `c-col-actions`, `col-select`.
- Clients — `src/app/pages/clients/components/client-list/client-list.component.ts:28-29`: `OWNER_GRID =
  'minmax(8rem, 1.6fr) minmax(7rem, 1fr) 1.2fr 1.4fr minmax(5rem, 0.8fr) 0.6fr 0.6fr'`, `STAFF_GRID = 'minmax(8rem,
  1.6fr) minmax(7rem, 1fr) 1.2fr 1.6fr'`, mobile `'1fr 1.4fr'` (`html:6`). Columns: `col-name` (fixed), slides
  `col-phone`, `col-kinds`, `col-tags`, and for the owner only `col-last`, `col-events`, `col-requests` (header
  `html:42-66`, rows `:83-122`). No actions and no checkbox column. Its spec asserts the slide labels
  (`client-list.component.spec.ts:173-193`).
- Invoices — `src/app/pages/inventory/components/invoices-list/invoices-list.component.ts:40-42`: owner
  `'1.6fr 1fr 1fr 0.7fr 1fr 1.2fr'`, staff `'1.6fr 1fr 1fr 1fr'`, the same string for mobile; all six columns are
  fixed cells (`html:19-30`): supplier, invoice date, invoice number, lines count (owner), saved at, file (owner).
  No carousel group on its `<app-list-shell>`.
- e2e specs that must keep passing: `e2e/ui/586-1.spec.ts` (clients at 390px: next changes the `.cc-header` label),
  `e2e/ui/603-3.spec.ts` (suppliers at 375px: the active slide does not overlap the arrows, no sideways scroll, dots
  below the slide), `e2e/ui/609-1.spec.ts` (suppliers at 1366px).

## Goals & Success Criteria
**Primary:** the five lists show as many columns as fit and let the rest fall in the approved order; none of them
types a layout by hand any more.

- [auto] `git grep -l "appFallColumn" -- "src/app/pages/**/*.html"` lists the product list (plan 745) and these five templates: recipe-book-list, supplier-list, equipment-list, client-list, invoices-list.
- [auto] `git grep -n "mobileGridTemplate\|\[gridTemplate\]\|OWNER_GRID\|STAFF_GRID" -- src/app/pages/recipe-book src/app/pages/suppliers src/app/pages/equipment src/app/pages/clients src/app/pages/inventory/components/invoices-list` prints nothing.
- [auto] `git grep -l "appColumnSlide" -- "src/app/pages/**/*.html"` lists only the stock count and the platform dashboard.
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run test:ci` exits 0 (the five lists' specs updated; the stock count and platform specs unchanged).
- [auto] `node scripts/kit-checks.mjs --base origin/main` → `KIT_CHECKS: ok`; `node scripts/reuse-lint.mjs --check-registry` exits 0; `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/746-other-lists-on-falling-columns.plan.md` → `ARCH: ok`; `--reuse` exits 0; `--defaults` exits 0; `--diff=origin/main` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [ui] Suppliers, medium width: open `/suppliers/list` at 1000×800 signed in; `.cc-arrow--next` is visible in the header, the header still has a separate cell for `col-phone`, and the page has no horizontal scroll.
- [ui] Recipe book, medium width: open `/recipe-book` at 1000×800 signed in; the first row's `.col-name` cell is at least 180px wide and its text is at most two lines high (`offsetHeight` at most twice the line height); `col-cost` is still its own header cell.
- [human] Card — the recipe book: narrow the window slowly; the rating and the labels fall first (together), then the allergens, then the cost; the recipe name stays readable.
- [human] Card — suppliers: narrow the window slowly; linked products and lead time fall first, the phone falls last.
- [human] Card — equipment: narrow the window slowly; consumable and scaling rule fall first, the owned quantity falls last.
- [human] Card — clients: narrow the window slowly; the two counts fall first, the phone falls last.
- [human] Card — invoices: narrow the window slowly; the file and "saved at" fall first into a switching column, the supplier and the date always stay.
- [human] Card — every row of a list stays on one line (default `app-list-container`): any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line. Use the recipe book.

## Execution Mode
- Parallel: no — five list templates and their specs.
- Concurrent plans: none that write these five list folders.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/recipe-book/components/recipe-book-list/**
src/app/pages/suppliers/components/supplier-list/**
src/app/pages/equipment/components/equipment-list/**
src/app/pages/clients/components/client-list/**
src/app/pages/inventory/components/invoices-list/**
e2e/ui/746-1.spec.ts
e2e/ui/746-2.spec.ts
docs/agent/house-style.md
docs/brain/component-families.md
docs/brain/inventory.md
_shared/debt-baseline.json
docs/workflow-kit/manifest.json
```

`_shared/debt-baseline.json` and `docs/workflow-kit/manifest.json` are listed so a count that only goes down, or a
new file that must be classified, never stops the run.

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. A fault found in the shared list container or the carousel
family (plan 745's pieces) is such a case: report it, do not patch around it in a list.

## Architecture Impact
- INV-none: preserves — layout of list columns in the browser only. No route, schema, permission, AI call, server code or stored data changes; who sees which client or invoice column (owner or staff) is unchanged.

## Reuse Check
- none — no new component, util, pipe, service or `.c-*` class: the five lists use the `columns` input, `fitColumns` and `*appFallColumn` that plan 745 added to family `list-page`.

## Defaults

- app-list-container — applies — how: app-list-shell (src/app/shared/list-shell/) with app-page-header; every row stays on one line because columns fall instead of being squeezed.
- one-breakpoint-set — applies — how: no new `@media` width; the phone-only tracks come from the columns' `phoneTrack` values.
- unsaved-changes-on-leave — exception — why: no form is added or changed (the equipment list's inline edit keeps its own guard).
- confirm-destructive-action — exception — why: no delete or discard is added.
- empty-state-on-list — exception — why: the lists' empty and no-results blocks are not changed.
- loading-and-error-states — exception — why: no data request changes.
- hints-in-tooltips — exception — why: no explanation is added.
- unit-dropdown-add — exception — why: no dropdown is built.
- leave-and-return — exception — why: no page flow is built.
- anchored-popup — exception — why: no floating box is built.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want every list to show me as much as my screen can hold, the same way on all of them, so that the app feels like one product.

## Functional Requirements

### Must Have (P0)
Each list: replace the typed templates by `protected readonly columns` (a `computed` where the columns depend on
the role) passed as `[columns]`, change each slide column from `appColumnSlide` to `*appFallColumn="'<id>'; label:
…"` in the header and in the rows (same classes, same content, same order), update its spec. Starting values below;
the builder may tune a `min` by up to 2rem to meet the checks and logs each change as a `behaviour:` decision. The
fall order and the fixed columns are the Human's and are not changed. Shared values: actions `track: '80px'`, `min:
'80px'`, `phoneTrack: '40px'`, `phoneMin: '40px'`; select `track: 'auto'`, `min: '1.75rem'`, `phoneTrack: '28px'`,
`phoneMin: '28px'`, `hideOnTouchPhone: true`.

- [ ] **Recipe book:** `name` (`'2fr'`, min `12rem`, phoneMin `8rem`), `type` (`'1fr'`, min `5rem`, phoneTrack
  `'0.7fr'`, phoneMin `3.5rem`), `labels` (`'1fr'`, min `7rem`, `fall: 2`), `allergens` (`'minmax(48px, 0.8fr)'`,
  min `6rem`, `fall: 3`), `rating` (`'minmax(80px, 0.7fr)'`, min `5.5rem`, `fall: 1`), `cost` (`'minmax(72px,
  0.85fr)'`, min `5rem`, `fall: 4`), actions, select. The date column stays hidden as today and is not declared
  (`shouldHideDateColumn_` and its markup are left alone).
- [ ] **Suppliers:** `name` (`'2fr'`, min `11rem`, phoneMin `8rem`), `min-order` (`'0.8fr'`, min `5rem`, `fall: 3`),
  `contact` (`'1fr'`, min `7rem`, `fall: 5`), `phone` (`'1fr'`, min `7rem`, `fall: 6`), `delivery` (`'minmax(48px,
  0.8fr)'`, min `6rem`, `fall: 4`), `lead` (`'0.8fr'`, min `5rem`, `fall: 2`), `linked` (`'0.8fr'`, min `5rem`,
  `fall: 1`), actions, select.
- [ ] **Equipment:** `name` (`'2fr'`, min `11rem`, phoneMin `8rem`), `category` (`'1fr'`, min `7rem`, `fall: 3`),
  `owned` (`'minmax(48px, 0.8fr)'`, min `4.5rem`, `fall: 4`), `scaling` (`'1.2fr'`, min `8rem`, `fall: 2`),
  `consumable` (`'0.8fr'`, min `5rem`, `fall: 1`), actions, select. The inline edit panel and `isDesktop_` are not
  changed.
- [ ] **Clients:** `name` (`'minmax(8rem, 1.6fr)'`, min `10rem`, phoneMin `7rem`), `phone` (`'minmax(7rem, 1fr)'`,
  min `7rem`, `fall: 6`), `kinds` (`'1.2fr'`, min `7rem`, `fall: 4`), `tags` (`'1.4fr'`, min `7rem`, `fall: 3`), and
  for the owner only `last` (`'minmax(5rem, 0.8fr)'`, min `5.5rem`, `fall: 5`), `events` (`'0.6fr'`, min `4rem`,
  `fall: 2`), `requests` (`'0.6fr'`, min `4rem`, `fall: 1`). For staff the three shared columns keep the same ranks
  (tags → kinds → phone). Remove `OWNER_GRID` / `STAFF_GRID`. Update the spec's label assertions (`:173-193`) to
  the fall columns.
- [ ] **Invoices:** add `appColumnCarouselGroup` to its `<app-list-shell>` and wrap the fallable header cells in
  `<app-column-carousel-header>` and the fallable row cells in `<app-column-carousel-cell>`, as the other lists do.
  Columns: `supplier` (`'1.6fr'`, min `9rem`, phoneMin `7rem`), `date` (`'1fr'`, min `6rem`), `number` (`'1fr'`, min
  `6rem`, `fall: 4`), for the owner `lines` (`'0.7fr'`, min `4rem`, `fall: 3`), `saved` (`'1fr'`, min `6.5rem`,
  `fall: 2`), for the owner `file` (`'1.2fr'`, min `7rem`, `fall: 1`). Each fallable column's `label` is the
  dictionary key its header already uses.
- [ ] **Existing e2e specs keep passing:** `586-1`, `603-3`, `609-1` (run them when the slot's app is up).
- [ ] **Two `[ui]` specs:** `e2e/ui/746-1.spec.ts` (suppliers at 1000×800) and `e2e/ui/746-2.spec.ts` (recipe book
  at 1000×800), signed in with `signInQa`.
- [ ] **The rules and the registry:** `docs/agent/house-style.md` `### column-carousel` — `gaps today`: none of the
  table lists on the list container is outside the rule; the stock count and the platform business list keep the
  old mode, with the reason. `docs/brain/component-families.md` `### list-page` — `- Design changes: <date> plan
  746 — the five other lists declare columns that fall — base — re-checked: recipe book, suppliers, equipment,
  clients, invoices`; regenerate `docs/brain/inventory.md`.

## UI/UX Notes
- Page recipe: recipe-list — `/recipe-book`, `/suppliers/list`, `/inventory/equipment`, `/clients`,
  `/inventory/invoices` keep the recipe; their frame is not changed. `Behaviour: column-carousel`.
- RTL as before. No new dictionary key (invoices reuse their header keys as labels).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Move the recipe book onto falling columns so recipe names stop being squeezed — the columns list, the header and row cells, the spec — src/app/pages/recipe-book/components/recipe-book-list/**
- [ ] A2: Move the supplier list onto falling columns — the columns list, the header and row cells, the spec — src/app/pages/suppliers/components/supplier-list/**
- [ ] A3: Move the equipment list onto falling columns — the columns list, the header and row cells, the spec — src/app/pages/equipment/components/equipment-list/**
- [ ] A4: Move the client list onto falling columns for owner and staff — the computed columns list, the removed grid constants, the header and row cells, the spec — src/app/pages/clients/components/client-list/**
- [ ] A5: Give the invoices list a switching column for the first time — the carousel group, the header and cell wrappers, the columns list, the spec — src/app/pages/inventory/components/invoices-list/**
- [ ] A6: Check two of the lists at a medium width with a script and record the change — the two ui specs, the column-carousel rule's gaps, the registry line, the inventory — e2e/ui/746-1.spec.ts, e2e/ui/746-2.spec.ts, docs/agent/house-style.md, docs/brain/component-families.md, docs/brain/inventory.md
- [ ] A7: Run every check of this plan and hand Dandan the six cards — outputs under Execution Notes — this plan file

## Technical Considerations
- Dependencies: plan 745's `columns` input, `ListColumn`, `fitColumns`, `*appFallColumn` and the measured mode of
  the carousel header and cell.
- New files needed: the two e2e specs.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none — owner-only columns stay owner-only (clients: last contact and the two counts;
  invoices: lines count and file).
- Security surface: none.
- Data / migration: none.
- Project checks: Reuse Check (`- none`); no hotspot written; no Hebrew string; the log-query item; `[ui]` cards
  are specs under `e2e/ui/`.

## Out of Scope
- The stock count, the front desk knowledge list and the platform business list.
- The shared list container and the carousel family themselves (plan 745).
- What a column shows, sorting, filters, pagination, row actions.

## Critical Questions
- Q: The fall order of each list? A: the table above — "table approved" (Dandan, 2026-11-25).
- Q: The stock count, the knowledge list and the platform list? A: left as they are (proposed with the table on 2026-11-25 and approved with it).

## Execution Notes
