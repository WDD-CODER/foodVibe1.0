---
name: Unify logistics search remove From library
overview: "Remove the \"From library\" button and make the single logistics search field the only entry point: when the user types, the dropdown shows matches from (1) logistics library items (LOGISTICS_BASELINE_ITEMS) by equipment name and (2) all equipment (EQUIPMENT_LIST). Fix the current bug where search shows nothing by including all equipment in the search, not only category_ === 'tool'."
todos: []
isProject: false
---

# Unify Logistics Search and Remove "From library" Button

## What you want

- **No "From library" button** – Logistics items always come from localStorage; the user should find them by typing in the **same** search field.
- **One search, one dropdown** – When the user types in the logistics search, show matches. If the item exists (in the logistics library or in the equipment list), show it.
- **Fix "find nothing"** – Today the search only shows equipment with `category_ === 'tool'`. Your equipment list has other categories (heat_source, container, packaging, etc.), so many items never appear. The search should consider **all equipment** from localStorage so that any match by name appears.

## Current behavior (why you see nothing)

- In [recipe-builder.page.ts](src/app/pages/recipe-builder/recipe-builder.page.ts), `filteredLogisticsTools`_ uses `toolsOnly_()`, which is:
  `this.equipmentData_.allEquipment_().filter(eq => eq.category_ === 'tool')`
- So only equipment whose `category_` is exactly `'tool'` appears. In demo data, only 2 items are tools; the rest (e.g. כיריים, מחבת, סיר) are heat_source/container and never show in the dropdown.

## Target behavior

1. **Remove** the "From library" button and the separate library dropdown (`logisticsLibraryDropdownOpen`_ and the block that shows `logisticsLibraryItems_()` in a second dropdown).
2. **Single dropdown** – When the user types in the logistics search input, the **one** dropdown shows a unified list of matches from:
  - **Logistics library** (LOGISTICS_BASELINE_ITEMS): match by equipment name (resolve `equipment_id`_ via `getEquipmentNameById`). Display e.g. "Equipment name × quantity" so it's clear it's a saved template. On select → add that full baseline entry to the form (same as current `addFromLibrary`).
  - **Equipment** (EQUIPMENT_LIST): match by `name_hebrew`. Use **all** equipment (`allEquipment_()`), not only `toolsOnly_()`. On select → either set as selected and let user click Add, or add directly as baseline row (current "select then Add" or "click row to add" behavior).
3. **Unified list and selection** – The dropdown options are a mix of:
  - Library items (with quantity/phase), e.g. "מחבת × 2"
  - Raw equipment, e.g. "בלנדר מהיר"
   When the user picks a library item → add that baseline entry (copy) to the form and close. When the user picks equipment → add a new baseline row with that equipment (and default quantity/phase) and close. So one list, two types of rows, different action per type.
4. **Keep** "Add new tool" at the bottom of the dropdown so the user can create new equipment.
5. **Keep** "Save as template" on each baseline chip so the user can save the current row to the logistics library (LOGISTICS_BASELINE_ITEMS).

## Implementation outline

### 1. Recipe builder TS ([recipe-builder.page.ts](src/app/pages/recipe-builder/recipe-builder.page.ts))

- **Remove** `logisticsLibraryDropdownOpen`_ signal and any logic that toggles it.
- **Replace** `toolsOnly_` usage for the logistics dropdown with **all equipment**: e.g. introduce `allEquipmentForLogistics_ = computed(() => this.equipmentData_.allEquipment_())` (or use `allEquipment_()` directly where needed).
- **Build a unified "search options" list** used by the single dropdown:
  - **Library matches**: from `logisticsBaselineData_.allItems_()`, filter by query matching `getEquipmentNameById(item.equipment_id_)`. Each option is `{ type: 'library', item: LogisticsBaselineItem }`.
  - **Equipment matches**: from `allEquipment_()`, filter by `name_hebrew` containing the query, excluding equipment already in the current baseline. Each option is `{ type: 'equipment', item: Equipment }`.
- **One computed** (e.g. `logisticsSearchOptions_`) that returns a combined, sorted list (e.g. library matches first, then equipment matches, both filtered by the current `logisticsToolSearchQuery_()`).
- **Single handler for option select**: if option is library → call `addFromLibrary(item)`. If option is equipment → add baseline row with that equipment (and default quantity/phase) and clear search / close dropdown (same idea as current `addToolToBaseline` or select + Add).
- **Dropdown open/close**: keep a single dropdown that opens when the user types (e.g. when `logisticsToolSearchQuery_().trim().length > 0`). Remove all references to `logisticsLibraryDropdownOpen_` and the second dropdown.

### 2. Recipe builder HTML ([recipe-builder.page.html](src/app/pages/recipe-builder/recipe-builder.page.html))

- **Remove** the "From library" button (the `logistics-library-btn` and its `(click)` that toggles `logisticsLibraryDropdownOpen_`).
- **Remove** the entire `@if (logisticsLibraryDropdownOpen_()) { ... }` block (the second dropdown with `logisticsLibraryItems_()`).
- **Keep** a single dropdown that binds to `logisticsSearchOptions_()` (or equivalent). Inside the dropdown:
  - `@for` over the unified options; for each option show the right label (library: "name × qty"; equipment: "name").
  - On `(click)` call the single select handler (that either adds from library or adds equipment row).
  - Keep the last row "Add new tool" that calls `openAddNewToolModal()`.
- **Update** `(clickOutside)` so it only closes the single dropdown (remove `logisticsLibraryDropdownOpen_.set(false)`).

### 3. Optional: inventory page

- You mentioned "inside the inventory page where I can choose to see the list of logistics items they need to come from the local storage." This plan does **not** add or change an inventory view; it only fixes the recipe-builder logistics search. If you want a dedicated "list of logistics items" screen under inventory that reads from LOGISTICS_BASELINE_ITEMS, that can be a separate small plan (e.g. a route or a section that lists `logisticsBaselineData_.allItems_()`).

## Summary


| Change                                                                               | Where                                                                                                         |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Remove "From library" button and library-only dropdown                               | recipe-builder.page.html                                                                                      |
| Use all equipment (not only tools) for search                                        | recipe-builder.page.ts                                                                                        |
| Single dropdown: library + equipment matches from one search query                   | recipe-builder.page.ts (unified computed + select handler), recipe-builder.page.html (one dropdown, one list) |
| Click library option → add baseline entry; click equipment option → add baseline row | recipe-builder.page.ts                                                                                        |
| Keep "Save as template" on chips, keep "Add new tool" in dropdown                    | no change                                                                                                     |


Result: one search field, one dropdown, matches from both the logistics library and all equipment in localStorage, so "if it exists and there is a match" the user gets it.
