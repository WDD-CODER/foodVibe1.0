---
name: Unified export refactor
overview: Unify export UX with a floating header pattern; two icons per type (View + Export) for paper-style preview; recipe → cooking steps, dish → checklist; "export all together" (sheet1 = info+ingredients+workflow for recipe/dish, then shopping list sheet); unit prices only in shopping lists; 2 decimals; checklist by_station for menu.
todos: []
---

# Unified export refactor and upgrade

Refactor all exports to use a **unified export header** (floating button → hidden header with context-specific actions), add **view before export** (two icons: View + Export; paper-style preview in popup) and **export all together** (one file, multiple sheets). In recipe/dish: **recipe** → export cooking steps, **dish** → export checklist. Unit prices **only in shopping lists**; rounding **2 decimals** for amounts, currency, and percentages. Menu: reactive formulas, checklist by_station, two-sheet layout when not by_dish.

---

## 1. Unified export header (same pattern everywhere)

- **Pattern**: Like the hero FAB and menu-intelligence toolbar: a floating control that on hover/click expands to show a **hidden header bar** with export actions.
- **Apply to**: Cook-view (replace inline export buttons), Recipe-builder (add floating control + export bar), Menu-intelligence (keep FAB → toolbar; align styling with shared pattern).
- **Quantity/context**: Cook-view = current `targetQuantity_()` and scaling; Recipe-builder = current form snapshot; Menu = current menu + chosen mode (by_dish / by_category / by_station).

---

## 2. View before export (paper-style preview)

**Goal**: Let the user see the list as it will look (on “paper”) before downloading or printing. Same data as the export; arranged, sorted, and styled for a chef-friendly, list-on-paper feel. Opens in a popup; click outside (or Escape) closes.

**Trigger**: Use **two icons per export type**: one to **View** (opens the paper-style preview) and one to **Export** (downloads the file). No dialog or dropdown; direct choice between view and export.

### 2.1 Shared data for preview and file

- **Single source of truth**: The same **export payload** (structure) used for (1) the **paper-style preview** and (2) the **Excel/print** output. So: build the “list view model” once (e.g. in ExportService or a small export-view helper): rows, sections, headers, totals. Preview component receives this and renders HTML/CSS; Excel writer receives it and writes cells. No duplicate logic for what’s in the list.
- **Where**: Every export type (recipe info, recipe shopping list, **cooking steps** (recipe/dish), menu info, menu shopping list, menu checklist by_dish / by_category / by_station, **export all together**) can support “view before”; the preview is generic over the payload (e.g. title, subtitle, sections with rows, optional summary block). For “export all”, preview may show the first sheet or a short table-of-contents of sheets.

### 2.2 Paper-style preview UI

- **Container**: **Popup overlay** (modal). Click outside or Escape closes. Content scrollable if long.
- **Styling**: Reuse and extend the **menu paper look** from [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss): `.paper-outer` / `.paper` / `.paper-inner`, border, subtle shadow, serif for headings, list-like typography. Goal: “list written on paper” so it feels familiar and comfortable for chefs.
- **Content**: Same structure as the export: title (e.g. “Shopping list – Meatballs”), optional meta (quantity, date), sections (e.g. by category), rows (ingredient/prep + amount + unit), optional summary (totals, cost). RTL when app language is Hebrew.
- **Actions inside preview**: “Export to Excel”, “Print” (window.print on the preview content or a print-specific clone), “Close”.

### 2.3 Implementation notes

- New **export-preview** (or **view-before-export**) component: input = export payload (title, sections, summary); output = paper-styled DOM + optional Export/Print/Close. Use `ClickOutSideDirective` (or overlay click) and Escape to close.
- ExportService (or shared helper) exposes a method that returns the **view model** for a given export type and context (recipe + quantity, menu + mode, etc.). Pages call “getExportPreviewPayload(type, context)” for the preview and “exportToExcel(type, context)” for the file; both use the same data shape.
- Paper styles can live in a shared SCSS file or the preview component, reusing CSS vars and patterns from the menu paper (e.g. `--bg-pure`, `--color-frame-ink`, `--font-serif`). Follow [.assistant/skills/cssLayer/SKILL.md](.assistant/skills/cssLayer/SKILL.md) for layers.

---

## 3. What gets exported (context and quantity)

- **Cook-view**: Current recipe only; quantities = current view (target quantity, scaling, unit).
- **Recipe-builder**: Current recipe/dish from **current form state** (even if partial). Quantity = portions from form (or default).
- **Menu-intelligence**: Current menu; user chooses by_dish / by_category / by_station for grouping.

---

## 4. Menu exports: reactive chart with formulas; unit prices only in shopping lists

