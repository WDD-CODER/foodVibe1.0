# Logistics tools + menu type full edit

## Scope

- **a.** Show logistics (tools) section for both **recipe** (preparation) and **dish** in the recipe builder.
- **b.** Replace the current equipment dropdown with a **search** over tools; add an **"Add new tool"** option in the dropdown that opens the existing add-equipment modal (name + category).
- **c.** Redesign the logistics container into a **grid**: one side = search + quantity for adding; the other = **dense chip grid** of added items (click chip to remove). Style distinctly from the ingredients table.
- **d.** In metadata manager **Menu Types** card: apply `grid-template-columns: 1fr auto 30px 30px` per row; **inline editable name** (click to edit, on blur confirm rename via shared confirm modal); **removable field chips** (click to remove); **actions grouped** (edit + delete) on one side; ensure **rename updates all usages** (menu events' `serving_type_`).

---

## 1. Recipe vs dish: show logistics for both

- **File:** `src/app/pages/recipe-builder/recipe-builder.page.html`
- **Change:** Remove the condition `recipeType_() === 'dish'` so the logistics section is rendered for both preparation and dish.
- **Persistence:** Form already has `logistics.baseline_` and load/save already handle it.

---

## 2. Add-tool: search + "Add new tool" opening add-equipment modal

- **Tool source:** Filter equipment by `category_ === 'tool'`. Equipment from EquipmentDataService (`allEquipment_`).
- **Implement tool search** in recipe builder (pattern like ingredient-search): input, filter by text, ScrollableDropdownComponent. Add list entry **"Add new tool…"** that opens add-equipment modal.
- **Option A:** In recipe builder, on "Add new tool" → open modal → on result call `EquipmentDataService.addEquipment(...)` with returned name/category, then push new equipment `_id` into `logisticsBaselineArray`.

---

## 3. Logistics container: grid + search/quantity + chip strip

- **Layout:** One area = search input + quantity input + add-on-select. Other area = grid dense container of chips (tool name + quantity); click chip = remove from `logisticsBaselineArray`.
- **Data:** Keep `logistics.baseline_` (FormArray). Resolve `equipment_id_` to display name via equipment list.
- **Files:** recipe-builder.page.html, recipe-builder.page.ts, recipe-builder.page.scss — new classes `.logistics-grid`, `.logistics-chips`, `.logistics-chip`; distinct look from ingredients (cssLayer + tokens).

---

## 4. Metadata manager: menu type row layout and behavior

- **Grid:** `.menu-type-row` view mode: `grid-template-columns: 1fr auto 30px 30px` (name | pills | edit | delete).
- **Inline name edit:** Editable key; on blur if changed, open ConfirmModalService; on confirm run rename (see §5).
- **Removal by chips:** Click field pill = remove that field and call `updateMenuType(key, updatedFields)`.
- **Edit/delete:** Keep existing edit (checkboxes) and delete actions.

---

## 5. Rename menu type and propagate

- **MetadataRegistryService:** Add `renameMenuType(oldKey, newKey)`: replace old key with new in MENU_TYPES, persist.
- **MenuEventDataService:** Add `updateServingTypeForAll(oldServingType, newServingType)`: for each event where `serving_type_ === oldServingType` set to new, then `updateMenuEvent` each.
- **Flow:** On name blur + confirm: `metadataRegistry.renameMenuType(oldKey, newKey)` then `menuEventData.updateServingTypeForAll(oldKey, newKey)`.

---

## 6. Confirm modal for rename

- Use ConfirmModalService with translation key for rename message. On confirm, run rename + events update.

---

## 7. Files to touch

| Area | Files |
|------|------|
| Logistics for both | recipe-builder.page.html |
| Tool search + add new tool | Recipe builder (tool search inline or component); recipe-builder.page.ts |
| Logistics grid + chips | recipe-builder.page.html, .ts, .scss |
| Menu type row | metadata-manager.page.component.html, .scss, .ts |
| Rename + propagate | metadata-registry.service.ts, menu-event-data.service.ts |
| Confirm + i18n | metadata-manager.page.component.ts; dictionary |
