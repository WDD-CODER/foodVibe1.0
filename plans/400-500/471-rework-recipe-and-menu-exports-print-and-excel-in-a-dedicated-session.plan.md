# Plan 471 — Recipe and menu exports: a clean printed recipe and Hebrew, good-looking Excel files

Status: done
Depends-on: none
Track: code
Snapshot: 7c8fccd4

## Problem Statement
Handoff section J (`docs/mvp/review-handoff-2026-10-21.md`): the previews and print options of the menu screen look
good, but «הדפסת מתכון» (print the recipe) looks bad, the Excel files write words in English, and the Excel output
is weak overall. This plan was parked for a walk-through with the Human; on 2026-11-22 the Human asked for it to be
rewritten so a Worker can build it without him. The wanted outcome is fixed below; anything it does not settle is
decided by the "One look" rule and logged as a `behaviour:` decision.

Verified on `origin/main` 7c8fccd4:

1. **Print the recipe prints the editing screen.** `recipe-builder.page.html:194-202` calls
   `RecipeBuilderExportService.print()` (`recipe-builder-export.service.ts:118`), which is `window.print()` of the
   whole recipe-builder page: inputs, buttons, dropdowns and empty rows, through the global `@media print` block
   at `src/styles.scss:1896`. The cook view and the menu screen print from the export preview
   (`app-export-preview`, `src/styles.scss:2008`), which prints cleanly.
2. **English in the Excel files.**
   - Sheet names hard-coded in English: `'Cooking steps'` (`recipe-export.service.ts:66`), `'Checklist'` (`:109`),
     `'Shopping list'` (`:169`, `:237`, `menu-export.service.ts:335`), `'Menu info'` (`menu-export.service.ts:53`,
     `:138`), the section fallback `Section_<id>` (`:68`, `:150`) and `'Sheet'` (`:326`).
   - The recipe shopping list writes the product's raw category key (`row.getCell(1).value = cat`,
     `recipe-export.service.ts:185` and `:252`) — the preview of the same list translates it (`:379`), the Excel
     does not. This is the "categories in English" the Human saw.
   - The menu cover writes `menu.eventType` raw (`:56`, `:141`): a key, not a Hebrew name.
   - The menu shopping-list preview title ends in English: `` `${menu.name} — Shopping list` `` (`:222`); fallbacks
     `'Recipe'`, `'Menu'`, `'Section'` are English.
   - Hard-coded Hebrew `'כללי'` and `'הכנות'` in a `.ts` file (`recipe-export.service.ts:157`, `:158`, `:227`,
     `:228`, `:368`, `:369`) — against the hard rule (Hebrew only through `dictionary.json`).
3. **Weak layout.** Only the prep sheets (`addPrepSheetsToWorkbook`, plan 437) use the styled look (teal title band,
   grey meta line, grey column header, borders). Every other sheet is plain rows with a bold first row; the menu-info
   export (`exportMenuInfo`) is not even right-to-left (`:53`, `:69`). No sheet freezes its header, shows a total, or
   prints on one page width.
4. **Duplicated code.** The recipe shopping-list grouping is written three times (`recipe-export.service.ts:153-165`,
   `:223-235`, `:364-373`) and the menu dish-section sheet twice (`menu-export.service.ts:67-86`, `:149-168`).

## Goals & Success Criteria
**Primary:** a chef can print a recipe and open any Excel export and hand it to staff or a client as is: clean,
Hebrew, right-to-left, the same look in every file.

