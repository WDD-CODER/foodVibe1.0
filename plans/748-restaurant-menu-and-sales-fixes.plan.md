# Plan 748 — Restaurant menu and month sales: filters in the panel, clear columns, icons, visible month arrows

Status: draft
Depends-on: none
Track: code
Snapshot: 7c135d5b

## Problem Statement
Dandan graded run biz-numbers (plans 723–729) on 2026-11-26 and found six problems on the two restaurant-menu pages
(BRIEF-3 items 1–6, his words translated):

- «תפריט המסעדה» (`/restaurant-menu`, plan 725):
  1. The course chips, the «הצג מנות שהוסרו» toggle and the VAT note sit in a header cell inside the list
     (`c-grid-header-cell rm-row__filters`), not in the app's normal filter place (the filter panel the products list
     «מוצרים» opens with its sliders button).
  2. Column titles: «קורס» → «סוג מנה»; «נטו» → «מחיר ללא מע"מ»; «נשאר למנה» → «רווח»; the percent gets its own
     column «רווח באחוזים»; the row actions are the app's edit and remove icons, not text buttons.
  3. Every net price starts with the word «נטו» — numbers only.
- «מכירות החודש» (`/restaurant-menu/sales`, plan 726):
  4. There are no arrows to older or newer months (the plan 726 cards for the arrows could not be checked). Find why.
  5. The cost column is not needed on this page.
  6. A dish with no returns must not show its «סיבות» control at all.

Verified on `origin/orch/biz-numbers` 7c135d5b:
- `src/app/pages/restaurant-menu/restaurant-menu.page.html:40-81`: the filters are the first `shell-table-header`
  cell (`.rm-row__filters`, `grid-column: 1 / -1` in `restaurant-menu.page.scss:15-23`), holding `vatNote_()`, the
  course chips (`courseFilter_` is one string: `ALL_COURSES` / `NO_COURSE` / a course key) and the
  `menu-dish-show-removed` toggle. `[isPanelOpen]="false"` and no `(panelToggle)`, so the sliders button does nothing.
- The products list (`src/app/pages/inventory/components/inventory-product-list/`) and the suppliers list
  (`src/app/pages/suppliers/components/supplier-list/supplier-list.component.html:173-215`) put filters in
  `shell-filters` (`.c-filter-section` → `.c-filter-category` with a header button, `.c-chip-group` of
  `.c-chip--toggle` checkboxes) and «נקה סינון» in `shell-filter-clear`, with `useResponsivePanelState('<list>')`
  (`src/app/core/utils/panel-preference.util.ts:57`) and `useCollapsibleCategories()`
  (`src/app/core/utils/collapsible-categories.util.ts:31`).
- Row actions elsewhere: `app-row-actions-menu` holding `button.c-icon-btn` with `lucide-icon name="pencil"` (edit) and
  `button.c-icon-btn.danger` with `trash-2` (`supplier-list.component.html:140-165`). The menu page has text buttons
  `menu-dish-edit` / `menu-dish-remove` / `menu-dish-restore` (`restaurant-menu.page.html:149-162`). `Pencil`,
  `Trash2`, `RotateCcw` are registered in `src/app/app.config.ts`.
- `restaurant-menu.page.html:126-128`: the net cell prints `'menu_dish_net_price' | translatePipe` («נטו») before the
  number. `:140-147`: the «נשאר למנה» cell prints the left amount and `(foodCostPct)` — the percent there is the
  food-cost share (cost ÷ net), not a profit share.
- **Why the month arrows do not show (item 4): a layout bug, not missing code.** The arrows exist
  (`dish-sales.page.html:15-36`, `data-testid="dish-sales-prev"` / `-next`, `goMonth()` in `dish-sales.page.ts`, and
  the plan 726 spec clicks them — which is why the tests passed). They are one of three direct children of
  `shell-actions` (the month group, «סמן ריקים כ־0», «שמירה»). `list-shell` passes them to `app-page-header` with
  `listLayout`, and `src/app/shared/page-header/page-header.component.scss` (`.ph--list`, about lines 180 and 216)
  sets `.ph-end` to `display: contents` and places **every** non-leading action child at `grid-area: 1 / 6`. All three
  land in the same grid cell, one on top of the other; «שמירה» comes last in the DOM and covers the arrows and
  «סמן ריקים כ־0». Every other list page has a single action child, so only this page shows it (the stock count page
  has two children and is listed under Out of Scope as a follow-up).
