# Plan 726 — Type a month's dish sales and returns, with a reason for every return

Status: draft
Depends-on: 725
Track: code
Snapshot: 33a6c572

## Problem Statement
After plan 725 the owner has a standing menu with a cost per portion, but no sales: the app holds no count of a dish
sold or returned (feasibility `docs/finance/dish-analysis-feasibility.md` rows D4, D5, D6, D12; slice 3). The research
report "Restaurant dish and month analytics" ("Updated decisions", "Slice order changes": slice 3 unchanged) and
Dandan's answer of 2026-11-24 ("decisions: all recommended") set how:

- dish 2 (changed): typed months come first and stay the fallback for small menus and for returns; the file import
  with remembered aliases is a later slice, built only once a real export is in hand.
- dish 3 (keep): each return has a reason from a fixed list the owner can extend, with «אחר» and a note; the seed is
  returned by guest, kitchen mistake, staff meal, comp/goodwill, expired.
- dish 5 (refined) and N-X2: while the month is open the cost stays live; it freezes at the shared month close (a
  later plan, the same event as the monthly lock). This page says so and never freezes anything itself.
- N-M2 (shared rule): a dish whose count was not typed is «לא הוזן», never 0; 0 is a real answer.
- N-D5: the month is the unit of entry (the analysis may later combine up to three months).
- N-D4: names a later import skipped are listed on the month as «לא נספרו» (shown when present; nothing writes them yet).

Verified on `origin/main` 33a6c572, plus what plans 724 and 725 add:
- Plan 724: `dishSalesMonths` (one document per business and month, `rows[]` with `sold` / `returned` as
  `number | null`, `returnReasons[]`, server-owned `closedAt` / `frozen` / `skipped`), 409 `MONTH_EXISTS` and
  `MONTH_CLOSED`, `DISH_RETURN_REASONS`, taxonomy kind `dishReturnReason`, `MONTH_KEY_PATTERN`.
- Plan 725: `MenuDishDataService`, `MenuDishCostService`, the route `restaurant-menu`, the header link.
- `TaxonomyStore.terms(kind)` and `add(kind, key, extras)` (`src/app/core/services/taxonomy-store.service.ts:85`,
  `:155`); the "built-in keys + the business's own terms" pattern is `LogisticsItemRegistryService.sections_` /
  `sectionLabel` (`logistics-item-registry.service.ts:42-53`).
- Tab chips: `GROUP_BY_PATH_PREFIX` and `CHIPS_BY_GROUP` in `src/app/core/components/tab-chips/tab-chips.component.ts`
  (`:30-110`), each chip may carry `modules`; a group cut to fewer than two chips is hidden (`:146-147`).
- `pendingChangesGuard` + `useUnsavedChanges({ snapshot })` (`src/app/core/utils/unsaved-changes.ts:31`); the
  routes spec lists guarded paths (`src/app/core/guards/pending-changes-routes.spec.ts:18-24`).
- `app-counter` (`src/app/shared/counter/`), `app-custom-select` with `allowTypedAdd` (search-combobox family),
  `app-modal-shell`, `app-empty-state`, `app-partial-cost-badge`.
- No month-key helper exists in `src/app/core/utils/` (searched `monthKey|shiftMonth|addMonths`).

## Goals & Success Criteria
**Primary:** the owner picks a month, types for each dish how many were sold and returned, splits the returns by
reason, saves once, and finds exactly what he typed after a reload — with untyped dishes still «לא הוזן».

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0.
- [auto] `pnpm run test:ci` exits 0, including `src/app/core/utils/month-key.util.spec.ts`,
  `src/app/core/services/dish-sales-month-data.service.spec.ts`,
  `src/app/pages/restaurant-menu/dish-sales/dish-sales.page.spec.ts`,
  `src/app/pages/restaurant-menu/dish-sales/components/return-reasons-dialog/return-reasons-dialog.component.spec.ts`
  and the updated `src/app/core/components/tab-chips/tab-chips.component.spec.ts` and
  `src/app/core/guards/pending-changes-routes.spec.ts`.
