---
name: ExcelJS Only Migration
overview: Migrate all Excel generation from SheetJS (xlsx) to exceljs; add checklist export (by dish / by category). Single Excel library across the application.
---

# Use Only ExcelJS Across the Application

## Goal

- **Remove** the `xlsx` (SheetJS CE) dependency.
- **Use only `exceljs`** for every Excel export: recipe info, shopping list, menu info, menu shopping list, and the new checklist export.
- Keep existing behavior and file names; optionally add light styling (header bold, text wrap).

## Scope

| Location | Current | After |
|----------|---------|--------|
| package.json | `xlsx: ^0.18.5` | Remove xlsx, add exceljs |
| src/app/core/services/export.service.ts | XLSX utils | exceljs Workbook + private download helper |
| export.service.spec.ts | Sync calls | Await async export methods |
| cook-view.page.ts / menu-intelligence.page.ts | Sync handlers | Async handlers that await |
| New | — | exportChecklist(menu, recipes, mode) + toolbar dropdown |

## 1. Dependency and Download Helper

- package.json: Remove xlsx, add exceljs (e.g. ^4.4.0). Run npm install.
- export.service.ts: Private helper that takes Workbook + fileName, calls `workbook.xlsx.writeBuffer()`, creates Blob, `<a download>`, revokeObjectURL. All public export methods become async and return Promise<void>.

## 2. Rewrite Existing Four Methods with ExcelJS

- exportRecipeInfo: Sheets "Info", "Ingredients", "Steps". Same data/layout.
- exportShoppingList: One sheet "Shopping list". Same columns.
- exportMenuInfo: Cover "Menu info" + one sheet per section (name ≤31 chars). Same columns.
- exportMenuShoppingList: One sheet "Shopping list". Same aggregation.
- Optional: header row bold, alignment wrapText: true, column widths.

## 3. Callers

- cook-view.page.ts: onExportInfo / onExportShoppingList async, await exportService.
- menu-intelligence.page.ts: onExportMenuInfo / onExportMenuShoppingList async, await exportService.

## 4. New Checklist Export

- exportChecklist(menu, recipes, mode: 'by_dish' | 'by_category'): async.
- By dish: One sheet; per menu item: dish header (name, portions, yield, scale), then getScaledPrepItems rows (Prep Item, Category, Quantity, Unit).
- By category: One sheet; aggregate prep items by category (sum same name+unit+category); category header rows.
- Formatting: RTL where supported, header bold, wrapText, column widths, borders. Filename: {menuName}_checklist_{date}.xlsx.

## 5. UI

- menu-intelligence.page.html: Export Checklist button with dropdown (By Dish / By Category).
- menu-intelligence.page.ts: exportChecklistDropdownOpen_ signal, onExportChecklist(mode), close dropdown after export.
- menu-intelligence.page.scss: Dropdown styles (cssLayer).
- dictionary.json: export_checklist, export_checklist_by_dish, export_checklist_by_category.

## 6. Tests

- export.service.spec.ts: Use await service.exportShoppingList(...) and await service.exportMenuShoppingList(...). If Node test env fails on createObjectURL/Blob, tests may need to mock or skip download execution while keeping spy assertions.

## File Summary

| Action | File |
|--------|------|
| Edit | package.json |
| Edit | src/app/core/services/export.service.ts |
| Edit | src/app/core/services/export.service.spec.ts |
| Edit | src/app/pages/cook-view/cook-view.page.ts |
| Edit | src/app/pages/menu-intelligence/menu-intelligence.page.ts |
| Edit | src/app/pages/menu-intelligence/menu-intelligence.page.html |
| Edit | src/app/pages/menu-intelligence/menu-intelligence.page.scss |
| Edit | public/assets/data/dictionary.json |