- `dish-sales.page.html:101-111`: the «סיבות» button is always drawn and only `[disabled]` when nothing came back.
  `:64-66` and `:112-125`: the cost header and cell; `:127`: the line «העלות לפי מחירי היום ותוקפא בסגירת החודש».
- `.c-pagination-controls` (`src/styles.scss:1175`) in `shell-pagination` is how the products and recipe lists show
  their pager above the column heads; `list-shell` scrolls the rows to the top when a pager button is pressed
  (`list-shell.component.ts:58`).

## Goals & Success Criteria
**Primary:** the menu page filters from the filter panel like every other list, shows «סוג מנה», «מחיר ללא מע"מ»,
«רווח» and «רווח באחוזים» with numbers only and icon actions; the month sales page shows clear month arrows above
the list, no cost column, and «סיבות» only on dishes that had returns.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0.
- [auto] `pnpm run test:ci` exits 0, including `src/app/pages/restaurant-menu/restaurant-menu.page.spec.ts` and
  `src/app/pages/restaurant-menu/dish-sales/dish-sales.page.spec.ts`.
- [auto] `src/app/pages/restaurant-menu/restaurant-menu.page.spec.ts`: no `.rm-row__filters` element exists; the
  course chips and the removed toggle are inside the list's filter panel; picking two types lists both, «ללא סוג
  מנה» lists dishes with no type, «נקה סינון» lists all again; the net cell's text has no «נטו» key; a costed dish
  with net 100 and cost 25 shows «רווח» 75 and «רווח באחוזים» 75.0%; each row has an edit and a remove icon button
  (`lucide-icon` pencil / trash-2, no text), and a removed dish has a restore icon.
- [auto] `src/app/pages/restaurant-menu/dish-sales/dish-sales.page.spec.ts` replays the hidden arrows with the real
  `ListShellComponent` and `PageHeaderComponent` attached to the document: `document.elementFromPoint` at the centre
  of `dish-sales-prev` (and of `dish-sales-zero-fill`) returns that button or a child of it; no `dish-sales-cost`
  cell exists; a dish with `returned` empty or 0 has no `dish-sales-reasons` element, and typing 2 shows it.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/748-restaurant-menu-and-sales-fixes.plan.md` → `ARCH: ok`;
  `node scripts/scope-check.mjs --reuse --plan=plans/748-restaurant-menu-and-sales-fixes.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] Signed in as `demo_host` (business `demo_restaurant`), open «תפריט המסעדה»: nothing sits above the column
  titles except the titles; the sliders button beside the title opens the filter panel with «סוג מנה» (one chip per
  type, plus «ללא סוג מנה») and «הצג מנות שהוסרו»; picking a type shows only its dishes; «נקה סינון» shows all again.
- [human] On the same page the column titles read «שם המנה», «סוג מנה», «מחיר כולל מע"מ», «מחיר ללא מע"מ»,
  «עלות למנה», «רווח», «רווח באחוזים»; the «מחיר ללא מע"מ» column shows numbers only (no «נטו»); a fully costed dish
  shows a «רווח» amount and a percent like «72.5%» in its own column.
- [human] On a dish row the actions are a pencil and a trash icon like on «ספקים»: the pencil opens the dish, the
  trash asks «להסיר את "…" מהתפריט?» and removes it; with «הצג מנות שהוסרו» on, the removed dish has a restore icon
  that brings it back.