- [auto] `src/app/core/utils/month-key.util.spec.ts`: `currentMonthKey(new Date(2026, 10, 30))` is `2026-11`;
  `shiftMonthKey('2026-01', -1)` is `2025-12`; `shiftMonthKey('2026-12', 1)` is `2027-01`; `isMonthKey('2026-13')` is false.
- [auto] `src/app/pages/restaurant-menu/dish-sales/dish-sales.page.spec.ts`: an empty box saves `null` and a typed 0
  saves `0`; a dish with nothing typed and no reasons sends no row; reason counts above `returned` block the save;
  a stored month opens with its numbers; a month with `closedAt` opens read-only with no save button.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/726-typed-monthly-dish-sales.plan.md` → `ARCH: ok`;
  `node scripts/scope-check.mjs --reuse --plan=plans/726-typed-monthly-dish-sales.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] On «תפריט המסעדה» the chips «תפריט» and «מכירות החודש» show; «מכירות החודש» opens this month (for example
  «נובמבר 2026»), the arrows move one month back and forward, and the forward arrow stops at this month.
- [human] Type sold and returned for two dishes, leave a third empty, type 0 for a fourth and press «שמירה»: the
  message «המכירות נשמרו» shows; after a reload the numbers are back, the third dish still says «לא הוזן» and the
  fourth shows 0; the line «הוזנו 3 מתוך 4 מנות» matches.
- [human] On a dish with 3 returned, «סיבות» opens a popup: give 2 to «הוחזר על ידי אורח» and 1 to «אחר» with a note;
  without a note «אחר» cannot be saved; giving a 4th return shows «פורטו 4 מתוך 3 החזרות» and the save is blocked.
- [human] In the same popup type a new reason «מנה קרה» and add it: it is selected, can take a count, and is offered
  again on another dish and in another month.
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page — here: with the server stopped, «מכירות החודש» shows «לא הצלחנו לטעון את המכירות» and «נסו שוב».
- [human] the list's page with no items · open the page · a message says the list is empty — here: «מכירות החודש» of a business with no dishes says «עוד אין מנות בתפריט» with a link to «תפריט המסעדה».
- [human] Type a number, then press the back arrow to another month or click another link: the app asks before
  dropping the typed numbers; «הישאר» keeps them.
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line — here: «מכירות החודש» on a phone, the two number boxes stay on the dish's line.

## Execution Mode
- Parallel: no with any open plan that edits `src/app/core/components/tab-chips/**` (the restaurant staging branch
  may add a group there: union the groups).
