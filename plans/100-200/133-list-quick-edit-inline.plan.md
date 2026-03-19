# Plan 133 — List quick-edit (inline per-cell)

Quick-edit for list items inside the list-shell: click an **editable parameter value** to change it inline (e.g. dropdown); blur from the **entire row** batches changes and shows one “Save these changes?” confirmation. Click on non-editable area or row background still navigates to detail/panel as today.

---

## Current state (as of app today)

- **list-shell** ([list-shell.component.ts](src/app/shared/list-shell/list-shell.component.ts)): Content-projected layout with `isPanelOpen`, `gridTemplate`, `mobileGridTemplate`, `dir`, `panelToggle`. No row or cell contract; rows are defined in each list’s template inside `shell-table-body`.
- **Lists using list-shell**: inventory-product-list, supplier-list, equipment-list, venue-list, recipe-book-list. **Out of scope**: menu-library (does not use list-shell).
- **Supplier and equipment lists** already have an **inline-edit-panel** that expands below the row when the user clicks the row or Edit (keyed by `editingId_()`). Quick-edit is **in addition**: per-cell inline control (e.g. dropdown) in the row; row blur → one batch “Save these changes?”. Full panel remains for multi-field edit.
- **Carousel**: [CellCarouselComponent](src/app/shared/cell-carousel/cell-carousel.component.ts) + [CarouselHeaderComponent](src/app/shared/carousel-header/carousel-header.component.ts) used in inventory, supplier, equipment, venue, recipe-book. Content is projected via `ng-content`; arrows use `stopPropagation`. Only the **value** inside each slide (e.g. text or control) should be the quick-edit target; arrows keep current behaviour.
- **ConfirmModalService** ([confirm-modal.service.ts](src/app/core/services/confirm-modal.service.ts)): `open(message: string, options?: ConfirmModalOptions)` — `message` is a translation key; options include `saveLabel`, `title`, `variant`. Reuse for batch-save confirmation.
- **Dropdowns**: Reuse [CustomSelectComponent](src/app/shared/custom-select/custom-select.component.ts) for inline dropdowns (already used in equipment-list inline-edit-panel and elsewhere). Path aliases: use `@services/`, `@models/` per project standards.
- **Styling**: Before creating or editing any list or shared `.scss`, read and apply [.claude/skills/cssLayer/SKILL.md](.claude/skills/cssLayer/SKILL.md) (tokens, `@layer`, five-group rhythm).

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
   - Define row-blur detection (focus leaving the row container) and a single “pending edits for this row” store using **signals** (e.g. `signal<Map<string, unknown>>` or similar) so one confirm modal can batch-save.

2. **Per-list**
   - **Inventory product list**: Mark editable columns (e.g. supplier, category, unit; optionally price if not already). Wrap **value** in a focusable control that opens dropdown (supplier: list + “Add supplier”; category/unit: existing registries). Reuse **CustomSelectComponent** where applicable. Row click stays navigate to edit; exclude editable cell controls from row-click (stopPropagation when opening inline).
   - **Supplier list**: Keep row click → expand panel (existing inline-edit-panel). Add quick-edit for specific cells (e.g. contact, delivery day, min order) where it makes sense; same row-blur confirm.
   - **Equipment list**: Same as supplier: keep expand panel; add quick-edit for e.g. category, owned quantity, is_consumable (reuse CustomSelectComponent for category).
   - **Venue list / Recipe-book list**: Decide which columns are editable (e.g. venue: environment type; recipe: type/labels read-only or limited). Apply same pattern where applicable.

3. **Carousel**
   - Ensure only the **content** inside each carousel cell (the value, not the slide wrapper) is the clickable/focusable quick-edit target; carousel arrows and container do not trigger inline edit. No change to [cell-carousel](src/app/shared/cell-carousel/) arrow behaviour.

4. **Confirm modal**
   - Reuse **ConfirmModalService** (`@services/confirm-modal.service`). Add translation key for batch save (e.g. `save_these_changes`) and call `confirmModal.open('save_these_changes', { saveLabel: 'save' })` (or derive from options). On confirm: apply all pending edits for that row (single API call or per-field calls as today), then clear pending state. On cancel: revert and clear.

