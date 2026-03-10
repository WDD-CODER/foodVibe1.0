# Export Localization and Professional Layout Overhaul

## Problem Summary

1. **All column headers are hardcoded in English** in `src/app/core/services/export.service.ts` — "Prep Item", "Category", "Quantity", "Unit", "Dish name", "Portions", etc.
2. **Base units display in English** — "kg", "unit", "liter" instead of Hebrew equivalents ("ק״ג", "יחידה", "ליטר").
3. **In-app preview is misaligned** — uses `flex-wrap` with `min-width: 4rem` cells, causing columns to misalign and values to appear in wrong positions.
4. **Excel exports lack professional formatting** — no borders, no fills, no visual hierarchy between dish tables in checklist-by-dish mode, no spacing between blocks.

---

## Phase 1: Translation Infrastructure

### 1a. Add export header keys to `public/assets/data/dictionary.json`

Add a new `export_headers` section with all column/field label translations (see dictionary.json).

### 1b. Create translation helpers in `src/app/core/utils/export.util.ts`

- `EXPORT_HEADER_HE`: fallback Hebrew map for headers.
- `UNIT_HE`: maps English base units to Hebrew.
- `heHeader(key: string): string` and `heUnit(unit: string): string`.

---

## Phase 2: Translate All Export Payloads (Preview + Excel)

Every `get*PreviewPayload` and `export*` method in `export.service.ts` uses Hebrew headers and `heUnit()` for unit values.

---

## Phase 3: Professional Excel Styling

- Add helpers: `styleExcelTitle`, `styleExcelSubtitle`, `styleExcelColumnHeader`, `styleExcelDataCell`, `styleExcelSeparator`.
- Checklist by dish: each dish as a styled block (merged title row, subtitle, column header row, data rows, separator).
- Apply consistent header/data styling to Shopping list, Menu info, section sheets.

---

## Phase 4: In-App Preview Layout

- Replace flex rows with `<table>` in `export-preview.component.html`.
- Table styling in SCSS: `border-collapse`, RTL, proper th/td alignment and spacing.

---

## Files Changed

| File | Change |
|------|--------|
| `public/assets/data/dictionary.json` | Add `export_headers` section |
| `src/app/core/utils/export.util.ts` | Add `EXPORT_HEADER_HE`, `UNIT_HE`, `heHeader()`, `heUnit()` |
| `src/app/core/services/export.service.ts` | Hebrew headers/units; Excel styling helpers; professional formatting |
| `src/app/shared/export-preview/export-preview.component.html` | Switch from flex to `<table>` |
| `src/app/shared/export-preview/export-preview.component.scss` | Table styling |
