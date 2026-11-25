# Plan 745 — List columns fall into the carousel one by one as the list gets narrower (mechanism + the product list)

Status: draft
Depends-on: 744
Track: code
Snapshot: 43053fec

## Problem Statement
Dandan (2026-11-25): "I want the list container to calculate the width of the list container and in it each column
width, so as the screen shrinks and there is not enough space to fit the column then one by one they start falling
into the carousel container. If there is enough space I want to see as many columns as possible, but as space runs
short they fall into the carousel." His answers: the first drop takes **two** columns (a carousel with one column
is pointless); **each list may set the order** in which its columns fall, and with nothing set they fall from the
end; the **name column is protected first**. He approved the per-list fall-order table on 2026-11-25 (below and in
plan 746).

Today the carousel is all-or-nothing and tied to the phone breakpoint. This plan builds the measured mode in the
shared list container and the carousel family and proves it on the product list. Plan 746 moves the other lists.

Verified on `origin/main` 43053fec (file:line):
- `src/app/shared/list-shell/list-shell.component.ts`: inputs `gridTemplate` and `mobileGridTemplate` (strings typed
  by each list, `:27-49`); an effect writes `--list-grid`, `--list-grid-mobile`, `--list-grid-mobile-touch` (`:79-87`).
  `list-shell.component.scss`: `.table-area`, `.table-header`, `.table-body` use `var(--list-grid)` (`:122`, `:160`,
  `:171`) and, under `@media (max-width: $break-phone-max)`, the mobile variables (`:348-391`). Tablet uses the
  desktop template. `.list-container { container-type: inline-size }` (`:44`) is queried by nothing. No
  ResizeObserver in the shell. The filter panel is 250px wide when open on desktop (`:229-265`) and takes that
  width from the table.
- `src/app/shared/column-carousel/`: `ColumnCarouselGroupDirective` (`[appColumnCarouselGroup]`, one shared `index`
  and `count`, on the `<app-list-shell>` element); `app-column-carousel-header` / `-cell` collect
  `contentChildren(ColumnSlideDirective)` and mark the active slide; **showing one slide instead of all is CSS
  only**, under `@media (max-width: $break-phone-max)` in `column-carousel.component.scss:43-216` (`.column-slide`
  hidden, `.column-slide--active` shown, the dots, the two floating arrows `.cc-arrow`, the cell label);
  `CAROUSEL_MEDIA_QUERY = PHONE_QUERY` gates swipe and arrow keys (`column-carousel-swipe.ts:29-33`).
- The product list (`src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html`):
  `[gridTemplate]="'2fr 1fr 1fr 1fr minmax(48px, 0.8fr) 0.8fr 80px auto'"` (`:5`),
  `[mobileGridTemplate]="'2fr 1.6fr minmax(4.75rem, auto) 40px 28px'"` (`:6`). Columns in order: `col-name` (fixed),
  `col-category`, `col-allergens`, `col-supplier`, `col-unit` (the four slides, header `:87-127`, rows `:228-263`),
  `col-price` (fixed), `c-col-actions` (fixed, `app-row-actions-menu`: 80px track on desktop, 40px on a phone),
  `col-select` (fixed, `auto` / `28px`, hidden on a touch phone by `src/styles.scss:1148-1151`).
- Other users of the carousel that this plan must not break: client list, equipment list, recipe book list,
  supplier list (moved by plan 746), the stock count (one slide, shown as a plain cell from 1024px) and the platform
  dashboard (its own grid, 18 slides). They keep today's phone-only behaviour until they are moved, and the last
  two keep it for good.
- Style QA (plan 739): product and recipe names "squeezed into a narrow column and wrap onto 2-3 lines" at tablet
  width — every column is shown until the phone breakpoint.
- e2e specs that drive the product list at 375px: `e2e/ui/598-2.spec.ts`, `599-2.spec.ts`, `603-1.spec.ts`,
  `603-2.spec.ts`, `609-2.spec.ts`. Carousel specs on other lists: `586-1` (clients), `603-3` (suppliers), `611-2`
  (platform).

## Goals & Success Criteria
**Primary:** on the product list, as the list gets narrower its columns fall into one carousel column in the
approved order — two the first time, then one at a time — and come back when it widens; the name always keeps a
readable width; the other lists behave exactly as today.