5. **Validation**
   - Before saving, check required fields for the entity. If any quick-edited required field is empty, do not save; set invalid state on that cell (red border + `aria-invalid` + error message), focus that cell.

6. **i18n**
   - Add keys in **general** section of [dictionary.json](public/assets/data/dictionary.json): e.g. `save_these_changes`, `this_item_cannot_be_saved_like_this` (or per-field), `edit` for aria labels if not already present.

7. **Styles**
   - Before creating or editing any list or shared component `.scss`, read and apply [.claude/skills/cssLayer/SKILL.md](.claude/skills/cssLayer/SKILL.md).

---

## Files to touch (indicative)

- [list-shell](src/app/shared/list-shell/) — optional shared row-blur / pending-edits helper or directive.
- [inventory-product-list](src/app/pages/inventory/components/inventory-product-list/) — editable cells (supplier, category, unit), row click vs cell click, row-blur confirm, validation.
- [supplier-list](src/app/pages/suppliers/components/supplier-list/) — add per-cell quick-edit for chosen fields; keep panel on row click (existing inline-edit-panel).
- [equipment-list](src/app/pages/equipment/components/equipment-list/) — same as supplier; reuse CustomSelectComponent for category in quick-edit.
- [venue-list](src/app/pages/venues/components/venue-list/) — optional quick-edit columns.
- [recipe-book-list](src/app/pages/recipe-book/components/recipe-book-list/) — optional quick-edit columns.
- [confirm-modal.service](src/app/core/services/confirm-modal.service.ts) — already used; add translation key usage for batch save (no API change).
- [dictionary.json](public/assets/data/dictionary.json) — new keys in `general`.
- [custom-select](src/app/shared/custom-select/) — reuse for inline dropdowns; no change unless list-specific styling needed.
- [cell-carousel](src/app/shared/cell-carousel/) — no change to component; list templates make only cell value focusable/clickable for edit.

---

## Critical questions

Before implementation, confirm:

- Which list should get quick-edit first for a pilot (inventory vs supplier vs equipment)?
  a. Inventory product list (most columns: supplier, category, unit, possibly price).
  b. Equipment list (already has inline-edit-panel; add category/owned/consumable quick-edit).
  c. Supplier list (already has inline-edit-panel; add contact/delivery/min-order quick-edit).

Recommendation: b or c to align with existing inline-edit-panel and smaller set of quick-edit fields.

---

## Atomic sub-tasks

1. Add i18n keys to `dictionary.json` (`general`): `save_these_changes`, `this_item_cannot_be_saved_like_this` (and any field-specific errors if needed).
2. (Optional) Add shared directive or helper for row-blur detection and signal-based pending-edits store; OR implement row-blur and pending-edits in the first list only, then extract if repeating.
3. Implement quick-edit in **pilot list** (per Critical questions): editable cell wrappers, stopPropagation from row click, open CustomSelect/input on value click, row-blur → ConfirmModalService with batch save/discard, validation with aria-invalid and error message.
4. Apply same pattern to remaining list-shell lists (inventory, supplier, equipment, venue, recipe-book) per scope.
5. Carousel: ensure only cell value (not whole slide) is quick-edit target in each list that uses cell-carousel; verify arrows and row click unchanged.
6. A11y and keyboard: focus order, Esc/Enter in inline control, focus return, screen reader labels; run manual verification.
7. Styles: any new classes for editable cell, invalid state, or focus ring — apply cssLayer skill and use tokens from `src/styles.scss`.

---

## Verification

- Click editable value → inline control opens; click row elsewhere → detail/panel (or expand panel on supplier/equipment).
- Edit several cells in one row, Tab out → one “Save these changes?” → save or discard.
- Clear required field, try save → error message + red border, no save.
- Carousel: arrows switch column; only value click opens edit.
- Keyboard: Tab to row, then to editable cells; Enter opens inline; Esc closes; focus returns.
- Screen reader: row and editable cells announced; invalid state announced.
- Existing inline-edit-panel (supplier/equipment) still works when row or Edit is clicked; quick-edit is additive for cell-level changes.
