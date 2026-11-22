# Plan 471 — Recipe and menu exports: a clean printed recipe and Hebrew, good-looking Excel files

Status: draft
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

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `pnpm run test:ci` exits 0, including the new specs `src/app/core/services/recipe-export.service.spec.ts`
  and `src/app/core/services/menu-export.service.spec.ts` (A6).
- [auto] `git grep -n -E "addWorksheet\('[A-Za-z]" -- src/app` prints nothing (no English sheet name left).
- [auto] `git grep -n -E "'(כללי|הכנות)'" -- src/app/core/services` prints nothing.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/471-rework-recipe-and-menu-exports-print-and-excel-in-a-dedicated-session.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/471-rework-recipe-and-menu-exports-print-and-excel-in-a-dedicated-session.plan.md` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
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

- [ ] A1: Add the one house-style sheet helper and the shared sheet-name rule — `addStyledTableSheet`, `uniqueSheetName` (moved from `MenuExportService`), page setup and frozen header — src/app/core/services/excel-workbook.util.ts
- [ ] A2: Make every recipe Excel file Hebrew and in the house style — sheet names from the dictionary, translated categories, total row, one `recipeShoppingRows_`, `build…Workbook` builders; title band, RTL and A4 fit on the info sheet — src/app/core/services/recipe-export.service.ts, src/app/core/services/excel-workbook.util.ts
- [ ] A3: Make every menu Excel file Hebrew and in the house style — Hebrew cover and event type, one `menuSectionSheet_`, prep sheets and shopping list through the helper, `build…Workbook` builders, Hebrew preview titles and fallbacks — src/app/core/services/menu-export.service.ts
- [ ] A4: Print the recipe from a clean preview instead of the editing screen — `getFullRecipePreviewPayload`; `print()` opens the preview with it — src/app/core/services/recipe-export.service.ts, src/app/pages/recipe-builder/services/recipe-builder-export.service.ts, src/app/pages/recipe-builder/recipe-builder.page.html, src/app/pages/recipe-builder/recipe-builder.page.ts
- [ ] A5: Add the Hebrew words — the keys of UI/UX Notes, appended — public/assets/data/dictionary.json
- [ ] A6: Prove it with unit tests on the built workbooks — for each `build…Workbook`: every sheet name has no Latin letter, every sheet is right to left, rows 1–3 are title / meta / header; the recipe shopping list shows the Hebrew category for a product whose category key is English and ends with a `SUM` total; the menu cover shows the event type's Hebrew name; `getFullRecipePreviewPayload` numbers the steps and has no price column — src/app/core/services/recipe-export.service.spec.ts, src/app/core/services/menu-export.service.spec.ts, src/app/core/services/export.service.spec.ts
- [ ] A7: Record the helper so the next export reuses it, and run every `[auto]` check — a new `### excel-export — one house style for every Excel sheet` heading with a `Use:` line naming `addStyledTableSheet`, `uniqueSheetName` and the `build…Workbook` builders (same shape as the other headings), the breadcrumbs line; paste outputs under Execution Notes; `node scripts/reuse-lint.mjs --check-registry` exits 0 — docs/brain/component-families.md, src/app/core/services/breadcrumbs.md

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