- [x] [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [x] [auto] `pnpm run test:ci` exits 0, including the new specs `src/app/core/services/recipe-export.service.spec.ts`
  and `src/app/core/services/menu-export.service.spec.ts` (A6).
- [x] [auto] `git grep -n -E "addWorksheet\('[A-Za-z]" -- src/app` prints nothing (no English sheet name left).
- [x] [auto] `git grep -n -E "'(כללי|הכנות)'" -- src/app/core/services` prints nothing.
- [x] [auto] `node scripts/scope-check.mjs --arch --plan=plans/471-rework-recipe-and-menu-exports-print-and-excel-in-a-dedicated-session.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/471-rework-recipe-and-menu-exports-print-and-excel-in-a-dedicated-session.plan.md` exits 0.
- [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] On a recipe, «הדפסת מתכון» opens the preview of the whole recipe (name, yield, ingredients, numbered steps, preparation time) and "הדפסה" prints only that sheet: no buttons, inputs or empty rows, on as few pages as the content needs.
- [human] Open the recipe "Export all" file and the menu "Export all" file in Excel: every sheet name, header, category and event type is in Hebrew, every sheet reads right to left, and every sheet has the same look (title band, meta line, grey header, borders).

## Execution Mode
- Parallel: yes — no open plan writes these files (checked 2026-11-22: Restaurant plans 663–689 touch no export file).
- Concurrent plans: any that do not touch the files in the scope below.
- Isolated DB: no — client-side only, no data written.
- Can run in a cloud session: yes. Nothing needs the local database; the two [human] cards are checked later on the
  Human's PC.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/export-preview/**
src/app/shared/export-toolbar-overlay/**
src/app/core/services/export.service.ts
src/app/core/services/export.service.spec.ts
src/app/core/services/menu-export.service.ts
src/app/core/services/menu-export.service.spec.ts
src/app/core/services/recipe-export.service.ts
src/app/core/services/recipe-export.service.spec.ts
src/app/core/services/excel-workbook.util.ts
src/app/core/utils/export.util.ts
src/app/pages/cook-view/services/cook-view-export.service.ts
src/app/pages/recipe-builder/services/recipe-builder-export.service.ts
src/app/pages/recipe-builder/recipe-builder.page.html
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/menu-intelligence/components/menu-export-sheet/**
src/app/core/services/breadcrumbs.md
docs/brain/component-families.md
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — client-side export rendering only; no server, schema, permission, taxonomy or stored-data
  change. The export services keep reading the same signals and services they read today.

## Reuse Check
- `addStyledTableSheet` and `uniqueSheetName` in `src/app/core/services/excel-workbook.util.ts` — family: none — rung: 4 — why: no registry family covers Excel export; the helper only composes the existing style helpers of the same file (`styleExcelTitle`, `styleExcelSubtitle`, `styleExcelColumnHeader`, `styleExcelDataRowBorders`, which already draw the prep-sheet look), and `uniqueSheetName` is `MenuExportService.uniqueSheetName_` moved there. A7 adds the new family heading `### excel-export` to `docs/brain/component-families.md` naming both, so every later export uses this one styling path.

Not new pieces, so no row: `getFullRecipePreviewPayload` is one more payload method of the existing `RecipeExportService`, and the printed recipe reuses `app-export-preview` and its existing print rule (`src/styles.scss:2008`) — no new print component, no new `@media print` block.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want "print recipe" to print a clean recipe sheet so that I can hang it in the kitchen.
- As a chef, I want every Excel file in Hebrew and right to left so that my staff read it without guessing.
- As a caterer, I want every exported file to look the same and look finished so that I can send it to a client.

## Functional Requirements

### Must Have (P0)
- [ ] **One look ("the house style").** Every Excel sheet this plan touches is drawn by one new helper in
  `excel-workbook.util.ts`:
  `addStyledTableSheet(wb, { name, title, meta, header, rows, totalRow?, widths? }) → Worksheet`. It:
  - creates the sheet right to left, named through `uniqueSheetName` (Excel-safe, ≤ 31 characters, unique);
  - row 1: `title` in the teal band (`styleExcelTitle`, merged across the columns);
  - row 2: `meta` in the grey italic line (`styleExcelSubtitle`) — for a recipe: yield and date; for a menu: event
    type, date and guest count, joined by " · ";
  - row 3: `header` in the grey header (`styleExcelColumnHeader`); rows 4…: data with thin borders
    (`styleExcelDataRowBorders`); when `totalRow` is given it is the last row, bold;
  - freezes rows 1–3 (`ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 3 }]`);
  - sets page setup to A4, portrait, fit to one page wide (`ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }`);
  - sets column widths from `widths`, else 28 for the first column and 14 for the others.
- [ ] **Every sheet uses it**, with Hebrew names from the dictionary (new keys in UI/UX Notes):
  - recipe: "Export info" keeps `fillRecipeSheetWorksheet`'s block layout (it is a form, not a table) but gets the
    same title band, RTL, A4 fit; "Cooking steps", "Checklist", "Shopping list" and the shopping sheet of "Export
    all" use `addStyledTableSheet`;
  - menu: the cover ("Menu info"), each dish section, the shopping list; `addPrepSheetsToWorkbook` switches to the
    helper with the same rows (its look does not change).
- [ ] **Hebrew everywhere in the files.**
  - Category cells of the recipe shopping list go through `heCategoryLabel(this.translation_, cat)`, as the preview
    already does.
  - The menu cover's event type is the event type's Hebrew name: `menu.eventTypeSnapshot?.name` when it exists,
    else `this.translation_.translate(menu.eventType)`.
  - The fallbacks `'כללי'` / `'הכנות'` become dictionary keys `export_category_general` / `export_category_preps`
    read through `TranslationService`; `'Recipe'`, `'Menu'`, `'Section'`, `'Sheet'` and the " — Shopping list"
    preview title become dictionary keys too.
- [ ] **Totals.** The recipe shopping list and the shopping sheet of "Export all" end with a bold total row: the
  label `export_total` in the ingredient column and `{ formula: 'SUM(F4:F<last>)' }` in the line-total column. The
  menu shopping list keeps its existing total row (`table.totalRow`), drawn by the helper.
- [ ] **One shopping-list builder for a recipe.** A private `recipeShoppingRows_(recipe, quantity)` returns the
  grouped, sorted, translated rows once; `exportShoppingList`, `exportAllTogetherRecipe` and
  `getShoppingListPreviewPayload` all read it. A private `menuSectionSheet_(wb, section, recipeMap)` replaces the two
  copies in `exportMenuInfo` / `exportAllTogetherMenu`.
- [ ] **Testable builders.** Each `export…` method is split into a public `build…Workbook(…): Promise<Workbook>`
  and the existing `export…` that awaits it and calls `downloadWorkbook`. Callers do not change.
- [ ] **A clean printed recipe.** «הדפסת מתכון» in the recipe builder no longer calls `window.print()` on the page:
  - `RecipeExportService.getFullRecipePreviewPayload(recipe, quantity): ExportPayload` returns the `recipeSheet`
    block (name, date, yield) plus two sections: ingredients (name, amount, unit — no prices on a kitchen sheet) and
    the steps, numbered `1.`, `2.` … with each step's minutes when set; the summary line gives the total preparation
    time.
  - `ExportService` (the facade the builder injects as `exportService_`) exposes it beside the other
    `get…PreviewPayload` methods. `RecipeBuilderExportService.print()` becomes
    `this.openPreview_('recipe-full', (r, q) => this.exportService_.getFullRecipePreviewPayload(r, q))` (a new
    `RecipeBuilderExportPreviewType` value), exactly like the "view" options at lines 65–81; the preview's own
    "הדפסה" button prints it through the existing `export-preview-visible` print rule.
  - The `.recipe-builder-container` entries of the `@media print` block at `src/styles.scss:1896` stay (append-only
    hotspot); they are no longer reached from this button.

### Should Have (P1)
- [ ] `src/app/core/services/breadcrumbs.md`: the export services line names `addStyledTableSheet` and the
  `build…Workbook` builders.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No new screen; the recipe print reuses the export preview overlay.
- Dictionary keys (append-only, section `general`):
  `export_sheet_cooking_steps` ("שלבי הכנה"), `export_sheet_checklist` ("רשימת הכנות"),
  `export_sheet_shopping_list` ("רשימת קניות"), `export_sheet_menu_info` ("פרטי התפריט"),
  `export_sheet_recipe` ("מתכון"), `export_section_fallback` ("מקטע"), `export_sheet_fallback` ("גיליון"),
  `export_recipe_fallback` ("מתכון"), `export_menu_fallback` ("תפריט"), `export_category_general` ("כללי"),
  `export_category_preps` ("הכנות"), `export_total` ("סה״כ"), `export_full_recipe` ("המתכון המלא"),
  `export_total_prep_time` ("זמן הכנה כולל (דקות)").
  If a key with the same Hebrew value already exists, reuse it and say so under Execution Notes.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Add the one house-style sheet helper and the shared sheet-name rule — `addStyledTableSheet`, `uniqueSheetName` (moved from `MenuExportService`), page setup and frozen header — src/app/core/services/excel-workbook.util.ts
- [x] A2: Make every recipe Excel file Hebrew and in the house style — sheet names from the dictionary, translated categories, total row, one `recipeShoppingRows_`, `build…Workbook` builders; title band, RTL and A4 fit on the info sheet — src/app/core/services/recipe-export.service.ts, src/app/core/services/excel-workbook.util.ts
- [x] A3: Make every menu Excel file Hebrew and in the house style — Hebrew cover and event type, one `menuSectionSheet_`, prep sheets and shopping list through the helper, `build…Workbook` builders, Hebrew preview titles and fallbacks — src/app/core/services/menu-export.service.ts
- [x] A4: Print the recipe from a clean preview instead of the editing screen — `getFullRecipePreviewPayload`; `print()` opens the preview with it — src/app/core/services/recipe-export.service.ts, src/app/pages/recipe-builder/services/recipe-builder-export.service.ts, src/app/pages/recipe-builder/recipe-builder.page.html, src/app/pages/recipe-builder/recipe-builder.page.ts
- [x] A5: Add the Hebrew words — the keys of UI/UX Notes, appended — public/assets/data/dictionary.json
- [x] A6: Prove it with unit tests on the built workbooks — for each `build…Workbook`: every sheet name has no Latin letter, every sheet is right to left, rows 1–3 are title / meta / header; the recipe shopping list shows the Hebrew category for a product whose category key is English and ends with a `SUM` total; the menu cover shows the event type's Hebrew name; `getFullRecipePreviewPayload` numbers the steps and has no price column — src/app/core/services/recipe-export.service.spec.ts, src/app/core/services/menu-export.service.spec.ts, src/app/core/services/export.service.spec.ts
- [x] A7: Record the helper so the next export reuses it, and run every `[auto]` check — a new `### excel-export — one house style for every Excel sheet` heading with a `Use:` line naming `addStyledTableSheet`, `uniqueSheetName` and the `build…Workbook` builders (same shape as the other headings), the breadcrumbs line; paste outputs under Execution Notes; `node scripts/reuse-lint.mjs --check-registry` exits 0 — docs/brain/component-families.md, src/app/core/services/breadcrumbs.md

## What happens when
- A recipe has no steps: the printed recipe shows the ingredients and no steps section; the cooking-steps sheet has
  the title, meta and header rows only.
- An ingredient's category is missing: it goes under `export_category_general`; a preparation under
  `export_category_preps`.
- A category key has no dictionary entry: `translate` returns the key (today's behaviour) — logged as `seen:` in the
  run notes with the key, not fixed here.
- Two sections have the same name: `uniqueSheetName` adds " 2", " 3".
- A menu has no event type: the meta line leaves it out.

## Technical Considerations
- Dependencies: `exceljs` (already loaded on demand), `TranslationService`, `ScalingService`, `RecipeCostService`,
  `EventPlanService`, `buildShoppingListTable`, `buildPrepSheetGroups`, `app-export-preview`.
- New files needed: `src/app/core/services/recipe-export.service.spec.ts`,
  `src/app/core/services/menu-export.service.spec.ts`.
- Model changes: none. Backend / API: none. Data / migration: none.
- Tests read the workbook in memory (`wb.worksheets`, `ws.name`, `ws.views[0].rightToLeft`, `ws.getRow(n).values`);
  no file is downloaded in a test.
- File names (`buildExportFileName`) stay as they are: Latin file names are safer to send by e-mail and WhatsApp.
- The existing `EXPORT_HEADER_HE` map in `export.util.ts` stays as is (old, out of scope); new words go to the
  dictionary.

## Out of Scope
- Inventory, supplier, stats, report and diagnosis exports.
- PDF files; images or logos in Excel.
- The menu screen's print and preview (already approved as good by the Human, handoff J).
- Moving `EXPORT_HEADER_HE` into the dictionary.

## Critical Questions
- none — the Human asked (2026-11-22) for the plan to run without him; the choices above are the Planner's defaults,
  and any other unsettled choice is a `behaviour:` decision for the Human to grade.

## Execution Notes
- Planner 2026-10-21: deferred from the 459–470 run by the Human.
- Planner 2026-11-22: rewritten from the parked "walk it with the Human" draft into a buildable plan at the Human's
  request ("it needs to be simple to understand what and how the outcome needs to be … executed correctly without
  me"). Evidence above checked on main 7c8fccd4.
- Worker 2026-11-22 (cloud session, branch `feat/471-exports-house-style` from `origin/main` cfc3774): A1–A7 built
  in order. `src/app/pages/recipe-builder/recipe-builder.page.ts` needed no change. Nothing written outside the
  Read-Write Scope (`node scripts/scope-check.mjs --diff=origin/main` → `SCOPE: ok`).

### Dictionary reuse (UI/UX Notes: "if a key with the same Hebrew value already exists, reuse it")
- `export_sheet_shopping_list` → reused `export_shopping_list` ("רשימת קניות").
- `export_sheet_recipe` and `export_recipe_fallback` → reused `recipe` ("מתכון").
- `export_category_general` → reused `general_group` ("כללי"), the key the menu shopping list already uses.
- `export_total` → reused `shopping_total` ("סה״כ"), the key the menu shopping total already uses.
- Added (9 from the plan + 2): `export_sheet_cooking_steps`, `export_sheet_checklist`, `export_sheet_menu_info`,
  `export_section_fallback`, `export_sheet_fallback`, `export_menu_fallback`, `export_category_preps`,
  `export_full_recipe`, `export_total_prep_time`, `export_labor_time_min`, `export_cooking_time_sec`.

### Behaviour decisions (for the Human to grade)
- behaviour: `export_menu_fallback` and `export_category_preps` are new keys although "תפריט" / "הכנות" exist — the
  existing keys (`toolbar_menu`, `knowledge_topic_menu`, `activity_field_prep_items`) are UI labels with another
  meaning and could be renamed for their own screen — reverse: point the two call sites at the existing keys.
- behaviour: the cooking-steps sheet header wrote the raw keys `labor_time_min` / `cooking_time_sec` (not in
  `EXPORT_HEADER_HE`) — English in the file; two new dictionary keys replace them (`EXPORT_HEADER_HE` untouched) —
  reverse: drop the keys and go back to `heHeader(...)`.
- behaviour: the printed recipe keeps the steps in `sections` and the total time in `summary`; a new optional
  `ExportPayload.recipeSheetStepsAsSection` (`export.util.ts`) makes the preview skip the recipe sheet's own
  instructions / prep-time blocks, so nothing prints twice — reverse: remove the flag and put the numbered lines into
  `recipeSheet.preparationInstructions`.
- behaviour: in the full-recipe preview, "ייצוא לאקסל" downloads the recipe-info Excel (closest file: ingredients +
  instructions) — reverse: map `'recipe-full'` to `exportAllTogetherRecipe` in `onExportFromPreview`.
- behaviour: the preview's own print button now calls a new `RecipeBuilderExportService.printPreview()`
  (`window.print()`), because `print()` now opens the preview (`recipe-builder.page.html:437`) — reverse: n/a.
- behaviour: the printed recipe and the cooking-steps sheet list the steps sorted by `order`; the printed recipe
  leaves out steps whose instruction is blank (no empty rows) and shows minutes only when set — reverse: drop the
  sort / filter.
- behaviour: the recipe-info sheet gets row 1 title band (recipe name) and row 2 meta (yield · date); the plan-108
  block starts on row 3 and is not frozen (it is a form) — reverse: start the block at row 1 again.
- behaviour: the dish-checklist meta line is the standard recipe meta (yield · date); the old first row's portions
  and "יחס xN" are gone — reverse: add them to that sheet's meta.
- behaviour: the menu cover is a field / value table through `addStyledTableSheet` and both "menu info" and
  "export all" covers now end with the "יוצא בתאריך" row (before: only "export all") — reverse: drop the row from
  `addCoverSheet_`.
- behaviour: a menu with no prep groups gets one house-style sheet «דפי הכנה» whose header cell says «אין מה
  להדפיס» — reverse: write the text as a data row under an empty header.
- behaviour: a recipe shopping list with no rows has no total row (a SUM over an empty range would point at the
  total cell itself) — reverse: always add it.
- behaviour: recipe shopping-list groups are sorted by their Hebrew label (`localeCompare(…, 'he')`), not by the raw
  key — reverse: sort by key before translating.
- behaviour: the menu previews (info, all-view) also show the event type's Hebrew name in the cover row and
  subtitle, through the same `eventTypeName_` as the Excel — reverse: `menu.eventType` raw in the previews.
- behaviour: the shopping builders read the scaled rows before `await import('exceljs')` (an existing spec reads the
  scaling call synchronously) — reverse: n/a.
- behaviour: removed `styleHeaderRow` from `excel-workbook.util.ts`; nothing calls it any more — reverse: restore it.
- behaviour: `node scripts/reuse-lint.mjs --check-registry` exited 1 on three paths already broken on `origin/main`
  (`docs/brain/component-families.md:317`, `:321`, `:592`); A7 needs exit 0 and the file is in scope, so
  `stock-count/spoken-unit.ts` became its full path `src/app/pages/inventory/components/stock-count/spoken-unit.ts`
  and the two import specifiers (`@schemas/units/to-base`, `server/generated/schemas/units/to-base`) lost their
  backticks (they are imports / build output, not repo files) — reverse: restore the three original strings.
- seen: no category key without a dictionary entry was observed (no database in this session).

### Evidence (after `pnpm install` → `Done in 7.4s`, exit 0, and `pnpm run build:schemas` → exit 0)
Cloud-only note: Karma needed `CHROME_BIN` set to a wrapper that adds `--no-sandbox` (the container runs as root);
`server/` needed `pnpm install` for `log-query.mjs` to load `mongoose`.

```text
$ pnpm run build                                   → exit 0
Application bundle generation complete.
Output location: /home/user/foodVibe1.0/dist/food-vibe1.0

$ pnpm run lint                                    → exit 0
✖ 69 problems (0 errors, 69 warnings)              (none in a file this plan changed)

$ pnpm run test:ci                                 → exit 0
TOTAL: 2742 SUCCESS
(includes recipe-export.service.spec.ts, menu-export.service.spec.ts, export.service.spec.ts)

$ git grep -n -E "addWorksheet\('[A-Za-z]" -- src/app          → exit 1, no output
$ git grep -n -E "'(כללי|הכנות)'" -- src/app/core/services      → exit 1, no output

$ node scripts/scope-check.mjs --arch --plan=plans/471-…plan.md   → exit 0
ARCH: ok INV-none
$ node scripts/scope-check.mjs --reuse --plan=plans/471-…plan.md  → exit 0
REUSE: ok `addStyledTableSheet` and `uniqueSheetName` in `src/app/core/services/excel-workbook.util.ts` (rung 4)

$ node scripts/log-query.mjs --since=plan-start --level=error     → exit 0
plan-start: no marker, using 2026-11-22T17:45:19+02:00 (merge-base)
SKIP: no database configured

$ node scripts/reuse-lint.mjs --check-registry                    → exit 0 (after the path fix above; exit 1 before)
REUSE: registry ok (65 families, 196 paths)

$ node scripts/scope-check.mjs --diff=origin/main                 → SCOPE: ok
```

Open for the Human: the two `[human]` items under Goals (printed recipe; both "Export all" files in Excel).