- [human] Open «מכירות החודש»: above the column titles the month «נובמבר 2026» sits between two arrows; the right
  arrow goes to «אוקטובר 2026» with its saved numbers, again to «ספטמבר 2026»; the left arrow comes back and is off at
  «נובמבר 2026»; «סמן ריקים כ־0» and «שמירה» are both visible in the header.
- [human] On «מכירות החודש» there is no «עלות למנה» column; a dish with an empty or 0 «הוחזרו» shows nothing in the
  reasons column; typing 2 in its «הוחזרו» shows «סיבות», and clearing it hides it again.
- [human] the list's page with no items · open the page · a message says the list is empty — here: a filter that matches nothing on «תפריט המסעדה» says «אין מנות שמתאימות לחיפוש», and «מכירות החודש» of a business with no dishes still says «עוד אין מנות בתפריט».
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page — here: with the server stopped, «מכירות החודש» shows «לא הצלחנו לטעון את המכירות» and «נסה שוב», and the month arrows are still there.
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line — here: both pages on a phone; the month arrows stay on one line above the rows.
- [human] the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed — here: the trash icon on a «תפריט המסעדה» row, then «ביטול»: the dish is still listed.
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal — here: on «תפריט המסעדה», hovering the «מחיר ללא מע"מ» column title shows «המחירים כוללים מע"מ 18%; נטו = המחיר בלי מע"מ», and no such line sits above the list.

## Execution Mode
- Parallel: yes — 748 ∥ 750 ∥ 749: 748 writes only `src/app/pages/restaurant-menu/**`; 749 writes
  `src/app/pages/monthly-plan/**` and `src/app/shared/month-figures/**`; 750 writes `src/app/core/components/header/**`.
  `dictionary.json` is append-only for all three.
