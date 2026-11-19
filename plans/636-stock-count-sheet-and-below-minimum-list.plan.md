# Plan 636 — Stock count sheet screen and the below-minimum list

Status: draft
Depends-on: 635
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
After 635 the server keeps stock counts, but nobody can enter one. A chef needs one screen in the inventory area to
walk the shelves, type what is there in the unit he sees, save half way, and close the count. Once a count is closed
the kitchen can finally see which products are under their minimum: today the "low stock" number on the dashboard
counts every product that has a minimum and compares it with nothing (brief MP-12, map delta 6).

Verified on `origin/main` (e916e48e, 2026-11-17):
- The inventory chip group has two chips: `products` → `/inventory/list` and `equipment` → `/inventory/equipment`
  (`src/app/core/components/tab-chips/tab-chips.component.ts:60-63`); every URL under `/inventory` maps to that group
  (line 35). `src/app/core/components/tab-chips/tab-chips.component.spec.ts:77-83` asserts the exact list `['/inventory/list', '/inventory/equipment']`
  on both inventory screens (628 adds a chip before this plan runs; this plan appends after whatever is there).
- The `inventory` route (`src/app/app.routes.ts:66-118`) lazy-loads `InventoryPage` (its template is one
  `<router-outlet>`) with lazy children `list`, `add`, `import`, `edit/:id`, `equipment`, `equipment/add`,
  `equipment/edit/:id`; the form children carry `canDeactivate: [pendingChangesGuard]`.
- Shared pieces: `app-list-shell` (`src/app/shared/list-shell/`: inputs `isPanelOpen`, `gridTemplate`,
  `mobileGridTemplate`, `resultCount`, `resultTotal`; output `panelToggle`; slots `shell-title`, `shell-search`,
  `shell-actions`, `shell-table-header`, `shell-table-body`, `shell-filters`; its filter button is always shown),
  `app-counter` (`src/app/shared/counter/`: `value` required number, `min` 0, `max`, `stepOptions`, `disabled`, output
  `valueChange`), `app-custom-select` (`options: { value, label }[]`, `translateLabels` true, `compact`, output
  `valueChange`), `app-empty-state` (`messageKey`, `icon`, `ctaLabelKey`, `ctaClick`), `app-date-field` (ISO date
  value), `app-loader`.
- Products in the browser: `KitchenStateService.products_` (`src/app/core/services/kitchen-state.service.ts:37`); a
  `Product` has `baseUnit`, `purchaseOptions: { unitSymbol, conversionRate, uom? }[]`, `minStockLevel`
  (`src/app/core/models/product.model.ts:27-36`). The product form's minimum field is a bare number with no unit
  beside it (`product-form.component.html:379`).
- The existing "low stock": `lowStockProducts_ = products_().filter((p) => p.minStockLevel > 0)`
  (`kitchen-state.service.ts:51`) and the server's `GET /api/v1/data/products/count?filter=lowStock`
  (`server/routes/generic.js:363-370`, `minStockLevel: { $gt: 0 }`). It is shown in three places: the dashboard KPI
  card (`src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html:65-67`, value
  `lowStockCount_`, `dashboard-overview.component.ts:105`), which opens `/inventory?lowStock=1` (line 175-179); the
  product list's "מלאי נמוך" badge on a row (`inventory-product-list.component.html:174`); and that list's "low stock
  only" filter (html:306, ts:328). This plan leaves all three as they are.
- HTTP: paths come from the `API` map in `src/app/core/services/http-storage.adapter.ts:9-23`; it has no `stock` entry.
  A page-scoped HTTP service has a precedent (`src/app/pages/public-request/services/public-request.service.ts`); the
  inventory page keeps its services in `src/app/pages/inventory/services/`.
- Leaving with unsaved work: `pendingChangesGuard` (`src/app/core/guards/pending-changes.guard.ts:38`) calls the
  component's `hasRealChanges()` and, when it has one, `saveAndWait()`; `warnBeforeUnload`
  (`src/app/core/utils/leave-warning.util.ts:11`) covers reload and tab close.
