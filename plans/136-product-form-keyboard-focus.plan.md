# Product Form Keyboard Focus and Tab Order

## Current state (what works)

- **Tab order (DOM)** in product-form.component.html: product name input → category trigger (tabindex="0") → buy price input → base unit (custom-select trigger button) → "Add purchase unit" button → purchase rows → optional sections (collapsible headers with tabindex="0") → Cancel / Submit.
- **Category** already has: tabindex="0" on trigger, Enter/ArrowDown/ArrowUp to open and move highlight, Enter to select, Escape to close, focus moved to highlighted item and back to trigger on close.
- **Custom-select** (base unit, unit_symbol_, uom): trigger is focusable; when open, ArrowUp/ArrowDown change highlight, Enter selects, Escape closes.
- **Collapsible optional sections**: headers have tabindex="0" and (keydown.enter) to expand/collapse.

## Gaps (to fix)

1. **No initial focus** — Set focus to the product name input when the form view is ready (ngAfterViewInit or afterNextRender), for both add and edit.
2. **Category: Space to select** — In onCategoryDropdownKeydown, treat Space (when dropdown is open) the same as Enter.
3. **Custom-select: Space to select** — When dropdown is open, add handling for Space to select highlighted option.
4. **Supplier: not keyboard-accessible** — Make supplier chips container focusable (tabindex="0"); add keyboard handlers (Enter/Space/ArrowDown/ArrowUp to open and navigate); keydown on dropdown for Arrow/Enter/Space/Escape; return focus to supplier trigger on close.
5. **Allergen dropdown: no keyboard navigation** — Add highlight index; keydown when suggestions visible: ArrowDown/ArrowUp/Enter/Space/Escape.
6. **Collapsible headers: Space** — Add (keydown.space) with preventDefault to expand/collapse.
7. **Equipment form** — Set initial focus to the name input when form is shown.

## Intended keyboard flow (product form)

- Open form (add or edit) → focus on **product name**.
- Tab → **category** trigger. Enter or Space or ArrowDown/Up → open; ArrowDown/Up → move highlight; Enter or Space → select; Escape → close.
- Tab → **buy price** → **base unit** (Enter/Space to open, Arrow to move, Enter/Space to select) → purchase rows → optional sections (Enter/Space on headers) → supplier/allergen keyboard when expanded → Cancel / Submit.

## Files to touch

| Area | File | Changes |
|------|------|--------|
| Initial focus (product) | product-form.component.ts | ViewChild for name input; focus in ngAfterViewInit. |
| Initial focus (product) | product-form.component.html | Template ref #productNameInput on product name input. |
| Category Space | product-form.component.ts | In onCategoryDropdownKeydown, handle key === ' ' like Enter. |
| Custom-select Space | custom-select.component.ts | When open, add Space to select highlighted option. |
| Supplier keyboard | product-form.component.html | Supplier .selected-chips: tabindex="0", keydown handlers; dropdown: (keydown), option ids/tabindex="-1". |
| Supplier keyboard | product-form.component.ts | supplierDropdownHighlightIndex_, onSupplierKeyboardOpen, onSupplierDropdownKeydown, focusSupplierItem, return focus on close. |
| Allergen keyboard | product-form.component.html | Allergen dropdown: (keydown) on container; option ids. |
| Allergen keyboard | product-form.component.ts | allergenDropdownHighlightIndex_, onAllergenDropdownKeydown. |
| Collapsible Space | product-form.component.html | Each collapsible header: (keydown.space)="toggleX(); $event.preventDefault()". |
| Equipment initial focus | equipment-form.component.ts | ViewChild for name input, focus in ngAfterViewInit. |
| Equipment initial focus | equipment-form.component.html | Template ref #nameInput for name input. |