- [auto] `git grep -l "appFallColumn" -- "src/app/**/*.html"` lists `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html` (and only files this plan or plan 746 touches).
- [auto] `git grep -n "mobileGridTemplate\|\[gridTemplate\]" -- src/app/pages/inventory/components/inventory-product-list/` prints nothing (the product list declares columns, not templates).
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run test:ci` exits 0, including the new `src/app/shared/list-shell/list-columns.util.spec.ts` cases named in P0 and the unchanged specs of the client, equipment, recipe book, supplier, stock count and platform lists.
- [auto] `node scripts/kit-checks.mjs --base origin/main` → `KIT_CHECKS: ok`; `node scripts/reuse-lint.mjs --check-registry` exits 0; `node scripts/breadcrumbs-check.mjs` exits 0; `node scripts/kit-manifest-check.mjs` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/745-list-columns-fall-into-carousel.plan.md` → `ARCH: ok`; `--reuse` exits 0; `--defaults` exits 0; `--diff=origin/main` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [ui] Wide: open `/inventory/list` at 1600×900 signed in with the filter panel closed; the header row shows the cells `col-category`, `col-allergens`, `col-supplier` and `col-unit` all visible, and no `.cc-arrow` is visible.
- [ui] Narrower: the same page at 1000×800; `.cc-arrow--next` is visible in the header, at least two of the four columns are no longer separate header cells, the first row's `.col-name` cell is at least 180px wide, and the page has no horizontal scroll (`document.documentElement.scrollWidth <= clientWidth`).
- [ui] Phone: the same page at 375×812; pressing `.cc-arrow--next` changes the `aria-label` of `.cc-header`, and every row is one line high (the first two rows have the same `offsetHeight`).
- [human] Card — columns fall one by one: open the product list on a wide window with the filters closed, then narrow the window slowly; first the unit and the supplier go into one switching column together, then the allergens, then the category; the name stays readable the whole time and nothing wraps or scrolls sideways.
- [human] Card — they come back: widen the window again; the columns return in the opposite order.
- [human] Card — the filter panel counts: on a medium window open the filter panel; more columns fall because the list got narrower; close it and they return.
- [human] Card — switching works: when some columns are inside the switching column, press its arrow; every row shows the next piece of information, and the small label above the value says which one it is.
- [human] Card — the other lists did not change: open the recipe book, suppliers, equipment, clients and the stock count on a wide window and on a phone-width window; they look and behave as before this change.
- [human] Card — every row of a list stays on one line (default `app-list-container`): any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line. Use the product list.