- Dictionary: every key below was checked and is free (`stk_*`); reused keys that exist: `retry` "נסה שוב",
  `no_products_match` "אין מוצרים התואמים את הסינון", `search` "חיפוש", `product` "מוצר", `base_unit` "יחידת בסיס".
- Icons already registered in `src/app/app.config.ts`: `list-checks`, `alert-triangle`, `save`, `check`, `search`,
  `x`. No new icon is needed, so this plan does not write `app.config.ts`.
- `[ui]` specs sign in with `signInQa` (`e2e/helpers/qa-session.ts`) and may seed through the API with the session
  token (`e2e/ui/612-1.spec.ts` is the shape).
- From 635 (merged first): `POST /api/v1/stock/counts`, `PUT /counts/:id`, `POST /counts/:id/finalize`,
  `GET /counts?status=draft|final&limit=`, `GET /on-hand`; errors `UNIT_NOT_CONVERTIBLE` / `UNKNOWN_PRODUCT` / `DUPLICATE_PRODUCT` with `line`, `COUNT_FINAL`
  (409), `EMPTY_COUNT`; types in `@schemas/stock/stock-count-input.schema`; `toBase` in `@schemas/units/to-base`;
  drafts are read through `GET /api/v1/stock/counts?status=draft&limit=` (newest first, lines included).

## Goals & Success Criteria
**Primary:** from the inventory chips a member opens a count sheet, counts products in the unit on the shelf, saves a
draft, comes back to it, finalises it, and then sees the products whose counted stock is under their minimum.

- [auto] `pnpm run test:ci` passes, including the new `src/app/core/utils/stock-count.util.spec.ts`, `src/app/pages/inventory/services/stock-count.service.spec.ts`, `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts`, `src/app/pages/inventory/components/stock-count/stock-below-minimum/stock-below-minimum.component.spec.ts` and the updated `src/app/core/components/tab-chips/tab-chips.component.spec.ts`.
- [auto] `src/app/core/utils/stock-count.util.spec.ts`: a product with minimum 10 and on-hand 4 is listed, on-hand 10 is not, on-hand 12 is not, a product with a minimum and no on-hand row is not listed and is counted in `uncounted`; unit options of a `kg` product with a crate are `kg`, the crate, `gram` in that order.
- [auto] `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts`: changing a row's amount marks it counted; "save draft" posts only counted rows; a second save uses `PUT` with the same id; an answer `UNIT_NOT_CONVERTIBLE` with `line: 1` marks that row; finalise is disabled with no counted row.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/inventory/list`, press the chip "ספירת מלאי" → the page shows the title "ספירת מלאי" (`e2e/ui/636-1.spec.ts`).
- [ui] On `/inventory/count`, set the amount of a seeded product "E2E 636 קמח" to 3 and press "שמירת טיוטה" → the message "הטיוטה נשמרה" appears (`e2e/ui/636-2.spec.ts`).
- [ui] On `/inventory/count` with one counted row, press "סיום ספירה" → the message "הספירה נסגרה" appears (`e2e/ui/636-3.spec.ts`).
- [ui] With a seeded product "E2E 636 סוכר" (minimum 10) and a final count of 4 made through the API, open `/inventory/count` and press "מתחת למינימום" → a row shows "E2E 636 סוכר" (`e2e/ui/636-4.spec.ts`).
- [human] Dandan counts ten real products on a phone, in crates and in kilos, leaves the screen in the middle, comes back to the draft and closes it: the sheet is comfortable to use with one hand and the numbers in the below-minimum list are the ones he expects.