- **Charts**: Menu details (event type, guests, serving style, etc.) + financial block (total cost, revenue, food cost %, cost per guest) with **Excel formulas** so editing quantities/prices in the sheet updates totals.
- **Unit prices**: Add unit price column **only in shopping list exports** (recipe shopping list and menu shopping list). Line total = quantity × unit price (formula); category/menu totals = SUM. Do **not** add unit prices to checklist, recipe info, cooking steps, or any other list for now.

---

## 5. Styling and layout

- **Language**: All sheet and preview text via `TranslationService.translate()`. RTL in Excel (`views: [{ rightToLeft: true }]`) and in preview when Hebrew.
- **Layout**: Bold headers; thick borders around dishes/sections; summary block like reference (header row + bold values).

---

## 6. File naming

- **Pattern**: `{list-type}_{item-name}[_{date}].xlsx`. Examples: `shopping-list_meatballs_2025-03-10.xlsx`, `check-list_1.1.2000.xlsx` (no date for menu). Inside workbook: “Printed / exported at” timestamp.

---

## 7. Checklist vs cooking steps (recipe vs dish vs menu context)

- **Menu context**: Checklist export = mise en place / prep items (by_dish, by_category, by_station; two sheets when not by_dish as already specified).
- **Recipe/dish context** (cook-view or recipe-builder): Show the appropriate action by **item type**:
  - **Recipe** (recipe_type_ = preparation): **Export cooking steps** – only cooking steps and times (order, instruction, time per step), with item name and relevant info + export date. Naming: e.g. `cooking-steps_{recipeName}_{date}.xlsx`.
  - **Dish** (recipe_type_ = dish): **Export checklist** – prep/mise items (same idea as menu checklist but for the single dish). Naming: e.g. `check-list_{dishName}_{date}.xlsx`.

## 8. Checklist: by station and two sheets when not by dish (menu only)

- **By station**: Add mode **by_station** (group by dish `default_station_`).
- **When not by_dish** (by_category or by_station): **Two sheets** in one workbook: (1) **Accumulated** – summed by category/station; (2) **By dish** – same categories/stations but each line shows amount + dish name.

---

## 9. Export all together (one file, multiple sheets)

Add an **Export all together** button that outputs **one workbook** with **one sheet per export type**, so the user gets “everything in one place” quickly. Same idea for both menu and recipe/dish.

- **Menu builder**:  
  - **Sheet 1**: Menu arranged by category, with quantities and info per dish (same content as “menu info”).  
  - Then **one sheet per other type**: checklist (chosen mode), shopping list, etc.

- **Recipe/dish** (cook-view or recipe-builder):  
  - **Sheet 1**: **Item info + ingredients + workflow** all on one sheet (header, relevant info, ingredients list with info, then cooking steps / prep workflow).  
  - **Sheet 2**: Shopping list (and any other separate export type as additional sheets if needed). So first sheet = combined “full item” view; then another sheet for shopping list.

- **File naming**: e.g. `all_{menuName}.xlsx` (menu) or `all_{recipeName}_{date}.xlsx` (recipe/dish). View-before-export can show a summary of which sheets will be included; preview could be first sheet only or a short TOC.

---

## 10. Rounding and sorting

- **Rounding**: Always show **2 decimal places** for numeric values and percentages. Examples: 120.11 (not 120.1); 22.00% (not 22.0%). So: amounts/quantities → 2 decimals; currency → 2 decimals; percentages → 2 decimals. Apply when writing values to Excel and to preview.
- **Sorting**: Category-based lists: items A–Z by selected language within category. **Checklist by_dish**: keep **exact dish order** (prep_items_ / mise_categories_ order), no A–Z sort.

---

## 11. Summary of code/areas to touch

- **Unified export header**: Shared pattern on cook-view, recipe-builder, menu-intelligence.
- **View before export**: **Two icons per type** (View + Export); shared export payload; new preview component (paper-style, popup, click-outside close); reuse menu paper styling.
- **ExportService**: View-model API for preview + file; naming; rounding (2 decimals everywhere); RTL, translations; two-sheet checklist (menu); by_station; unit prices **only in shopping lists**; **recipe** → cooking steps export, **dish** → checklist export; **export all together** (menu = sheet1 menu + one sheet per type; recipe/dish = sheet1 item info + ingredients + workflow, then sheet2 shopping list). Formulas in menu shopping list for reactivity.
- **Recipe-builder**: Form snapshot → export payload; floating export bar; show cooking steps (recipe) or checklist (dish) by item type.
- **Cook-view**: Floating export bar; pass current quantity/scaling; show cooking steps (recipe) or checklist (dish) by item type.
- **Menu-intelligence**: Checklist by_station; toolbar aligned to shared export header UX; “Export all together” button.