- Concurrent plans: 722, 723, 727, 728, 729.
- Isolated DB: no — writes only `dishSalesMonths` and `taxonomyTerms` of kind `dishReturnReason` (plan 724).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/restaurant-menu/dish-sales/**
src/app/pages/restaurant-menu/dish-sales/dish-sales.page.spec.ts
src/app/pages/restaurant-menu/dish-sales/components/return-reasons-dialog/return-reasons-dialog.component.spec.ts
src/app/pages/restaurant-menu/restaurant-menu.page.html
src/app/pages/restaurant-menu/restaurant-menu.page.spec.ts
src/app/core/models/dish-sales-month.model.ts
src/app/core/services/dish-sales-month-data.service.ts
src/app/core/services/dish-sales-month-data.service.spec.ts
src/app/core/utils/month-key.util.ts
src/app/core/utils/month-key.util.spec.ts
src/app/core/components/tab-chips/tab-chips.component.ts
src/app/core/components/tab-chips/tab-chips.component.spec.ts
src/app/core/guards/pending-changes-routes.spec.ts
src/app/app.config.ts
src/app/pages/breadcrumbs.md
src/app/core/services/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/breadcrumbs.md
src/app/core/components/breadcrumbs.md
docs/brain/component-families.md
docs/modules/modules-map.md
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
- INV-1: preserves — the month is saved through the generic API (`DishSalesMonthDataService` →
  `/api/v1/data/dishSalesMonths`), owner-only with `rows[].netSales` and `frozen` as money fields (plan 724); staff
  read base fields only and see the owner-only notice; a consultant acting with a live grant types like the owner.
  The page is gated on `dish_analysis` (`moduleGuard`, chips with `modules`); the server stays the gate.
- INV-3: preserves — a month is one document and one save (no per-dish write loop); a closed month is refused by the
  server (409 `MONTH_CLOSED`), and freezing stays with the later one-request month close.
- INV-5: preserves — the business's own return reasons are `taxonomyTerms` of kind `dishReturnReason`, added through
  `TaxonomyStore.add`; the six built-in reasons are code keys with dictionary labels.
- INV-none: preserves — no AI call, no schema or server change.

## Reuse Check
- `DishSalesPage` (`src/app/pages/restaurant-menu/dish-sales/`) — family: list-page — rung: 2 — why: `app-list-shell` with `app-page-header`, one row per dish
- `ReturnReasonsDialogComponent` — family: modal-shell — rung: 2 — why: `app-modal-shell` with `[hasChanges]`, centred, no sheet
- reason counts — family: stepper — rung: 1 — why: `app-counter`
- new reason picker — family: search-combobox — rung: 1 — why: `app-custom-select` with `allowTypedAdd` and the add-option row (rule W: the add saves the term, then selects it)
- `DishSalesMonthDataService` — family: entity-data-service — rung: 2 — why: extends `BaseEntityDataService<DishSalesMonth>`
- `month-key.util.ts` (`currentMonthKey`, `shiftMonthKey`, `isMonthKey`, `monthKeyLabel`) — family: helpers — rung: 3 — why: no month helper exists in `src/app/core/utils/`; one file with a spec, so the monthly plan page (727) can use it too
- restaurant tab group (`tab-chips.component.ts`) — family: chip — rung: 1 — why: one more group in `CHIPS_BY_GROUP` with `modules`
- `.ds-row__*` page-local cell widths (dish-sales.page.scss) — family: engine-classes — rung: 3 — why: column widths only on top of `.c-list-row`; no `.c-*` class

## Defaults

- confirm-destructive-action — exception — why: nothing is deleted; clearing a box and saving stores «לא הוזן», and the leave question guards unsaved typing.
- empty-state-on-list — applies — how: `app-empty-state` «עוד אין מנות בתפריט» with a link to «תפריט המסעדה».
- loading-and-error-states — applies — how: `app-loader` while the dishes and the month load; a failed load shows «לא הצלחנו לטעון את המכירות» with «נסו שוב»; a failed save keeps the typed numbers and shows the server's message (`dish_month_closed`, `dish_month_exists` from plan 724, else `dish_sales_save_failed`).
- unsaved-changes-on-leave — applies — how: `useUnsavedChanges({ snapshot })` over the typed rows, `pendingChangesGuard` on the route with `runGuardsAndResolvers: 'paramsOrQueryParamsChange'` so a month arrow (`?month=`) asks too; the reasons popup passes `[hasChanges]`.
- hints-in-tooltips — applies — how: the «לא הוזן» placeholder carries `[attr.title]` «ריק = לא הוזן; 0 = לא נמכרה אף מנה»; the cost line's explanation «העלות לפי מחירי היום ותוקפא בסגירת החודש» is a title on the cost column header, not text on the popup.
- leave-and-return — exception — why: the empty-state link to the menu is plain navigation with nothing typed yet.
- app-list-container — applies — how: `app-list-shell` + `app-page-header`; each dish one `.c-list-row` on one line at every width.
- one-breakpoint-set — applies — how: only the shared breakpoint names; no new `@media` width.
- anchored-popup — exception — why: the reasons popup is a centred `app-modal-shell` (plans 720–721), not a small floating box.
- unit-dropdown-add — exception — why: the page has no unit dropdown; counts are whole dishes.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef who owns a restaurant, I want to type once a month how many of each dish I sold and how many came back, so
  that the app can later tell me which dishes work.
- As a chef, I want every return to carry a reason from my own short list, so that I see whether returns come from the
  guests, the kitchen or staff meals.
- As a chef, I want a dish I have not typed yet to stay «לא הוזן», so that a gap never looks like a dish nobody ordered.
- As a consultant acting in a client's kitchen, I want to type the month for him from his till report.

## Functional Requirements

### Must Have (P0)
- [ ] **Route** `restaurant-menu/sales` (append to `app.routes.ts`, before the `restaurant-menu` route if order
  matters): `canActivate: [authGuard, moduleGuard(['dish_analysis'])]`, `resolve: { kitchenLoaded:
  kitchenDataEnsureLoadedResolver }`, `canDeactivate: [pendingChangesGuard]`,
  `runGuardsAndResolvers: 'paramsOrQueryParamsChange'`; `?month=YYYY-MM` (missing or bad → this month).
- [ ] **Tab chips** — group `restaurant` for the prefix `/restaurant-menu`: chips `restaurant-menu` («תפריט», icon
  `utensils`, `/restaurant-menu`) and `dish-sales` («מכירות החודש», icon `calendar-days`, `/restaurant-menu/sales`),
  both `modules: ['dish_analysis']`. The menu page's sales link comes from the chips; `restaurant-menu.page.html` needs
  no button.
- [ ] **Month helper** (`src/app/core/utils/month-key.util.ts`): `currentMonthKey(now)`, `shiftMonthKey(key, n)`,
  `isMonthKey(key)` (plan 724's `MONTH_KEY_PATTERN`), `monthKeyLabel(key)` (`Intl.DateTimeFormat('he-IL', { month:
  'long', year: 'numeric' })`).
- [ ] **Data** — `src/app/core/models/dish-sales-month.model.ts` re-exports `DishSalesMonth`, `DISH_RETURN_REASONS`;
  `DishSalesMonthDataService extends BaseEntityDataService<DishSalesMonth>` (`'dishSalesMonths'`, deferred):
  `monthOf(key)` (computed lookup), `saveMonth(key, rows, note?)` → POST when the month has no document, else PUT of
  the stored document with the new `rows` / `note`; on 409 `MONTH_EXISTS` it reloads once and retries as a PUT.
- [ ] **Page** (`DishSalesPage`): staff see only `restaurant_menu_owner_only` (plan 725). Otherwise a header with
  «מכירות החודש», the month label and «‹» / «›» (forward disabled at this month), and one line «הוזנו {{done}} מתוך
  {{total}} מנות · נמכרו {{sold}} · הוחזרו {{returned}}» (only typed numbers add up). Rows: every active menu dish
  plus any inactive dish that has a row in this month (marked «הוסרה מהתפריט»), sorted by course then name; each row:
  name, course, «נמכרו» and «הוחזרו» number boxes (integers ≥ 0; empty = `null`, placeholder «לא הוזן»), a
  «סיבות» button with the count of reasons given («סיבות (2/3)»; disabled while «הוחזרו» is empty or 0), and the live
  cost per portion from `MenuDishCostService` (badge for partial, «ללא עלות» for units only). A line under the header:
  «העלות לפי מחירי היום ותוקפא בסגירת החודש». «שמירה» saves the whole month in one request; a row is sent only when
  `sold` or `returned` is not null or it has reasons; each sent row carries `nameSnapshot` = the dish name and
  `source: 'typed'`. Success toast «המכירות נשמרו».
- [ ] **Closed month** (`closedAt` set by the later close): every box is read-only, no «שמירה», a banner «החודש נסגר
  ב־{{date}}; העלויות קפואות» and, when `frozen` is present, each row's cost from `frozen.dishes`.
- [ ] **Reasons popup** (`ReturnReasonsDialogComponent`, one dish): the six built-in reasons (dictionary
  `dish_return_reason_<key>`) then the business's own (`TaxonomyStore.terms('dishReturnReason')`, label = key), each
  with an `app-counter` (0 = not used); «אחר» opens a note box (≤ 200) that is required when its count > 0; a line
  «פורטו {{given}} מתוך {{returned}} החזרות» turns red and blocks «אישור» when given > returned; «הוספת סיבה»
  (`app-custom-select`, `allowTypedAdd`): adding saves a `dishReturnReason` term through `TaxonomyStore.add` and selects
  it with count 1; a failed add shows the taxonomy store's message. «אישור» returns the reasons to the page row (not
  saved until «שמירה»).

### Should Have (P1)
- [ ] «סמן ריקים כ־0» button: fills every empty «נמכרו» box with 0 after a confirm («לסמן {{n}} מנות כ־0 שנמכרו?»).
- [ ] When the stored month has `skipped`, a collapsed section «שמות שלא נספרו ({{n}})» lists each name with its units
  (written by the later import; N-D4).
- [ ] Maps: `src/app/pages/breadcrumbs.md` (`restaurant-menu/` gains `dish-sales/`), `core/services/breadcrumbs.md`
  (the data service), `core/models/breadcrumbs.md` (the model), `src/app/core/breadcrumbs.md` (`utils/` gains
  `month-key.util`), `docs/brain/component-families.md` (helpers: `month-key.util`), `docs/modules/modules-map.md`
  (browser side of `dish_analysis` gains the sales page and the chip group).

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; logical properties only; the two number boxes stay on the dish's line on a phone (the name is cut with an
  ellipsis first). `‹` moves to the earlier month and sits at the inline end in RTL as the other date arrows do.
- Icons `utensils`, `calendar-days`, `chevron-left`, `chevron-right` are registered (`src/app/app.config.ts`); any
  other icon used is registered there.
- Dictionary keys (append-only, `general`): `dish_sales` ("מכירות החודש"), `restaurant_menu_chip` ("תפריט"),
  `dish_sales_prev_month` ("החודש הקודם"), `dish_sales_next_month` ("החודש הבא"), `dish_sales_progress`
  ("הוזנו {{done}} מתוך {{total}} מנות · נמכרו {{sold}} · הוחזרו {{returned}}"), `dish_sales_sold` ("נמכרו"),
  `dish_sales_returned` ("הוחזרו"), `dish_sales_not_entered` ("לא הוזן"), `dish_sales_not_entered_hint`
  ("ריק = לא הוזן; 0 = לא נמכרה אף מנה"), `dish_sales_reasons` ("סיבות"), `dish_sales_reasons_count`
  ("סיבות ({{given}}/{{returned}})"), `dish_sales_removed_dish` ("הוסרה מהתפריט"), `dish_sales_cost_live`
  ("העלות לפי מחירי היום ותוקפא בסגירת החודש"), `dish_sales_save` ("שמירה"), `dish_sales_saved` ("המכירות נשמרו"),
  `dish_sales_save_failed` ("השמירה נכשלה. נסו שוב."), `dish_sales_load_failed` ("לא הצלחנו לטעון את המכירות"),
  `dish_sales_closed_banner` ("החודש נסגר ב־{{date}}; העלויות קפואות"), `dish_sales_empty_link`
  ("לתפריט המסעדה"), `dish_sales_zero_fill` ("סמן ריקים כ־0"), `dish_sales_zero_fill_confirm`
  ("לסמן {{n}} מנות כ־0 שנמכרו?"), `dish_sales_skipped` ("שמות שלא נספרו ({{n}})"), `return_reasons_title`
  ("סיבות החזרה — {{name}}"), `return_reasons_given` ("פורטו {{given}} מתוך {{returned}} החזרות"),
  `return_reasons_other_note` ("פרטו את הסיבה"), `return_reasons_note_required` ("כתבו הערה לסיבה «אחר»"),
  `return_reasons_add` ("הוספת סיבה"), `add_new_return_reason` ("הוסף סיבה חדשה"), `return_reasons_ok` ("אישור"),
  `dish_sales_reasons_cleared` ("הסיבות נמחקו כי לא הוזנו החזרות").
  The six `dish_return_reason_*` keys and `dish_month_closed` / `dish_month_exists` come from plan 724.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Add a small month helper so pages can name, step and check a month — current, shift, check, Hebrew label, with a spec — src/app/core/utils/month-key.util.ts, src/app/core/utils/month-key.util.spec.ts
- [ ] A2: Let the app load a month's sales and save the whole month in one request — model re-export, data service with the MONTH_EXISTS retry, spec — src/app/core/models/dish-sales-month.model.ts, src/app/core/services/dish-sales-month-data.service.ts, src/app/core/services/dish-sales-month-data.service.spec.ts
- [ ] A3: Add the monthly sales page where empty stays «not entered» and 0 stays 0 — route, month arrows, rows, progress line, save, closed-month read-only, staff notice — src/app/pages/restaurant-menu/dish-sales/**, src/app/app.routes.ts
- [ ] A4: Add the reasons popup with the built-in list, the owner's own reasons and the «other» note — counters, the given-of-returned check, add a reason — src/app/pages/restaurant-menu/dish-sales/components/return-reasons-dialog/**
- [ ] A5: Put «Menu» and «This month's sales» chips on both restaurant pages for businesses with dish analysis — new chip group with a spec case — src/app/core/components/tab-chips/tab-chips.component.ts, src/app/core/components/tab-chips/tab-chips.component.spec.ts
- [ ] A6: Prove the page, the popup and the leave question with unit tests — null vs 0, rows not sent, blocked save, reload, closed month, route guard — src/app/pages/restaurant-menu/dish-sales/dish-sales.page.spec.ts, src/app/pages/restaurant-menu/dish-sales/components/return-reasons-dialog/return-reasons-dialog.component.spec.ts, src/app/core/guards/pending-changes-routes.spec.ts
- [ ] A7: Add the Hebrew words — the keys of UI/UX Notes — public/assets/data/dictionary.json
- [ ] A8: Record the page in the maps and run every automatic check — paste outputs under Execution Notes — src/app/pages/breadcrumbs.md, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md, src/app/core/breadcrumbs.md, docs/brain/component-families.md, docs/modules/modules-map.md

## What happens when
- A dish's «הוחזרו» is lowered below the reasons already given: the row shows «סיבות (3/2)» in red and «שמירה» is
  blocked until the reasons are fixed (the server would refuse it too, plan 724).
- «הוחזרו» is cleared after reasons were given: the reasons are dropped with the toast «הסיבות נמחקו כי לא הוזנו
  החזרות» (`dish_sales_reasons_cleared`, "הסיבות נמחקו כי לא הוזנו החזרות").
- A dish is added to the menu after the month was saved: it appears with empty boxes («לא הוזן»).
- A dish left the menu and had numbers this month: it stays listed with «הוסרה מהתפריט» and its numbers.
- Two people save the same new month at once: the second gets `MONTH_EXISTS`, the service reloads and saves over it
  (last save wins, as everywhere today).
- A future month in `?month=`: the page opens this month instead.
- An own reason is deleted in the metadata manager while months use it: the server blocks the delete and lists the
  months (plan 724 term references).

## Technical Considerations
- Dependencies: plan 724 (store, reasons, kind, 409s), plan 725 (menu dishes, cost rule, route, owner notice key).
- Cost while open is live (dish 5): `MenuDishCostService` with today's prices. This plan writes no `frozen`, no
  `closedAt`; the shared month close (N-X2) is a later plan and the server refuses a client that sends them.
- Revenue and margins are not computed here: units × net price, the four classes and the per-course thresholds (N-D1,
  N-D2) are the analysis function's slice. Plan 727's month revenue is typed there, not taken from here (N-X3: the
  import's net total is offered later as a hint).
- One document per month keeps the write one request (INV-3) and well under the size limit (≤ 300 rows).
- The own return reason is stored as the owner's Hebrew text (the `logisticsSection` pattern, plan 724 decision), so
  the Hebrew canonical-values flow of `docs/agent/standards-domain.md` is not used for it.
- Known collision: plan 727 may add its own month helper; if 727 merges first with one, use it and drop A1.
- Security: no new endpoint; the server is the gate (plan 724).

## Out of Scope
- The sales file import, aliases and portion factors (N-D3), the analysis function and screen, insights, month close
  and freeze (N-X2), combining months (N-D5), return cost per dish (N-D6), labour.
- Typing revenue or discounts per dish (`netSales` stays empty until the import).

## Critical Questions
- none — Dandan chose every recommended option on 2026-11-24; choices the decisions do not settle are `behaviour:`
  decisions below for him to grade.

## Execution Notes
- Planner 2026-11-24: written from the research report and Dandan's decisions.
- behaviour: the forward arrow stops at the current month (no future months) — reverse: allow typing a future month
- behaviour: reasons are optional per return (given ≤ returned), not forced to add up — Square forces one per void, but a typed month often has a total without a split — reverse: block the save until every return has a reason
- behaviour: a dish with nothing typed sends no row, so «לא הוזן» is the missing row or null — reverse: send every dish with nulls
