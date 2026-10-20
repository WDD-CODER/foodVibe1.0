# Plan 437 — Printed prep sheets per station, category or dish, one page per group

Status: draft
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110
Track: code

## Problem Statement
The kitchen team works from paper. Today's prep checklist (`getMenuChecklistPreviewPayload`, `exportChecklist`,
`addChecklistSheetsToWorkbook` in `menu-export.service.ts` — three more copies of one logic) reads
`ScalingService.getScaledPrepItems`, so sub-recipe preps (e.g. the 2 kg "רוטב" of the 04.1 fixture) never appear;
"by category" and "by station" flatten everything into one "accumulated" block with no group names printed; there is
no way to print only one station; and print uses the generic export-preview visibility hack, so groups split across
pages with no page header or footer. After plan 436 every recipe has a real station; this plan prints by it.

## Goals & Success Criteria
- Primary: from a menu, "דפי הכנה" shows by dish / by category / by station / by supplier, one printed A4 page (or
  more) per group with a full header, a checkbox per group to choose what prints, and the same rows in print,
  on-screen preview and Excel — all quantities from the engine (plan 433).

Done when:
- [auto] `npx ng build` exits 0.
- [auto] `npx ng test --watch=false --include='src/app/core/utils/prep-sheet-groups.util.spec.ts' --include='src/app/pages/menu-intelligence/components/prep-sheets/**/*.spec.ts' --include='src/app/pages/menu-intelligence/components/menu-export-sheet/**/*.spec.ts' --include='src/app/core/services/export.service.spec.ts'`
  passes (0 failures), including, on the plan-433 fixture with סלט `defaultStation: 'קר'` and פסטה `''`:
  - by station → exactly one group "קר" with one row: name "רוטב", qty 2, unit `kg`, `forDishes` `['סלט']`; no "כללי"
    group (פסטה has no preps — empty groups are dropped).
  - the prep "רוטב" given its own `defaultStation: 'חם'` still lands under "קר" (the serving dish's station).
  - two dishes in "קר" both using "רוטב" → one row whose qty is the sum and whose `forDishes` lists both dishes.
  - by dish → group "סלט" with the "רוטב" row; group "פסטה" with `emptyText` = the `prep_sheets_no_preps` text.
  - by category → a mise row with `categoryName: 'cold_prep'` groups under `t('cold_prep')`; a row with no category
    under `t('general_group')`.
  - by supplier (with `buildSupplierOrders` from plan 435) → one group per supplier card ("ירקן", "ללא ספק"), rows
    product · qty · unit · purchase units, no prices.
  - Component: unchecking a group adds `is-excluded` to its page; "הדפס" calls `window.print()`; on open it adds
    `prep-sheets-open` to `<body>` and a `<style>` with one `@page pg-N` rule per printed group whose `@bottom-center`
    content contains the group name; both are removed on close.
  - Excel: `prepSheetTableRows(group, t)` (the rows the Excel helper writes, one worksheet per group) equals the
    group's on-screen rows cell for cell — name, qty, unit label, "למנה" text, note — on the by-station fixture.
- [auto] `git diff --numstat origin/main...HEAD -- src/app/pages/menu-intelligence/menu-intelligence.page.ts src/app/core/services/menu-export.service.ts`
  shows added ≤ deleted for both (growth-frozen).
- [auto] `git grep -n "getScaledPrepItems\|getMenuChecklistPreviewPayload" -- src/app/core/services/menu-export.service.ts src/app/core/services/export.service.ts src/app/pages/menu-intelligence` → no output.
- [auto] `git diff origin/main...HEAD -- src/styles.scss` shows only added lines (append-only hotspot).
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Chrome print preview on desktop and on Android shows one clean page per group, only the chosen groups,
  no app chrome, checkboxes on every row, no row cut between pages (cards ①–⑥ below).

Human checks (written for the hand-off cards; SETUP: a menu with at least one dish whose station is "חם" and one
whose station is "קר", each using a prep — set stations in the recipe header, plan 436):
1. **One page per station (desktop)** — `/menu-intelligence/<menu id>` → FAB "צ׳קליסט והדפסות" → "דפי הכנה" →
   "לפי תחנה". SEE ✓ at least two pages on screen, each starting with the station name in large bold text, then the
   event name, date, guests and serving type.
2. **Print only one station** — uncheck every group but "קר" → "הדפס". SEE ✓ Chrome print preview has only the "קר"
   page(s); A4 portrait; no menu, buttons or footer bar of the app; each row starts with an empty checkbox ☐.
3. **Page footer and long rows** — in that preview read the bottom of each page. SEE ✓ "עמוד X מתוך Y · קר"; a long
   prep name wraps onto a second line instead of being cut; no row is split between two pages; the table header
   repeats on a second page.
4. **Android** — repeat 1–2 on an Android phone (Chrome → share/print → save as PDF). SEE ✓ the same layout.
5. **Same rows in Excel** — back on the sheet → "לפי תחנה" → ייצוא, open the file. SEE ✓ one sheet per station with
   the same rows and quantities as the screen.
6. **Supplier pages** — "דפי הכנה" → "לפי ספק" → "הדפס". SEE ✓ one page per supplier, product lines with quantities
   and no prices.

## Execution Mode
- Parallel: no — writes `menu-intelligence.page.ts` (shared with 434, 435, 441–446) and `menu-export.service.ts`
  (shared with 434, 435, 436). Never run alongside 434, 435, 436, 441, 442, 443, 444, 445, 446.
- Concurrent plans: lane 1 (424–432, 448) may run alongside; run `node scripts/scope-check.mjs --overlap --plan=<this>`.
- Isolated DB: no — no data written.

## Execution Notes
- Depends on: plans 436 and 435 merged (436: station picker, `||` fallback; 435: `buildSupplierOrders` for the
  "לפי ספק" pages) — and therefore 433, 434 (lane order).
- Lane wt-2: 423 → 433 → 434 → 435 → 436 → **437** → 430.
- Must not run at the same time as (map hotspot list): 434, 435, 436 (`menu-export.service.ts`; 436 is an addition
  to the map's list); and 441–446 (`menu-intelligence.page.ts` — this plan also writes the page, an addition to the
  map's list).
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
  Under run mode every `origin/main` in a Done-when command reads `origin/mvp`.

## Contracts (verbatim from the approved MVP map)

**C-ENGINE (433; consumers 434, 435, 437, 441, 444, 445, 446)**
- Folder `src/app/core/engine/` (pure TS, no Angular DI in the core): `event-plan.types.ts`, `event-plan.engine.ts` (`computeEventPlan(input: EventPlanInput): EventPlan`), `rounding.ts`, `supplier-choice.ts` (`chooseSupplier(product): { supplierId: string | null, pricePerBaseUnit: number | null }`), plus `event-plan.service.ts` (Angular wrapper `EventPlanService.planFor(event)` building the input from KitchenState + registries).
- `EventPlanInput = { event: MenuEvent, portionsByItem: Map<string, number>, products: Product[], recipes: Recipe[] /* recipes + dishes */, units: UnitConversion }` — item key `${section._id}|${itemIndex}`.
- `EventPlan = { rawLines: RawLine[], prepLines: PrepLine[], dishCosts: DishCost[], eventFoodCost: number, partial: boolean, missing: MissingItem[], errors: EngineError[] }`.
  - `RawLine = { productId: string | null, name: string, unit: string /* base unit */, netQty: number, buyQty: number, purchase?: { unit: string, count: number }, supplierId: string | null, lineCost: number | null, dishIds: string[], status: 'ok' | 'unlinked' | 'deleted' | 'no_conversion' }`
  - `PrepLine = { prepId: string, name: string, qty: number, unit: string, dishId: string, station: string }`
  - `DishCost = { itemKey: string, recipeId: string, cost: number, partial: boolean }`
  - `MissingItem = { kind: 'unpriced' | 'unlinked' | 'deleted', productId?: string, name: string, recipeIds: string[] }`
  - `EngineError = { kind: 'cycle' | 'no_yield', name: string }`
- `rounding.ts`: `roundPortions(x)` (round to 6 decimals, then ceil — only for portion-unit items), `formatQty(qty, unit)` (kg/liter ≤ 2 decimals, g/ml integer, units ceil; >1000 g → kg, >1000 ml → liter), `formatMoney(n)` (₪, 2 decimals), `formatPct1(n)` (1 decimal), `formatPctInt(n)`.
- Until 440 merges, `portionsByItem` comes from `portionsFromDerived(event)` (reads stored `derivedPortions`).

Uses plan 433's `PrepLine` extensions (`category`, `source`, `note`; `station` = serving dish's station, `''` when
none), plan 435's `buildSupplierOrders`, plan 436's station kind (keys are the Hebrew names; `''` → "כללי").

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/prep-sheet-groups.util.ts
src/app/core/utils/prep-sheet-groups.util.spec.ts
src/app/core/services/menu-export.service.ts
src/app/core/services/export.service.ts
src/app/core/services/export.service.spec.ts
src/app/pages/menu-intelligence/components/prep-sheets/**
src/app/pages/menu-intelligence/components/menu-export-sheet/**
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
public/assets/data/dictionary.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — client-only print/preview/Excel built from existing data; no route, schema, taxonomy write,
  data-service write or AI call. `src/styles.scss` gets an appended print rule only (hotspot, append-only).

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `EventPlanService.planFor`,
`PrepLine.category/source/note/station`, `formatQty`, `buildFixtureInput` (433); `buildShoppingListTable` and the
434 state of `menu-export.service.ts`; `buildSupplierOrders`, `SupplierOrderCard`, `supplierOrdersEvent_` (435);
`StationRegistryService.stations_` and `defaultStation || 'כללי'` (436); `exportChecklist`,
`getMenuChecklistPreviewPayload`, `addChecklistSheetsToWorkbook`, `exportAllTogetherMenu` in `menu-export.service.ts`;
`onViewChecklist`, `onExportChecklist`, `exportChecklistMode_`, `onExportFromPreview`, `closeAllExportOverlays`,
`getCurrentMenuForExport` in the page; `ChecklistMode`, `viewChecklist`, `exportChecklist` in `menu-export-sheet`; the
existing `@media print` blocks in `src/styles.scss`. Print `ok` / `conflict: <what>` per symbol.

## User Stories
- As a chef, I want a printed sheet per station with only that station's preps so that each cook gets his own page.
- As a chef, I want to choose which stations to print so that I don't waste paper on stations I already printed.
- As a chef, I want a prep used by two dishes on one row with the total and both dish names so that it is made once.
- As a chef, I want supplier orders printed one page per supplier so that I can check deliveries on paper.

## Functional Requirements

### Must Have (P0)
- [ ] One pure group builder from the engine plan for by dish / by category / by station, plus supplier pages from
      `buildSupplierOrders`; used by the screen, print and Excel.
- [ ] Group rules: prep row belongs to the serving dish's station; station `''` → "כללי"; category from the prep line
      (`''` → "כללי"); same prep (id + unit) in one group → one row, summed, all dishes in "למנה"; empty
      category/station groups dropped; a dish with no preps still appears in "by dish" with "אין הכנות במנה זו".
- [ ] Order: stations in their list order then "כללי"; categories alphabetical (he) then "כללי"; dishes in menu order;
      rows alphabetical (he).
- [ ] Page header per group: group name (large, bold) · event name · date · guests · serving type. Row: ☐ · name ·
      qty · unit · "למנה" (category/station sheets) · note.
- [ ] Group checkboxes (all checked on open) choose what "הדפס" prints; unchecked groups stay visible on screen,
      dimmed, and never print.
- [ ] Print: A4 portrait, RTL, body ≥ 14pt, group title ≥ 20pt, black on white, no backgrounds, no app chrome or
      buttons, each group starts on a new page, rows never split, table header repeats, footer
      "עמוד X מתוך Y · [group]".
- [ ] Excel (`exportChecklist`, and the checklist sheets of `exportAllTogetherMenu`): one worksheet per group, same rows.
- [ ] The old flattened checklist preview (`getMenuChecklistPreviewPayload`) and its three `getScaledPrepItems`
      copies are removed.

## UI/UX Notes
- New child component `pages/menu-intelligence/components/prep-sheets/` (`app-prep-sheets`): inputs `event`,
  `mode` (`'by_dish' | 'by_category' | 'by_station' | 'by_supplier'`); output `close`. Full-screen overlay
  (`.c-modal-overlay`); top bar (`.no-print`): mode tabs, group checkboxes, "הדפס", "ייצוא" (not for suppliers),
  close. Below: the pages as printed (white "paper" cards, one per group). Lazy:
  `@if (prepSheets_(); as ps) { @defer { <app-prep-sheets [event]="ps.event" [mode]="ps.mode" (close)="prepSheets_.set(null)" /> } }`.
- Row checkbox is a printed box (`<span class="prep-box" aria-hidden="true"></span>` with a 1px black border), not
  an `<input>`, so it prints on every browser.
- Print CSS:
  - Component `.scss` (`@media print`): overlay `position: static`, no shadows/backgrounds, `color: #000`,
    `.prep-page { break-before: page }` except the first, `tr { break-inside: avoid }`, `thead { display:
    table-header-group }`, title `font-size: 20pt; font-weight: 700`, body `font-size: 14pt`, long names
    `overflow-wrap: anywhere`, `.is-excluded { display: none }`. Logical properties only; run the `cssLayer` skill.
  - Runtime `<style>` (component adds to `document.head` with `Renderer2`, removes on destroy): per printed group N,
    `@page pg-N { size: A4 portrait; margin: 12mm; @bottom-center { content: "<before>" counter(page) "<mid>"
    counter(pages) "<after><group>"; font-size: 10pt } }`, built from `prep_sheets_page_footer` ("עמוד {x} מתוך {y}
    · {group}"), group name CSS-escaped (`\` and `"`); each page element gets `[style.page]="'pg-' + N"`.
  - Append to `src/styles.scss` (hotspot, append-only):
    ```scss
    /* Plan 437: while prep sheets are open, print only them */
    @media print {
      body.prep-sheets-open *:not(:has(app-prep-sheets)):not(app-prep-sheets):not(app-prep-sheets *) {
        display: none !important;
      }
      body.prep-sheets-open app-prep-sheets,
      body.prep-sheets-open app-prep-sheets * {
        visibility: visible;
      }
    }
    ```
- Export sheet (`menu-export-sheet`): the "צ׳קליסט" group becomes "דפי הכנה" (`prep_sheets`) with rows by dish /
  by category / by station (view + export) and by supplier (view only). `ChecklistMode` gains `'by_supplier'`.
- Icons: `printer`, `download`, `x`, `eye` (registered). No new icons.
- New dictionary keys (append, `general` group): `prep_sheets` "דפי הכנה", `prep_sheets_by_supplier` "לפי ספק",
  `prep_sheets_print` "הדפס", `prep_sheets_choose` "בחר מה להדפיס", `prep_sheets_for_dish` "למנה",
  `prep_sheets_no_preps` "אין הכנות במנה זו", `prep_sheets_nothing` "אין מה להדפיס", `prep_sheets_page_footer`
  "עמוד {x} מתוך {y} · {group}", `prep_sheets_guests` "{n} סועדים", `prep_sheets_col_prep` "הכנה",
  `prep_sheets_col_product` "מוצר", `prep_sheets_col_qty` "כמות", `prep_sheets_col_unit` "יחידה",
  `prep_sheets_col_note` "הערה", `prep_sheets_col_purchase` "יחידות רכש". Reused: `export_checklist_by_dish`,
  `export_checklist_by_category`, `export_checklist_by_station`, `general_group` (434), `supplier_orders`,
  `no_supplier` (435), `export`, `view`, `close`.

## Atomic Sub-tasks
- [ ] P1: Build the printed groups once from the engine so screen, paper and Excel match — buildPrepSheetGroups(plan, event, recipesById, mode, t, stationOrder) → PrepSheetGroup[] { key, title, rows { name, qty, unit, forDishes, note }, emptyText? }; aggregate by prepId+unit before formatQty; rules and order from P0; prepSheetTableRows(group, t) gives the header + cell rows both the template and Excel use — src/app/core/utils/prep-sheet-groups.util.ts
- [ ] P2: Turn supplier orders into printable pages — buildSupplierSheetGroups(orders, t): one group per card (review card excluded), rows product · qty · unit · purchase text, no prices — src/app/core/utils/prep-sheet-groups.util.ts
- [ ] P3: Test grouping, dish station, merging, empty groups and supplier pages on the 04.1 fixture — cases in Done when — src/app/core/utils/prep-sheet-groups.util.spec.ts
- [ ] P4: Show the prep sheets as printed pages with a checkbox per group — PrepSheetsComponent: groups computed from EventPlanService + StationRegistryService order; selected_ signal (all on open); mode tabs; header block per page; body class + runtime @page style via Renderer2/DOCUMENT, removed in ngOnDestroy; Escape closes — src/app/pages/menu-intelligence/components/prep-sheets/prep-sheets.component.ts, .html, .scss
- [ ] P5: Print only the chosen groups, cleanly on A4 — print() → window.print(); component print SCSS; append the body-class rule to the global stylesheet — src/app/pages/menu-intelligence/components/prep-sheets/prep-sheets.component.scss, src/styles.scss
- [ ] P6: Add supplier pages to the same screen — by_supplier mode reads buildSupplierOrders (plan 435) and buildSupplierSheetGroups; no Excel button in this mode — src/app/pages/menu-intelligence/components/prep-sheets/prep-sheets.component.ts, .html
- [ ] P7: Test the component's selection, print call and page-footer style — spec with window.print spied and a stub EventPlanService — src/app/pages/menu-intelligence/components/prep-sheets/prep-sheets.component.spec.ts
- [ ] P8: Make the Excel prep sheets the same rows as the screen and drop the old copies — exportChecklist and the checklist part of exportAllTogetherMenu write one worksheet per group from buildPrepSheetGroups + prepSheetTableRows via one private helper; delete getMenuChecklistPreviewPayload, the ScalingService prep calls and (if unused) the ScalingService inject; remove the facade method; net lines ≤ 0 — src/app/core/services/menu-export.service.ts, src/app/core/services/export.service.ts, src/app/core/services/export.service.spec.ts
- [ ] P9: Rename the sheet's checklist group to prep sheets and add the supplier mode — prep_sheets title, by_supplier row (view only), ChecklistMode union; the exportChecklist output stays typed Exclude<ChecklistMode, 'by_supplier'> so ExportService.exportChecklist keeps its signature; spec — src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.ts, .html, .spec.ts
- [ ] P10: Open prep sheets from the menu without growing the frozen page — prepSheets_ signal; onViewChecklist sets { event: getCurrentMenuForExport(), mode }; remove the 'menu-checklist' preview branch and exportChecklistMode_; closeAllExportOverlays clears prepSheets_; lazy @defer block in html; added ≤ deleted — src/app/pages/menu-intelligence/menu-intelligence.page.ts, menu-intelligence.page.html
- [ ] P11: Add the Hebrew texts for the prep sheets — keys listed in UI/UX Notes — public/assets/data/dictionary.json
- [ ] P12: Build, test, check frozen files and the stylesheet append, then hand over the print checks — ng build, ng test include list, numstat, git grep, styles diff, log-query; cards ①–⑥ — this plan file

## Technical Considerations
- Dependencies: `EventPlanService` (433), `buildSupplierOrders` (435), `StationRegistryService` (436),
  `KitchenStateService.recipesById_` / `productsById_` / `suppliersById_`, `TranslationService`, `ExportService`
  facade for the Excel button, Excel style helpers in `excel-workbook.util.ts`.
- Browser support: named pages (`page:`) and `@page` margin boxes with `counter(pages)` work in Chrome ≥ 131 desktop
  and Android (the acceptance browsers). Elsewhere the pages still break per group; only the footer may be missing.
- New files needed: util + spec, component ts/html/scss/spec.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none — staff may print every list (spec 01.2).
- Security surface: group names go into a runtime CSS string — escaped (`\` → `\\`, `"` → `\"`, newlines removed);
  no `innerHTML`.
- Data / migration: none.
- Frozen files: `menu-intelligence.page.ts` (adds ~4 lines, removes the checklist-preview branch and
  `exportChecklistMode_` — net ≤ 0), `menu-export.service.ts` (three ~90-line checklist copies → one ~50-line helper).
- Project checks: log-query Done-when; chef-side stories; dictionary keys listed; RTL logical CSS; `styles.scss`
  append-only; no new icons; new UI in a lazy child component.

## Backend Impact
None — client-only. No route, schema or stored-data change.

## Out of Scope
- Assigning a sheet to a named worker; digital checklist tracking; cook view (Concept D) — unchanged.
- Excel for supplier pages (print only here; orders leave the app as WhatsApp text, plan 435).
- Per-prep station overrides (a prep row always follows its dish).
- Firefox/Safari margin-box footers.

## Critical Questions
None.
