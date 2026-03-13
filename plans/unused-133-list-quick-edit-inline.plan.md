# Plan 133 — List quick-edit (inline per-cell)

Quick-edit for list items inside the list-shell: click an **editable parameter value** to change it inline (e.g. dropdown); blur from the **entire row** batches changes and shows one “Save these changes?” confirmation. Click on non-editable area or row background still navigates to detail/panel as today.

---

## Scope

- **Lists using list-shell**: inventory product list, supplier list, equipment list, venue list, recipe-book list (each list defines which columns are quick-editable).
- **Blur = whole row (Option B)**: When focus leaves the row (e.g. Tab to next row or to search/filters), show one confirmation modal and batch-save all changed fields for that row (or discard).
- **Carousel**: Navigation arrows stay for switching columns. Only the **cell value/content** is clickable for quick-edit (not the whole carousel area). Arrows = change visible column; click on a specific parameter value = open inline edit.
- **Supplier / equipment**: Keep both flows. **Row click** (non-editable area) → expand panel below (full form). **Click editable parameter value** → inline dropdown/control for that field; confirm on row blur.
- **Validation**: Quick-edit applies only to **existing** items. If user clears a required field and tries to save: do not save; show error message (e.g. “This item cannot be saved like this”) and **highlight the invalid cell** (e.g. red border). Use `aria-invalid` and `aria-describedby` for the error.

---

## Behaviour summary

| Action | Result |
|--------|--------|
| Click editable cell **value** | Open inline control (dropdown/input) for that field; no navigation. |
| Click non-editable cell or row background | Current behaviour: navigate to detail or expand panel. |
| Focus leaves **row** (blur) after edits | One “Save these changes?” modal; batch-save or discard. |
| Required field empty on save | Show error message + red border on cell; do not save. |

---

## Keyboard and a11y (resolutions)

1. **Focus model**
   - Row is a focusable container (e.g. first Tab lands on row; Enter/Space = open detail/panel).
   - Editable cells are additional tab stops (e.g. `<button>` or focusable element with label like “Supplier, Vegetable Supplier, edit”). Enter/Space on that cell = open inline control.

2. **When inline control is open**
   - Focus trap inside dropdown/input until closed.
   - **Esc**: close and discard that cell’s change (no confirm).
   - **Enter** in dropdown: choose option and close; return focus to the cell.
   - On close, return focus to the cell that opened it.

3. **Row blur**
   - When focus leaves the row (Tab to next row or out), trigger batch “Save these changes?” and save or discard.

4. **Screen readers**
   - Row: `role="row"` in a grid/table or keep `role="button"` with clear `aria-label` (e.g. product name + key fields).
   - Editable cells: expose as controls with labels like “Supplier, Vegetable Supplier, edit” and `aria-readonly="false"` or equivalent so users know they are editable.
   - Inline control: `aria-label` (e.g. “Change supplier”); optional live region when opening (“Editing supplier”).
   - Validation: `aria-invalid="true"` and `aria-describedby` on invalid cell; error message with `role="alert"`; red border.

5. **Error UI**
   - On save attempt with empty required field: red border on that cell/control, inline or below-cell error text (“This item cannot be saved like this” or field-specific), focus moved to invalid cell.

---

## Implementation outline

1. **Shared / list-shell**
   - No change to list-shell layout. Optionally add a small directive or contract (e.g. “editable cell” class or attribute) so row-blur and focus handling can be shared.
   - Define row-blur detection (focus leaving the row container) and a single “pending edits for this row” store (e.g. map of field → new value) so one confirm modal can batch-save.

2. **Per-list**
   - **Inventory product list**: Mark editable columns (e.g. supplier, category, unit; optionally price if not already). Wrap **value** in a focusable control that opens dropdown (supplier: list + “Add supplier”; category/unit: existing registries). Row click stays navigate to edit; exclude editable cell controls from row-click (stopPropagation when opening inline).
   - **Supplier list**: Keep row click → panel. Add quick-edit for specific cells (e.g. contact, delivery day, min order) where it makes sense; same row-blur confirm.
   - **Equipment list**: Same as supplier: panel stays; add quick-edit for e.g. category, owned quantity, is_consumable.
   - **Venue list / Recipe-book list**: Decide which columns are editable (e.g. venue: environment type; recipe: type/labels read-only or limited). Apply same pattern where applicable.

3. **Carousel**
   - Ensure only the **content** inside each carousel cell is the clickable/focusable quick-edit target; carousel arrows and container do not trigger inline edit. No change to arrow behaviour.

4. **Confirm modal**
   - Reuse `ConfirmModalService`. New message key for “Save these changes?” (batch save). On confirm: apply all pending edits for that row (single API call or per-field calls as today), then clear pending state. On cancel: revert and clear.

5. **Validation**
   - Before saving, check required fields for the entity. If any quick-edited required field is empty, do not save; set invalid state on that cell (red border + `aria-invalid` + error message), focus that cell.

6. **i18n**
   - Add keys: e.g. “Save these changes?”, “This item cannot be saved like this” (or per-field), “edit” for aria labels.

---

## Files to touch (indicative)

- [list-shell](src/app/shared/list-shell/) — optional shared row-blur / pending-edits helper or directive.
- [inventory-product-list](src/app/pages/inventory/components/inventory-product-list/) — editable cells (supplier, category, unit), row click vs cell click, row-blur confirm, validation.
- [supplier-list](src/app/pages/suppliers/components/supplier-list/) — add per-cell quick-edit for chosen fields; keep panel on row click.
- [equipment-list](src/app/pages/equipment/components/equipment-list/) — same as supplier.
- [venue-list](src/app/pages/venues/components/venue-list/) — optional quick-edit columns.
- [recipe-book-list](src/app/pages/recipe-book/components/recipe-book-list/) — optional quick-edit columns.
- [confirm-modal.service](src/app/core/services/confirm-modal.service.ts) — already used; add translation key for batch save.
- [dictionary.json](public/assets/data/dictionary.json) — new keys.
- Shared dropdown/select components and “add supplier” (or similar) flows — reuse where possible.

---

## Verification

- Click editable value → inline control opens; click row elsewhere → detail/panel.
- Edit several cells in one row, Tab out → one “Save these changes?” → save or discard.
- Clear required field, try save → error message + red border, no save.
- Carousel: arrows switch column; only value click opens edit.
- Keyboard: Tab to row, then to editable cells; Enter opens inline; Esc closes; focus returns.
- Screen reader: row and editable cells announced; invalid state announced.