## Execution Mode
- Parallel: no — it changes the shared list container and the carousel family, which six lists use.
- Concurrent plans: none that write `src/app/shared/list-shell/**`, `src/app/shared/column-carousel/**` or the product list.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/list-shell/**
src/app/shared/list-shell/list-columns.util.spec.ts
src/app/shared/column-carousel/**
src/app/pages/inventory/components/inventory-product-list/**
src/app/pages/dev-catalog/**
e2e/ui/745-1.spec.ts
e2e/ui/745-2.spec.ts
e2e/ui/745-3.spec.ts
docs/agent/house-style.md
docs/brain/component-families.md
docs/brain/inventory.md
_shared/product-defaults.md
_shared/debt-baseline.json
.interface-design/system.md
src/app/shared/breadcrumbs.md
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
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — layout of list columns in the browser only. No route, schema, permission, AI call, server code or stored data changes.

## Reuse Check
- `fitColumns` and the `ListColumn` type (`src/app/shared/list-shell/list-columns.util.ts`) — family: list-page — rung: 3 — why: the list container decides which columns fit; a pure function beside it, so it is tested without a browser.
- `*appFallColumn` (`src/app/shared/column-carousel/fall-column.directive.ts`) — family: list-page — rung: 3 — why: a column the carousel components can render either as its own cell or inside the switching column; the existing `appColumnSlide` attribute cannot be moved between the two places.

## Defaults

- app-list-container — applies — how: app-list-shell (src/app/shared/list-shell/) with app-page-header; this plan keeps every row on one line at every width by letting columns fall instead of squeezing them.
- one-breakpoint-set — applies — how: no new `@media` width; columns fall by the list's measured width, and the phone-only tracks use `PHONE_QUERY` / `$break-phone-max`.
- unsaved-changes-on-leave — exception — why: no form is added or changed.
- confirm-destructive-action — exception — why: no delete or discard is added.
- empty-state-on-list — exception — why: the list's empty and no-results blocks are not changed.
- loading-and-error-states — exception — why: no data request changes.
- hints-in-tooltips — exception — why: no explanation is added.
- unit-dropdown-add — exception — why: no dropdown is built; "unit" here is a list column.
- leave-and-return — exception — why: no page flow is built.
- anchored-popup — exception — why: no floating box is built.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want to see as many columns of a list as my screen can show, so that I do not press an arrow for information that would have fitted.
- As a chef on a tablet or a narrow window, I want the product name to stay readable, so that I do not read names broken over four lines.

## Functional Requirements

### Must Have (P0)
- [ ] **Declared columns — `src/app/shared/list-shell/list-columns.util.ts`:**
  `export interface ListColumn { id: string; track: string; min: string; phoneTrack?: string; phoneMin?: string;
  fall?: number; hideOnTouchPhone?: boolean }`. `track` is the column's grid track when it is its own cell; `min` is
  the least width it needs (`rem` or `px`); `fall` marks a column that may fall (a positive number: **1 falls
  first**; columns with no `fall` never fall); the `phone*` values replace `track` / `min` at phone width;
  `hideOnTouchPhone` drops the column on a phone with no hover (today's checkbox column).
  `export function fitColumns(columns: readonly ListColumn[], opts: { available: number; rem: number; gap: number;
  phone: boolean; touchPhone: boolean; carouselTrack?: string; carouselMin?: string }): { collapsed: string[];
  template: string }` — pure:
  1. Drop `hideOnTouchPhone` columns when `touchPhone`. Use the `phone*` values when `phone`.
  2. Need = the sum of every shown column's `min` in px + `gap` × (shown columns − 1). Start with nothing collapsed.
  3. While need > `available` and a fallable column is still shown: collapse the shown fallable column with the
     lowest `fall` (ties: the later one in the list); **if that makes exactly one column collapsed, collapse the
     next one too**. With one or more collapsed, the need counts one carousel column (`carouselMin`, default
     `7rem`) instead of them.
  4. A list with fewer than two fallable columns collapses nothing.
  5. `template` = the tracks of the shown columns in list order, with one carousel track (`carouselTrack`, default
     `minmax(7rem, 1.6fr)`) at the position of the first collapsed column in list order. `collapsed` is returned in
     fall order.
  Spec `src/app/shared/list-shell/list-columns.util.spec.ts`, at least: everything fits → nothing collapsed, the template is all tracks; a
  little too narrow → the two lowest `fall` collapse together; narrower → a third; very narrow → all fallable
  collapsed and the fixed columns kept; ties fall from the end; one fallable column never collapses; `px` and `rem`
  mins; `phone` uses the phone tracks; `touchPhone` drops the checkbox column; the carousel track sits where the
  first collapsed column was; widening by one pixel past a threshold brings a column back (no hysteresis needed).
- [ ] **The list container measures itself — `app-list-shell`:** new input `columns = input<readonly ListColumn[] |
  null>(null)`. When it is set, the shell ignores `gridTemplate` / `mobileGridTemplate`, watches the inline size of
  `.table-area` with a `ResizeObserver` (disconnected on destroy) and `PHONE_QUERY` / `(hover: none)` with
  `matchMedia` listeners, calls `fitColumns` (the gap read from the grid's computed `column-gap`, `rem` from the
  root font size), writes the result to `--list-grid` **and** to the two mobile variables (so the existing CSS
  keeps working at every width), and publishes the collapsed ids to the carousel group. Changes are applied at most
  once per animation frame. When `columns` is `null` the shell behaves exactly as today.
- [ ] **The carousel group knows what fell — `ColumnCarouselGroupDirective`:** a signal `collapsed =
  signal<readonly string[] | null>(null)` set by the shell (`null` = today's phone-only mode). In measured mode
  `count` is the number of collapsed columns and `index` cycles through them only.
- [ ] **A column that can be rendered in either place — `*appFallColumn`:** a structural directive, used as
  `<div class="col-unit c-list-body-cell" *appFallColumn="'unit'; label: ('unit' | translatePipe)">…</div>` in a
  row and `<div class="col-unit c-grid-header-cell" *appFallColumn="'unit'; label: 'unit'" role="presentation">`
  in the header; it exposes its `TemplateRef`, `id` and `label`. `app-column-carousel-header` and
  `app-column-carousel-cell` collect `contentChildren(FallColumnDirective)`: when they have any, they render, in
  list order, each column that is **not** collapsed as its own cell (`ngTemplateOutlet`, host `display: contents`),
  and — at the position of the first collapsed column — one carousel cell holding the active collapsed column's
  template, with the same chrome as today's phone carousel (the header's dots and the two `.cc-arrow` buttons with
  their `aria-label`s; the cell's small label above the value). With nothing collapsed no carousel cell and no
  arrows are rendered. A header or cell with `appColumnSlide` children and no `appFallColumn` children works
  exactly as today.
- [ ] **The carousel look is no longer tied to the phone width:** in `column-carousel.component.scss` the rules that
  today sit under `@media (max-width: $break-phone-max)` also apply to a carousel cell rendered in measured mode
  (a host class such as `column-carousel--measured`), at any width. Swipe and the header's arrow keys work whenever
  the carousel cell is shown (`isCarouselActive()` reads the group's state in measured mode, the media query
  otherwise). The selected-row outline rules for carousel cells (`src/styles.scss:1163-1170`) still draw one
  outline around the row.
- [ ] **The product list declares its columns** (and stops typing templates): in the component class
  `protected readonly columns: readonly ListColumn[]`, in this order, with these starting values —
  `name` (`track: '2fr'`, `min: '12rem'`, `phoneMin: '8rem'`),
  `category` (`'1fr'`, `min: '7rem'`, `fall: 4`),
  `allergens` (`'1fr'`, `min: '7rem'`, `fall: 3`),
  `supplier` (`'1fr'`, `min: '8rem'`, `fall: 2`),
  `unit` (`'minmax(48px, 0.8fr)'`, `min: '4rem'`, `fall: 1`),
  `price` (`'0.8fr'`, `min: '5.5rem'`, `phoneTrack: 'minmax(4.75rem, auto)'`, `phoneMin: '4.75rem'`),
  `actions` (`'80px'`, `min: '80px'`, `phoneTrack: '40px'`, `phoneMin: '40px'`),
  `select` (`'auto'`, `min: '1.75rem'`, `phoneTrack: '28px'`, `phoneMin: '28px'`, `hideOnTouchPhone: true`).
  The template passes `[columns]="columns"` and its four slide columns use `*appFallColumn` in the header and in
  the rows. **Approved fall order (Dandan, 2026-11-25): unit → supplier → allergens → category; always stay: name,
  price, actions.** The builder may tune a `min` by up to 2rem to meet the `[ui]` checks and logs each change as a
  `behaviour:` decision; the order and the fixed columns are not changed.
- [ ] **Nothing else moves:** the client, equipment, recipe book, supplier, stock count and platform lists are not
  edited and their unit specs pass unchanged. The five e2e specs of the product list at 375px keep passing (run
  them when the slot's app is up; a failure is fixed here, not in the spec, unless the spec asserted the removed
  template string).
- [ ] **Dev catalog:** one entry "falling columns": a small `app-list-shell` with five declared columns (three can
  fall) and four rows inside a box the reader can resize (CSS `resize: horizontal; overflow: hidden`), in the
  page's existing entry shape; update the catalog's entry-count spec.
- [ ] **Three `[ui]` specs** `e2e/ui/745-1.spec.ts` (1600×900), `745-2.spec.ts` (1000×800), `745-3.spec.ts`
  (375×812), signed in with `signInQa`.
- [ ] **The rules and the registry:** `docs/agent/house-style.md` `### column-carousel` — rewrite `rule` to the
  measured behaviour (as many columns as fit; they fall one by one, two the first time; each list sets the order,
  from the end by default; the name is protected first), `built from` (the `columns` input, `fitColumns`,
  `*appFallColumn`), `gaps today` (the lists not moved yet: clients, equipment, recipe book, suppliers, invoices —
  plan 746; the stock count and the platform list stay as they are, with the reason). `### recipe-list` — in
  `built from` add that a list declares its columns and which may fall. `docs/brain/component-families.md`
  `### list-page` — the new input, the util, the directive, and `- Design changes: <date> plan 745 — columns fall
  into the carousel by measured width — base — re-checked: products (the other lists keep the old mode)`;
  regenerate `docs/brain/inventory.md`. `_shared/product-defaults.md` — in `### house-column-carousel` only,
  rewrite the `rule`, `how` and `card` lines to the measured behaviour (the section stays `status: proposed`).
  `.interface-design/system.md` — one line on falling columns where lists are described.

## UI/UX Notes
- Page recipe: recipe-list — the product list (`/inventory/list`) keeps the recipe; its frame is not changed, only
  how its columns are laid out. `Behaviour: column-carousel`.
- RTL: tracks are written in list order; inline-start is the right edge. No new dictionary key.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Work out which columns fit a given width, as a tested rule with no browser — the column type, the fit function and its spec — src/app/shared/list-shell/list-columns.util.ts, src/app/shared/list-shell/list-columns.util.spec.ts
- [ ] A2: Let the list container measure itself and lay its columns out from the rule — the columns input, the resize and phone watchers, the grid variables, the collapsed ids handed to the carousel group — src/app/shared/list-shell/**, src/app/shared/column-carousel/column-carousel-group.directive.ts
- [ ] A3: Let a column be shown either as its own cell or inside the switching column — the fall-column directive, the header and cell rendering, the carousel look and keys freed from the phone width — src/app/shared/column-carousel/**, src/styles.scss
- [ ] A4: Make the product list declare its columns and their fall order instead of typing layouts — the columns list, the template, the spec — src/app/pages/inventory/components/inventory-product-list/**
- [ ] A5: Show falling columns in the dev catalog and check three widths with a script — the catalog entry and its count spec, the three ui specs — src/app/pages/dev-catalog/**, e2e/ui/745-1.spec.ts, e2e/ui/745-2.spec.ts, e2e/ui/745-3.spec.ts
- [ ] A6: Write the new behaviour into the house rules and where builders look — the column-carousel and recipe-list rules, the registry, the inventory, the proposed default's lines, the design system line — docs/agent/house-style.md, docs/brain/component-families.md, docs/brain/inventory.md, _shared/product-defaults.md, .interface-design/system.md
- [ ] A7: Run every check of this plan and hand Dandan the six cards — outputs under Execution Notes — this plan file

## Technical Considerations
- Dependencies: `ListShellComponent`, the column-carousel family, `PHONE_QUERY` (`@utils/breakpoints`),
  `ResizeObserver` (already used by `ScrollIndicatorsDirective` and the scroll rail).
- New files needed: `src/app/shared/list-shell/list-columns.util.ts`, `src/app/shared/list-shell/list-columns.util.spec.ts`, `src/app/shared/column-carousel/fall-column.directive.ts`, the three e2e
  specs.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: Reuse Check (two rows, rung 3); hotspots append-only (`src/styles.scss`); folder maps in scope;
  no Hebrew string; the log-query item; `[ui]` cards are specs under `e2e/ui/`.
- Rows are `display: contents` inside one grid (`src/styles.scss:1085`), so a cell's place comes from its order in
  the row: that is why a fallen column is rendered through a template at the carousel's position, not hidden and
  re-shown with CSS.
- Performance: a list renders 25–100 rows per page; a change of the collapsed set re-renders the carousel cells
  once per frame at most.
- Tests cannot resize a real window: the unit specs call `fitColumns` directly and set the group's `collapsed`
  signal; the widths are checked by the `[ui]` specs.

## Out of Scope
- The other lists (plan 746); the stock count (one column that could fall, nothing to switch between); the
  platform business list (not on the list container); the front desk knowledge list (one column, not a table).
- Removing the `gridTemplate` / `mobileGridTemplate` inputs (lists that are not moved still use them).
- Changing what a column shows, sorting, filters or pagination.
- Turning the `house-column-carousel` default on.

## Critical Questions
- Q: What happens when only one column no longer fits? A: the first drop takes two columns (Dandan, 2026-11-25).
- Q: Who decides which column falls first? A: each list may set the order; with nothing set they fall from the end (Dandan, 2026-11-25).
- Q: Is the name column protected? A: yes, name first (Dandan, 2026-11-25).
- Q: The product list's order? A: unit → supplier → allergens → category; name, price and actions always stay ("table approved", Dandan, 2026-11-25).

## Execution Notes