- Concurrent plans: 749, 750.
- Isolated DB: no — no stored shape changes; the demo data in the local DB is read only.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/restaurant-menu/**
src/app/pages/restaurant-menu/restaurant-menu.page.spec.ts
src/app/pages/restaurant-menu/dish-sales/dish-sales.page.spec.ts
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no route, permission or server change; both pages stay owner (and acting consultant) only, staff
  still see only «המסך זמין לבעל העסק בלבד»; the money columns stay owner-only as in plan 725.
- INV-4: preserves — no schema change; no stored field is added, renamed or dropped (the cost column is only no
  longer drawn on the sales page; the frozen cost stays stored).
- INV-none: preserves — module gating is unchanged (`dish_analysis` on the routes and the header link, plan 725/726);
  no AI call, no new collection, no CSP change.

## Reuse Check
- Menu filter panel (course chips + removed toggle in `shell-filters`) — family: list-page — rung: 1 — why: the
  products/suppliers pattern as is: `.c-filter-section`, `.c-filter-category`, `.c-chip-group`, `.c-chip--toggle`,
  `useResponsivePanelState`, `useCollapsibleCategories`, `.c-filter-clear`
- Row edit / remove / restore icons — family: list-page — rung: 1 — why: `app-row-actions-menu` with `.c-icon-btn`
  (pencil, trash-2 `.danger`, rotate-ccw) as on the suppliers list
- Month pager on the sales page — family: list-page — rung: 1 — why: `shell-pagination` + `.c-pagination-controls`
  with the existing chevron buttons; no new piece
- `.ds-row__actions` page-local wrapper for the fill-zero and save buttons — family: engine-classes — rung: 3 — why: a flex wrapper so the header gets one action child; no `.c-*` class

## Defaults

- confirm-destructive-action — applies — how: the trash icon keeps plan 725's `ConfirmModalService` danger question
  «להסיר את "{{name}}" מהתפריט? …»; cancel changes nothing.
- empty-state-on-list — applies — how: the empty menu keeps `app-empty-state` «עוד אין מנות בתפריט» with the add
  button; a filter or search that matches nothing keeps «אין מנות שמתאימות לחיפוש»; the sales page keeps its empty
  state and link.
- loading-and-error-states — applies — how: unchanged `app-loader` and the error with «נסה שוב» on both pages; on the
  sales page the month pager stays above the error so another month can be tried.
- unsaved-changes-on-leave — applies — how: unchanged — the sales page's `useUnsavedChanges` + `pendingChangesGuard`
  with `runGuardsAndResolvers: 'paramsOrQueryParamsChange'` still asks when an arrow changes `?month=`.
- hints-in-tooltips — applies — how: the VAT note («המחירים כוללים מע"מ 18%; …» or «עוסק פטור: המחיר הוא הנטו») moves
  from a text line to the `title` of the «מחיר ללא מע"מ» column title; the arrows keep their `aria-label` and gain the
  same `title` («החודש הקודם» / «החודש הבא»).
- leave-and-return — exception — why: the filters are page state only, as before (plan 725 kept them out of the
  URL); nothing here opens another page and comes back.
- app-list-container — applies — how: both pages stay on `app-list-shell`; the filters now use its panel and the
  month pager its `shell-pagination` row, like the products list.
- one-breakpoint-set — applies — how: only `$break-phone-max` from `core/styles/breakpoints`; no new `@media` width.
- anchored-popup — exception — why: no new popup; `app-row-actions-menu` is the shared row menu.
- unit-dropdown-add — exception — why: no unit dropdown on either page.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef owner, I want to filter my menu from the same panel as every other list, so I do not hunt for the
  filters inside the table.
- As a chef owner, I want plain column titles and a profit percent of its own, so I read each dish's profit at a glance.
- As a chef owner, I want visible arrows between months on the sales page, so I can fill or check last month.
- As a chef owner, I want the sales page to show only what I type, so it is short and clear.

## Functional Requirements

### Must Have (P0)
- [ ] **Menu filters in the panel (item 1):** remove the `.rm-row__filters` header cell and its styles. The list shell
  gets `[isPanelOpen]="isPanelOpen_()"` and `(panelToggle)="togglePanel()"` from `useResponsivePanelState('restaurant-menu')`.
  `shell-filters` holds a `.c-filter-section` with one `.c-filter-category` «סוג מנה» (`menu_dish_col_type`,
  collapsible through `useCollapsibleCategories()`, count badge when something is picked): a `.c-chip-group` of
  `.c-chip--toggle` checkboxes, one per course some dish uses (registry order, as `courseChips_()` today) plus «ללא
  סוג מנה» (`menu_dish_no_type`); and a separate `.c-chip-group` with the «הצג מנות שהוסרו» toggle (keeps
  `data-testid="menu-dish-show-removed"`). The course filter becomes a set (`courseFilter_ = signal<ReadonlySet<string>>`,
  empty = every dish; `NO_COURSE` in the set = dishes with no course). `shell-filter-clear`: «נקה סינון»
  (`clear_filters`, `.c-btn-ghost--sm c-filter-clear`) while a type is picked or the removed toggle is on; it empties
  the set and turns the toggle off.
- [ ] **VAT note:** `vatNote_()` moves to `[attr.title]` on the «מחיר ללא מע"מ» column title (text unchanged).
- [ ] **Column titles (item 2):** new keys — `menu_dish_col_type` «סוג מנה», `menu_dish_col_net` «מחיר ללא מע"מ»,
  `menu_dish_col_profit` «רווח», `menu_dish_col_profit_pct` «רווח באחוזים». The old keys stay (the dish popup still
  uses `menu_dish_course`, `menu_dish_net_price`, `menu_dish_left`). The sales page's course column title uses
  `menu_dish_col_type` too.
- [ ] **Profit percent column:** a new column after «רווח»: `profitPct = left ÷ net × 100`, shown with `formatPct1`
  (for example «75.0%») when `left` and a non-zero `net` exist, else «—» (or `menu_dish_left_unknown` «לא מלא» for a
  priced dish whose cost is partial / units, as the «רווח» cell does). The `(foodCostPct)` text in the «רווח» cell is
  removed. Desktop grid: `'minmax(8rem, 2fr) 1fr 1fr 1fr 1.2fr 1fr 1fr 3rem'`; the phone grid is unchanged (name,
  price, cost, actions; type, net, profit and profit % are `.rm-row__wide`).
- [ ] **Net numbers only (item 3):** the net cell shows `money(row.net)` with no word before it.
- [ ] **Icon actions:** inside `app-row-actions-menu`, `button.c-icon-btn` with `lucide-icon name="pencil"`
  (`aria-label` «עריכה», keeps `data-testid="menu-dish-edit"`), and for an active dish `button.c-icon-btn.danger`
  with `trash-2` (`aria-label` and `title` «הסר מהתפריט», `menu-dish-remove`); for a removed dish `button.c-icon-btn`
  with `rotate-ccw` (`aria-label` and `title` «החזר לתפריט», `menu-dish-restore`). `$event.stopPropagation()` on
  each, as the suppliers list does. Behaviour of remove / restore unchanged.
- [ ] **Month arrows visible (item 4):** the month group moves from `shell-actions` to `shell-pagination`: a
  `div.c-pagination-controls` (`data-testid="dish-sales-months"`) with the prev button (`chevron-right`), the month
  label (`dish-sales-month`) and the next button (`chevron-left`, off at this month); buttons are
  `c-btn-ghost c-btn-ghost--sm` with `aria-label` and `title` («החודש הקודם» / «החודש הבא»). It shows in every state
  (loading, error, empty, closed). «סמן ריקים כ־0» and «שמירה» stay in `shell-actions` wrapped in one
  `div.ds-row__actions` (flex, `gap: var(--space-2)`), so the header gets a single action child.
- [ ] **No cost on the sales page (item 5):** remove the cost header, the cost cell, the «העלות לפי מחירי היום ותוקפא
  בסגירת החודש» line and the page's `MenuDishCostService` / `PartialCostBadgeComponent` use. Grid:
  `'minmax(8rem, 2fr) 1fr 7rem 7rem 9rem'`; phone grid `'minmax(4rem, 2fr) 4.5rem 4.5rem 5.5rem'` (unchanged).
- [ ] **Reasons only after returns (item 6):** the reasons cell stays (so the columns line up) but draws the «סיבות»
  button only when `canOpenReasons(id)` (returned > 0); with reasons given above the returned count the red
  `ds-row__reasons--over` state still shows, so a save that is blocked still has its button.
- [ ] **Specs replay each reported break** (see Goals): menu filters in the panel, titles, net without «נטו»,
  profit %, icon actions; the arrows reachable at their point with the real list shell and page header; no cost
  cell; no reasons button without returns.

### Should Have (P1)
- [ ] `src/app/pages/breadcrumbs.md`: the `restaurant-menu/` line says the filters sit in the list's filter panel and
  the sales page's month pager sits above the column titles.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- Page recipe: recipe-list — «תפריט המסעדה» (`/restaurant-menu`).
- Page recipe: recipe-list — «מכירות החודש» (`/restaurant-menu/sales`).
- RTL; logical properties only. The right arrow (`chevron-right`) is the older month, the left one the newer, as on
  «הזמנות» (`bookings.page.html`).
- Dictionary keys (append-only, `general`): `menu_dish_col_type` ("סוג מנה"), `menu_dish_col_net` ("מחיר ללא
  מע\"מ"), `menu_dish_col_profit` ("רווח"), `menu_dish_col_profit_pct` ("רווח באחוזים"), `menu_dish_no_type`
  ("ללא סוג מנה"). The VAT spelling follows the existing keys (`מע"מ` with an ASCII quote, as `menu_dish_price_with_vat`).
- Reused keys: `clear_filters` «נקה סינון», `edit` «עריכה», `menu_dish_remove` «הסר מהתפריט», `menu_dish_restore`
  «החזר לתפריט», `menu_dish_show_removed`, `dish_sales_prev_month`, `dish_sales_next_month`.
- Icons `pencil`, `trash-2`, `rotate-ccw`, `chevron-right`, `chevron-left`, `sliders-vertical` are registered
  (`src/app/app.config.ts`); each spec adds the ones it renders to its own icon pick.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Move the menu's type chips and removed toggle into the list's filter panel, like the products list — panel state, collapsible «סוג מנה» category, set filter, clear button, VAT note as the net title's hint — src/app/pages/restaurant-menu/restaurant-menu.page.ts, .html, .scss
- [x] A2: Rename the menu columns, show net prices as plain numbers and add a profit percent column — new keys, profitPct, grid templates — src/app/pages/restaurant-menu/restaurant-menu.page.ts, .html, .scss
- [x] A3: Use the app's edit, remove and restore icons on each menu row instead of text buttons — c-icon-btn in app-row-actions-menu — src/app/pages/restaurant-menu/restaurant-menu.page.html
- [x] A4: Prove the menu fixes with unit tests — filters in the panel, multi-type and no-type filter, clear, titles, no «נטו», profit 75 and 75.0%, icon buttons — src/app/pages/restaurant-menu/restaurant-menu.page.spec.ts
- [x] A5: Put the month arrows above the sales list where nothing covers them, and keep fill-zero and save visible — shell-pagination pager, one actions wrapper — src/app/pages/restaurant-menu/dish-sales/dish-sales.page.html, .scss
- [x] A6: Drop the cost column from the month sales page and show reasons only on dishes that had returns — src/app/pages/restaurant-menu/dish-sales/dish-sales.page.ts, .html, .scss
- [x] A7: Prove the sales fixes with unit tests, including one that fails while the save button covers the arrows — elementFromPoint with the real list shell, no cost cell, reasons button only after returns — src/app/pages/restaurant-menu/dish-sales/dish-sales.page.spec.ts
- [x] A8: Add the Hebrew words, update the pages map and run every automatic check — keys of UI/UX Notes; paste outputs under Execution Notes — public/assets/data/dictionary.json, src/app/pages/breadcrumbs.md

## What happens when
- The sales page loads with a closed month: the pager still moves between months; the closed banner stays in the
  intro header cell; no cost is shown (the frozen cost is stored, only not drawn).
- The menu panel is open on a phone: `useResponsivePanelState` keeps it closed on phones by default, as on the other
  lists; opening it there shows the same categories.
- A course used by no dish any more: its chip disappears (as today); if it was picked, the set keeps the key and the
  list shows no dish of it until «נקה סינון» — behaviour: the builder drops picked keys that are no longer offered.
- Returned is cleared while the reasons popup is closed: the reasons are dropped with the existing toast
  «הסיבות נמחקו כי לא הוזנו החזרות» and the button disappears.

## Technical Considerations
- The run branch is cut from `orch/biz-numbers` (7c135d5b), which holds plans 723–729; none of these files exist on
  `main` yet.
- Root cause of item 4 is the shared `page-header` list layout placing all action children in one cell. This plan
  fixes the page (one action child); a shared fix in `src/app/shared/page-header/page-header.component.scss` (lay
  several actions out side by side) is left out because plan 744 on `main` also edits `src/app/shared/page-header/**`
  — see Out of Scope.
- The arrow spec needs a real layout: render `DishSalesPage` with the real `ListShellComponent` (no stub), append the
  fixture element to `document.body` with a fixed width (for example 1200px), `detectChanges`, then compare
  `document.elementFromPoint(centre of the button)` with `button.contains(...)`. Plan 645's header spec
  (`header.component.spec.ts`, "above the route-loading overlay") is the pattern.
- Plans 745/746 on `main` change how list columns fall into a carousel; they do not touch these pages (not on `main`),
  so the later merge of `orch/biz-numbers` into `main` has no overlap here. Plan 744 (shared tooltip, on `main`) is
  not on this branch: hints use `[attr.title]`.
- Dependencies: plans 725, 726 (pages, `MenuDishCostService`, `month-key.util.ts`), `list-shell`, `page-header`,
  `row-actions-menu`, `panel-preference.util.ts`, `collapsible-categories.util.ts`.
- Model changes: none. Backend / API: none. Data / migration: none.

## Out of Scope
- A shared fix in `page-header` for several action children, and the stock count page (`stock-count.component.html:30-49`,
  a date field and «סיום ספירה» in the same cell) — follow-up for the Planner after this branch reaches `main`.
- Keeping the menu filters in the URL (`useListState`).
- The dish popup's own labels («קורס», «נטו», «נשאר למנה» inside `menu-dish-dialog`) — Dandan named the list only.
- The sales page's intro cell (progress line and closed banner above the column titles).

## Critical Questions
- none — every item is Dandan's grading of 2026-11-26; choices he did not state are `behaviour:` decisions below.

## Execution Notes
- Planner 2026-11-26: written from Dandan's grading of run biz-numbers.
- behaviour: «רווח באחוזים» is profit ÷ net price (100% − food cost %), not the food-cost share shown before — reverse: show cost ÷ net under the title «עלות מזון באחוזים».
- behaviour: the VAT note becomes the hint of the «מחיר ללא מע"מ» column title instead of a visible line — reverse: show it as a line at the top of the filter panel.
- behaviour: the course filter becomes multi-pick toggle chips (the products list pattern) instead of one-at-a-time tab chips — reverse: keep single pick inside the panel.
- behaviour: the month arrows move to the pager row above the column titles instead of staying in the header — reverse: keep them in the header inside one wrapper with fill-zero and save.
- behaviour: the «העלות לפי מחירי היום…» line goes with the cost column — reverse: keep the line.
- behaviour: the sales page's course column is titled «סוג מנה» too — reverse: keep «קורס» there.
- behaviour: (builder) the desktop actions column is `6.5rem`, not the written `3rem`: two 2.25rem icon buttons plus the cell padding do not fit in 3rem and would cover the percent column — reverse: set the last desktop track back to `3rem`.
- behaviour: (builder) a picked type that no dish uses any more is dropped from the filter — reverse: keep the key until «נקה סינון».
- removes: on a phone the VAT note can no longer be read (its column title is hidden there and there is no hover) — reverse: show `vatNote_()` as a line at the top of the filter panel.
- Step 0: drift listed 711cd215 and a34fc0e3; neither is an ancestor of HEAD, and `git diff 7c135d5b HEAD` touches only `.kit/` and `plans/` → 711cd215 ok, a34fc0e3 ok.
- Before the fix, `ng test --include=…/dish-sales.page.spec.ts` with the new tests → exit 1, 4 FAILED of 19 (at 1200px `dish-sales-prev`, `-next`, `-save` were not what is hit at their point).
- After: `ng test --include="src/app/pages/restaurant-menu/**/*.spec.ts"` → exit 0, TOTAL: 50 SUCCESS.
- `pnpm run build` → exit 0; `pnpm run lint` → exit 0 (0 errors, 69 warnings); `pnpm run test:ci` → exit 0, TOTAL: 2924 SUCCESS.
- `pnpm run lint:icons` → exit 0 (113 icons, 0 violations); `pnpm run lint:no-native-select` → exit 0.
- `scope-check --diff=origin/orch/biz-fixes` → `SCOPE: ok`; `--arch` → `ARCH: ok INV-1, INV-4, INV-none`; `--reuse` → `REUSE: ok`, exit 0.
- `kit-checks.mjs` → first run exit 1 (`style-duplicate-block dish-sales.page.scss:14`), fixed with `white-space: nowrap` on `.ds-row__actions`; then `KIT_CHECKS: ok (6 checks)`.
- `kit-manifest-check` → `KIT_MANIFEST: ok`; `override-check` → ok; `plan-ledger-check` → OK; `breadcrumbs-check` → `BREADCRUMBS: clean`; `ci-scope-check --checkout-branch` → exit 0 (skipped: branch name read as empty); `log-query --since=plan-start --level=error` → `SKIP: no database configured`.
- [human] items: not checked (no running app in the builder folder).