## Execution Mode
- Parallel: no — second plan of run `mod-stock`, after 635. It appends to `public/assets/data/dictionary.json`, `src/app/app.routes.ts` and `src/app/core/components/tab-chips/tab-chips.component.ts`, which 620, 623, 624, 628, 629, 630, 632, 634 and 637 also append to: one screen run at a time. It also adds one line to `src/app/core/services/http-storage.adapter.ts`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/stock-count/**
src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
src/app/pages/inventory/components/stock-count/stock-below-minimum/stock-below-minimum.component.spec.ts
src/app/pages/inventory/services/stock-count.service.ts
src/app/pages/inventory/services/stock-count.service.spec.ts
src/app/core/utils/stock-count.util.ts
src/app/core/utils/stock-count.util.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/components/tab-chips/tab-chips.component.ts
src/app/core/components/tab-chips/tab-chips.component.spec.ts
src/app/app.routes.ts
public/assets/data/dictionary.json
e2e/ui/636-1.spec.ts
e2e/ui/636-2.spec.ts
e2e/ui/636-3.spec.ts
e2e/ui/636-4.spec.ts
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — a new lazy screen and a page-scoped HTTP client; every write goes to `/api/v1/stock` (635), where the server scopes, authorises and computes the base amounts; no data service, registry, permission file or schema is edited, and the browser never loops one write per line.

## Reuse Check

- Count sheet list (`StockCountComponent`) — family: list-page — rung: 1 — why: `app-list-shell` as it is (title, search, actions, table slots, filter panel).
- Amount box on a row — family: stepper — rung: 1 — why: `app-counter` as it is (`min` 0).
- Unit picker on a row — family: search-combobox — rung: 1 — why: `app-custom-select`, the family's piece for one value of a short fixed list; no add-new option.
- "Counted" mark on a row and the three "show" choices in the filter panel — family: chip — rung: 1 — why: `c-chip c-chip--toggle` from `src/styles.scss`.
- Sheet / below-minimum switch — family: chip — rung: 1 — why: two `c-chip c-chip--tab` buttons.
- Count date — family: form-field — rung: 1 — why: `app-date-field` as it is.
- Empty and failed-load states — family: empty-state — rung: 1 — why: `app-empty-state` with a message key and, on a failed load, the `retry` action.
- Waiting and messages — family: feedback — rung: 1 — why: `app-loader`, `UserMsgService`, `LoggingService`.
- Leave with unsaved rows — family: entity-form — rung: 1 — why: `pendingChangesGuard` with `hasRealChanges()` / `saveAndWait()` and `warnBeforeUnload`.
- `StockCountService` (`src/app/pages/inventory/services/stock-count.service.ts`) — family: http — rung: 3 — why: a page-scoped client of the new `API.stock` paths, like `PublicRequestService`; `HttpClient` + the `API` map, never a hand-built URL.
- `stock-count.util.ts` (`unitOptionsFor`, `belowMinimum`, `countedAtFromIso`) — family: helpers — rung: 3 — why: pure helpers in `src/app/core/utils/` with a spec; conversion itself is the shared `toBase`, not a new rule.
- `StockBelowMinimumComponent` (`app-stock-below-minimum`) — family: list-page — rung: 2 — why: a read-only four-column table drawn with the existing `.c-list-row` engine classes; it has no search, selection or filters, so it does not need a second shell.
- Scoped classes of the two components (the component `stock-below-minimum` with its layer `.stock-below-min`, the engine class `.c-list-body-cell` used as a child selector, `.stock-count__tabs`, `.stock-count__state`, `.stock-count__draft-note`, `.stock-count__filter-title`, `.stock-count__error-icon`, `.stock-count__row--error`, `.stock-count__base`, `.stock-count__counted`, `.stock-below-min__head`, `.stock-below-min__row`, `.stock-below-min__state`, `.stock-below-min__note`) — family: list-page — rung: 2 — why: layout glue in component-scoped SCSS (no new `.c-*` class), colours from `--color-*` tokens.
- Chip "ספירת מלאי" in the inventory group — family: chip — rung: 1 — why: one more entry in `CHIPS_BY_GROUP.inventory`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want one sheet with all my products so that I can walk the shelves and type what I see.
- As a chef, I want to count in crates, jars or kilos so that the app does the conversion, not me.
- As a chef, I want to save in the middle and continue later, on another device too, so that a delivery at the door does not cost me the count.
- As an owner, I want to see which products are under their minimum after a count so that I know what to order.
- As a staff member, I want to do the count myself so that the owner does not have to.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-STOCK (635; used by 636, 637)**
  - `stockCounts`: `{ ...baseDocShape, countedAt, status: 'draft' | 'final', source: 'manual' | 'voice' | 'text',
    draftIds?: string[] (≤ 20), note? (≤ 500), lines: [{ productId, quantity (≥ 0), unit, baseQuantity (≥ 0) }] (≤ 2,000), finalAt?,
    finalBy? }`. Written only by the router; `baseQuantity` is computed by the server. Index
    `{ businessId, status, countedAt: -1 }`. A count is never deleted in this program: a draft is continued or made final.
  - `/api/v1/stock`: `POST /counts`, `PUT /counts/:id` (draft only; its creator or the owner),
    `POST /counts/:id/finalize` (its creator or the owner; it also confirms every pending draft in `draftIds`
    through `confirmAiDraft`, and a failure there never fails the finalise), `GET /counts?status=draft|final&limit=`
    (any member; newest first; 20 by default, 100 at most), `GET /on-hand` → `[{ productId, baseQuantity,
    countedAt }]` — per product, the value in the newest final count that lists it.
  - Conversion to the base unit uses the product's `baseUnit`, its `purchaseOptions` and the unit rates. Step 0: the
    rule is `toBase(amount, unit, product, units)` in `src/app/core/engine/units.ts`, browser-only. 635 moves it
    unchanged to `shared/schemas/units/to-base.ts` (with `normalizeUnit`, `unitFamily` and what they need);
    `units.ts` re-exports it, so the browser has no second rule. On the server the rates are the `gramRate` of the
    `unit` taxonomy terms (master ∪ the business's own) over the system units. A unit that cannot be converted for a
    product answers 400 `UNIT_NOT_CONVERTIBLE` with the line index.
  - `POST /api/v1/ai/stock/extract` body `{ text (1–20,000), fileId? }` — any member; `feature: 'stock_extract'` →
    `{ draftId, lines: [{ productId, quantity, unit }], unmatched: [{ spoken, quantity?, unit? }] }`. The server
    sends the numbered names of the business's live products (≤ 800; more → 413 `TOO_MANY_PRODUCTS`), the model
    answers positions; an out-of-range position goes to `unmatched`.
- [ ] Route: a lazy child `{ path: 'count', loadComponent: … StockCountComponent, canActivate: [authGuard], canDeactivate: [pendingChangesGuard] }` appended to the `inventory` children in `src/app/app.routes.ts`. No module guard: stock count is always on (C-MODULES "never gated").
- [ ] Chip: `{ id: 'stock-count', labelKey: 'stk_chip', icon: 'list-checks', path: '/inventory/count' }` appended as the last entry of `CHIPS_BY_GROUP.inventory`; `src/app/core/components/tab-chips/tab-chips.component.spec.ts` gains the new path at the end of the expected inventory list and a stub route for `inventory/count`.
- [ ] `API.stock = (path: string) => \`${API_ROOT}/stock/${path}\`` added to the `API` map in `http-storage.adapter.ts` (one line).
- [ ] `StockCountService` (page-scoped, `providedIn: 'root'`, no HTTP call in the constructor): `loadOnHand(): Promise<OnHandRow[]>` (`GET API.stock('on-hand')`); `loadOpenDraft(): Promise<StockCount | null>` — `GET API.stock('counts')` with the query `status=draft` and `limit=20`, keeps the drafts the caller may edit (the owner: any; staff: `createdBy` equals his user id), returns the one with the newest `updatedAt`; `saveDraft(input, id?)` — `POST API.stock('counts')` without an id, `PUT API.stock('counts/' + id)` with one; `finalize(id)` — `POST API.stock('counts/' + id + '/finalize')`. Types come from `@schemas/stock/stock-count-input.schema` and `@schemas/entities/stock-count.schema`.
- [ ] `src/app/core/utils/stock-count.util.ts` (pure): `unitOptionsFor(product)` → the product's base unit, then each purchase option's `unitSymbol` with `conversionRate > 0`, then, for a mass base, `gram` and `kg`, for a volume base, `ml` and `liter`; no duplicates. `belowMinimum(products, onHand)` → `{ rows: [{ product, baseQuantity, minStockLevel, countedAt }], uncounted: number }`: a row for each product with `minStockLevel > 0` whose on-hand `baseQuantity` is smaller than `minStockLevel` (both in the product's base unit), ordered by `baseQuantity / minStockLevel` ascending; `uncounted` = products with `minStockLevel > 0` and no on-hand row. `countedAtFromIso(iso, now)` → `now` when the date is today, else 12:00 local time of that date.
- [ ] The sheet (`StockCountComponent`, `app-list-shell`, table layout), view "דף ספירה":
  - Rows: every product of `KitchenStateService.products_()`, ordered by Hebrew name. Columns: product name · "נספר" toggle chip · amount (`app-counter`, `min` 0) · unit (`app-custom-select`, options from `unitOptionsFor`, labels through the dictionary, default the base unit) · the amount in the base unit (shown only when the unit is not the base unit, computed with the shared `toBase` and the unit registry, for display; the server computes the stored value).
  - A row becomes counted when its amount or unit is changed or its "נספר" chip is pressed (so a product with zero stock can be recorded); pressing the chip again takes the row out of the count and resets it to 0 and the base unit.
  - Header: title `stk_title`; search by product name (contains, through `normalizeHebrew`); the count date (`app-date-field`, default today, a later date is not accepted); actions "שמירת טיוטה" (`save` icon) and "סיום ספירה" (`check` icon, primary). The header count pill shows counted rows out of all products (`resultCount` / `resultTotal`).
  - Filter panel (the shell's own button): one group "הצגה" with three toggle chips — all · counted · not counted yet.
  - Open: the screen loads the on-hand list and `loadOpenDraft()`. With a draft, its lines fill the rows, its date fills the date field and a line under the header says `stk_draft_from` with the date the draft was last saved. With none, the sheet starts empty.
  - Save draft: sends `{ countedAt, source: 'manual', lines }` with the counted rows only. Success → message `stk_draft_saved`, the id is kept for the next save, the sheet is clean. The button shows `saving` and both actions are disabled while a request runs.
  - Finalise: disabled while no row is counted. It saves (as above), then calls `finalize`. Success → message `stk_finalized`, the sheet is emptied (no draft id, today's date), the on-hand list is reloaded and the view switches to "מתחת למינימום". No confirmation dialog.
  - Errors: 400 with `line` (`UNIT_NOT_CONVERTIBLE`, `UNKNOWN_PRODUCT`, `DUPLICATE_PRODUCT`) → the row at that position of the sent lines gets the error look and the message `stk_line_refused`; 409 `COUNT_FINAL` → message `stk_count_final`, the sheet is emptied and the draft lookup runs again; anything else → message `stk_save_failed`; every failure is logged with `logging.error({ event: 'stock.count.save_failed' })` (no product names). The typed rows stay on screen after a failed save.
  - Leave: with unsaved changes the route guard asks (the app's standard save / leave / stay question; "save" saves the draft); reload and tab close warn through `warnBeforeUnload`. There is no cancel button: leaving without saving drops the changes since the last save.
  - Empty: no products → `app-empty-state` `stk_empty_products`; search or "show" with no match → `app-empty-state` `no_products_match`. Failed load → `app-empty-state` `stk_load_failed` with the `retry` action.
- [ ] View "מתחת למינימום" (`app-stock-below-minimum`, inputs `rows` and `uncounted`): columns product name · on hand · minimum (both with the product's base unit, formatted with `formatQty` from `src/app/core/engine/rounding.ts`) · date counted (dd/mm/yyyy). The tab chip shows the number of rows (`c-chip__count`). No final count yet → `app-empty-state` `stk_no_final_count`; nothing under its minimum → `app-empty-state` `stk_empty_below_min` (icon `check`). When `uncounted > 0`, one line under the table: `stk_uncounted_note` with the number. Read-only: no action on a row.
- [ ] The existing "low stock" number, badge and filter are not touched (see Critical Questions).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only; numbers left-to-right inside their cells; no new `.c-*` class (the components use the engines in `src/styles.scss` and their own scoped SCSS). Phone first: on a narrow screen a row keeps name, amount and unit; the "נספר" chip and the base amount go to a second line (`mobileGridTemplate`). No virtual scroll (it does not work with the `.c-list-row` grid).
- State is signals: `rows_` (per product: counted, amount, unit), `draftId_`, `countedDate_`, `view_`, `show_`, `saving_`, `errorLine_`; `visibleRows_`, `countedCount_`, `below_` are `computed()`. Dependencies through `inject()`; `input()` / `output()` on the child. Both components are standalone, OnPush, lazy with the route.
- A minimum is read as an amount in the product's base unit. The product form shows no unit beside that field today; this plan does not change the form.
- New keys in `public/assets/data/dictionary.json` (section `general`, appended; all checked free):
  - `stk_chip` "ספירת מלאי" (chip: stock count) · `stk_title` "ספירת מלאי" (page title) · `stk_tab_sheet` "דף ספירה" (count sheet) · `stk_tab_below_min` "מתחת למינימום" (below minimum)
  - `stk_counted` "נספר" (counted) · `stk_col_amount` "כמות" (amount) · `stk_col_unit` "יחידה" (unit) · `stk_col_in_base` "ביחידת בסיס" (in the base unit) · `stk_count_date` "תאריך הספירה" (date of the count)
  - `stk_show` "הצגה" (show) · `stk_show_all` "הכול" (all) · `stk_show_counted` "מה שנספר" (counted) · `stk_show_uncounted` "מה שעוד לא נספר" (not counted yet)
  - `stk_save_draft` "שמירת טיוטה" (save draft) · `stk_finalize` "סיום ספירה" (finalise the count) · `stk_draft_saved` "הטיוטה נשמרה" (draft saved) · `stk_finalized` "הספירה נסגרה" (count closed) · `stk_draft_from` "ממשיכים טיוטה שנשמרה בתאריך {date}" (continuing a draft saved on {date})
  - `stk_save_failed` "שמירת הספירה נכשלה" (saving the count failed) · `stk_line_refused` "אי אפשר לשמור את השורה המסומנת. בדקו את היחידה" (the marked row cannot be saved, check the unit) · `stk_count_final` "הספירה הזו כבר נסגרה" (this count is already closed) · `stk_load_failed` "טעינת הספירה נכשלה" (loading failed)
  - `stk_empty_products` "אין עדיין מוצרים לספור" (no products to count yet) · `stk_no_final_count` "עוד לא נסגרה ספירה. אחרי ספירה ראשונה יופיעו כאן המוצרים שמתחת למינימום" (no closed count yet) · `stk_empty_below_min` "אין מוצרים מתחת למינימום" (nothing under its minimum)
  - `stk_col_on_hand` "במלאי" (on hand) · `stk_col_minimum` "מינימום" (minimum) · `stk_col_counted_on` "נספר בתאריך" (counted on) · `stk_uncounted_note` "{n} מוצרים עם מינימום עוד לא נספרו" ({n} products with a minimum have not been counted yet)
- Reused keys (exist): `retry`, `no_products_match`, `search`, `product`, `saving`.
- Lucide icons: `list-checks` (chip), `save`, `check`, `alert-triangle` (error row), `search`, `x` — all already registered in `src/app/app.config.ts`; `pnpm run lint:icons` confirms. No icon is added.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Add the pure rules of the sheet so they can be tested without a screen — unit options of a product, the below-minimum rows with the uncounted number, the count date; spec cases from the Done-when — src/app/core/utils/stock-count.util.ts, src/app/core/utils/stock-count.util.spec.ts
- [x] A2: Give the browser one client for the stock routes — the API map entry; loadOnHand, loadOpenDraft, saveDraft, finalize; spec with the HTTP testing controller (POST then PUT, draft choice for owner and staff) — src/app/core/services/http-storage.adapter.ts, src/app/pages/inventory/services/stock-count.service.ts, src/app/pages/inventory/services/stock-count.service.spec.ts
- [x] A3: Build the count sheet where a member marks, counts and picks the unit of each product — list shell, rows, counted chip, counter, unit select, base amount, search, date, show filter, empty states; all dictionary keys of this plan — src/app/pages/inventory/components/stock-count/stock-count.component.ts, .html, .scss, public/assets/data/dictionary.json
- [x] A4: Let the member save a draft, continue it later and finalise the count — open with the newest draft, save and finalise flows, the error cases with the marked row, the leave guard and reload warning; component spec — src/app/pages/inventory/components/stock-count/stock-count.component.ts, .html, src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
- [x] A5: Show which products are under their minimum after a closed count — the read-only table with its three empty cases and the uncounted note; the tab with its number; component spec — src/app/pages/inventory/components/stock-count/stock-below-minimum/stock-below-minimum.component.ts, .html, .scss, .spec.ts, src/app/pages/inventory/components/stock-count/stock-count.component.html
- [x] A6: Make the screen reachable from the inventory chips — the lazy child route with both guards; the chip as the last inventory chip; the chip spec's expected list and stub route — src/app/app.routes.ts, src/app/core/components/tab-chips/tab-chips.component.ts, src/app/core/components/tab-chips/tab-chips.component.spec.ts
- [x] A7: Write the four screen checks that run in the real app — chip to title; save draft message; finalise message; seeded product under its minimum listed (products and the final count seeded through the API with the session token, products removed at the end) — e2e/ui/636-1.spec.ts, e2e/ui/636-2.spec.ts, e2e/ui/636-3.spec.ts, e2e/ui/636-4.spec.ts
- [x] A8: Run every check of this plan and hand Dandan the one hand check — test:ci, build, lint, lint:icons, lint:reuse, log-query; evidence into Execution Notes; then the human card

## Technical Considerations
- Dependencies: `KitchenStateService.products_`, `UnitRegistryService` (rates for the displayed base amount), `PermissionService` / `UserService` (owner or creator, to choose the draft), `pendingChangesGuard`, the routes of 635.
- New files needed: `src/app/pages/inventory/components/stock-count/stock-count.component.{ts,html,scss,spec.ts}`, `…/stock-count/stock-below-minimum/stock-below-minimum.component.{ts,html,scss,spec.ts}`, `src/app/pages/inventory/services/stock-count.service.ts` (+ spec), `src/app/core/utils/stock-count.util.ts` (+ spec), `e2e/ui/636-1.spec.ts` … `636-4.spec.ts`.
- Model changes: none in `src/app/core/models`; the count types are the shared schema types.
- Backend / API: none — it calls 635's five routes; the generic data API is not used for counts.
- Auth and validation: the route needs a signed-in user (`authGuard`); the server decides who may edit or finalise (creator or owner) — the browser only chooses which draft to open. Input is bounded in the browser (amount ≥ 0, a unit from the product's options) and validated again by the server.
- Security surface: none new — no secret, no money field, no personal data; the failure log carries an event name and a status only.
- Data / migration: none.
- Project checks: `[auto] log-query` present; `pnpm run test:ci`; four `[ui]` specs with `signInQa`; every dictionary key named with its Hebrew value; icons named (all registered); Reuse Check lists every control; hotspots appended only (`dictionary.json`, `app.routes.ts`); units are picked from existing ones — the sheet has no "add a unit" option, so the Hebrew canonical-value flow of `docs/agent/standards-domain.md` is not triggered.

Every Atomic Sub-task names its files and is concrete enough for a Worker to run without asking (no "TBD",
"handle errors appropriately", "same as the other screen"). `/plan`'s Architect + PM review checks this.

## Out of Scope
- Counting by voice or text (637).
- A history screen of past counts and editing a final count.
- Deleting a draft or a count: there is no delete route in this program. A draft cannot be deleted; it is continued or finalised (to start over, the member unmarks the rows and saves).
- A note on a count (the record has the field; the sheet does not show it).
- The dashboard's "low stock" number, the product list's "מלאי נמוך" badge and its filter — unchanged (Critical Question below).
- Showing a unit beside the minimum field in the product form.
- Order suggestions or a supplier order from the below-minimum list.
- Printing or exporting the sheet.

## Critical Questions
- Q: The dashboard's existing "low stock" number counts every product that has a minimum, without comparing to stock. a) leave it as it is in this program; the new below-minimum list lives on the count screen (recommended) / b) make the existing number use the new on-hand figure once a final count exists A: a — the Human, 2026-11-17: the existing number stays as it is; the below-minimum list lives on the count screen.

## Execution Notes
- decided: the screen is `/inventory/count`, one route with two views (sheet, below minimum) — why: one chip, one lazy chunk, and the list is the result of the sheet.
- decided: the sheet lists every product and a row joins the count when it is touched or marked "נספר" — why: a shelf walk needs the whole list, and zero stock must be recordable.
- decided: unit choices are the base unit, the product's own pack units and the same-family metric pair — why: these are exactly the units the shared rule can convert for that product, so a save is not refused for a unit.
- decided: on open the newest draft the member may edit is continued — why: a draft cannot be deleted, so a second parallel draft would only be clutter; "save in the middle" must survive a device change.
- decided: drafts are found through `GET /api/v1/stock/counts?status=draft&limit=20` (Contract correction) — why: the generic list returns every count with all its lines and grows with each one.
- decided: no confirmation before finalise and no cancel button — why: brief rule 13 (no dialog nobody asked for); the only question the screen asks is the app's standard leave-with-changes one.
- decided: after finalise the screen switches to the below-minimum view — why: it is the result the person just produced.
- decided: a product with a minimum that was never counted is not called "below minimum"; one line gives their number — why: unknown stock is not low stock.
- decided: the minimum is compared in the product's base unit — why: it is the only unit the stored number can mean; the form shows none.
- decided: the client service is page-scoped in `src/app/pages/inventory/services/` — why: only this screen uses it, and it keeps `core/services` and its map untouched.
- decided: the filter panel carries one "show" group — why: the list shell always shows its filter button; an empty panel behind it would be a defect.
- Step 0 delta 6: where the old counter shows — dashboard KPI card, the product list badge, the product list filter (file:line in the Problem Statement).
- evidence: `pnpm run build` → exit 0; `pnpm run lint` → exit 0 (0 errors); `pnpm run test:ci` → exit 0, TOTAL 2577 SUCCESS; `lint:icons`, `lint:no-native-select`, `lint:reuse`, `override-check`, `plan-ledger-check`, `breadcrumbs-check`, kit-manifest-check, kit-checks, scope-check → ok; `log-query --level=error` → SKIP no database configured, exit 0.
- evidence: the four `[ui]` specs `e2e/ui/636-1..4.spec.ts` are written, not run (no app or QA login in this folder).
- behaviour: columns of a row are name · amount · unit · "נספר" chip · base amount (chip after the unit, not before the amount) — why: lets the phone grid put name, amount, unit on line one and chip + base amount on line two with plain CSS. Reverse: reorder the cells and the header in `stock-count.component.html`.
- behaviour: `app-stock-below-minimum` has a third input `hasFinalCount` — why: "no final count yet" cannot be told from "nothing under its minimum" with only `rows` and `uncounted`. Reverse: drop the input and show only `stk_empty_below_min`.
- behaviour: a future or cleared count date is clamped to today, and both actions stay disabled while the date is not a valid past-or-today date. Reverse: remove `setDate` clamping and `dateOk_`.
- behaviour: "save draft" is disabled when no row is counted and there is no draft yet. Reverse: drop that part of the `[disabled]` condition.
- scope extended: plans/636-stock-count-sheet-and-below-minimum-list.plan.md Reuse Check — declared the scoped classes and the stock-below-minimum component the kit check asked for.
- seen: docs/brain/component-families.md:562 — registry path `@schemas/units/to-base` and `server/generated/schemas/units/to-base` missing (`reuse-lint --check-registry`); from plan 635, not this plan.
