---
name: Menu Intelligence layout and design
overview: "Plan for menu-intelligence page: (a) menu name as h1 without label, (b) meta info right-aligned and denser, (c) paper frame border radius, (d) fix dropdown background (--bg-paper-light), (f) 'Add category' in section dropdown using add-item-modal, (g) configurable menu-type entity in metadata manager that determines which dish-row fields appear."
todos:
  - id: fix-dropdown-bg
    content: "d: Replace var(--bg-paper-light) with var(--bg-pure) in menu-intelligence.page.scss (3 places)"
  - id: layout-visuals
    content: "a+b+c: Menu name as h1, meta info right-aligned and denser, paper border-radius"
  - id: add-category-modal
    content: "f: Add persistent 'Add category' button in section dropdown that opens add-item-modal"
  - id: menu-type-model
    content: "g1: Create MenuTypeDefinition model + extend MetadataRegistryService with MENU_TYPES storage"
  - id: menu-type-control-panel
    content: "g2: Add 'Menu Types' card in metadata manager with field-checkbox configuration"
  - id: menu-type-selector
    content: "g3: Replace hardcoded serving_type_ select with dynamic menu-type dropdown in menu-intelligence"
  - id: dish-row-fields
    content: "g4: Implement dish-row field container that renders fields based on selected menu type"
isProject: true
---

# Menu Intelligence Layout and Design

## Current state

- **Menu name**: In menu-intelligence.page.html (lines 30-40), a `.meta-label` shows "שם התפריט..." and a `.meta-input` for the name.
- **Meta block**: Event type, serving style, guests, event date in `.meta-column` (max-width 420px, centered; `.meta-row` gap 12px).
- **Design frame**: `.paper` / `.paper-inner` with `border-radius: 2px`.
- **Dropdown background**: `.event-type-list`, `.section-dropdown`, `.dish-dropdown`, `.financial-bar` use `var(--bg-paper-light)` which is **not defined** in `:root`, so backgrounds don't render.
- **Section dropdown**: Only shows "+ {searchQuery}" when user has typed; no persistent "Add category" option.
- **Serving type**: Hardcoded `<select>` with 3 options (`buffet_family`, `plated_course`, `cocktail_passed`) in menu-event.model.ts as a union type.
- **Dish row**: Shows dish name + `getDerivedPortions()`. No sell price, food cost in currency, or serving size info.

---

## a. Menu name as h1, no label

- **HTML**: Remove the `<label class="meta-label">` for menu name. Keep only the `<input>` with `aria-label` for a11y and placeholder for hint.
- **SCSS**: Style the menu-name input as h1: font-size 1.75-2rem, font-weight 700, text-align center, no visible border. Add a `.menu-name-input` class.

---

## b. Meta info right-aligned and denser

- **SCSS**: `.meta-column` -- remove `margin-left: auto; margin-right: auto;`, set `margin-right: 0;` (in RTL this pushes content right). Reduce `max-width` to ~360px. `.meta-row` -- reduce `gap` from 12px to 6px.

---

## c. Design frame border radius

- **SCSS**: Change `.paper` `border-radius` from `2px` to `var(--radius-lg)` (1rem). Similarly for `.paper-inner`.

---

## d. Fix dropdown background

- Replace all 3 occurrences of `var(--bg-paper-light)` in menu-intelligence.page.scss with `var(--bg-pure)`:
  - `.event-type-list` (line 244)
  - `.section-dropdown, .dish-dropdown` (line 370)
  - `.financial-bar` (line 533)

---

## f. "Add category" in section dropdown via add-item-modal

- **HTML**: Inside `.section-dropdown`, add a **persistent** (always-visible) button at the bottom: `+ הוסף קטגוריה` that calls `openAddCategoryModal(sectionIndex)`.
- **TS**: New method `openAddCategoryModal(sectionIndex)` -- calls `this.addItemModal.open({ title: 'add_new_category', label: 'menu_search_category', saveLabel: 'save' })`. On result: push to `sectionCategories_` if new, call `selectSectionCategory()`, call `closeSectionSearch()`.

---

## g. Menu Type as configurable entity + dish-row fields

The hardcoded `serving_type_` becomes a dynamic "menu type" managed in the metadata manager, where each type defines which per-dish fields to show.

### g1. Data model -- MenuTypeDefinition

Add to menu-event.model.ts: `DishFieldKey` type, `ALL_DISH_FIELDS`, `DEFAULT_DISH_FIELDS`, `MenuTypeDefinition` interface. Change `ServingType` to `string`. Extend `MenuItemSelection` with optional `sell_price_`, `food_cost_override_`, `serving_portions_`.

### g2. Storage and service

Extend MetadataRegistryService: `menuTypes_` signal, storage key `MENU_TYPES`, default seed, `registerMenuType`, `updateMenuType`, `deleteMenuType`, `getMenuTypeFields`. Load in `initMetadata()`.

### g3. Metadata manager

New "Menu Types" card: list types with field pills, Add (add-item-modal + field checkboxes), Edit, Delete with usage check.

### g4. Menu intelligence -- dynamic serving type

Replace hardcoded select with dropdown from `allMenuTypes_()`. Add `activeMenuTypeFields_()` computed.

### g5. Dish row field container

When recipe selected, render `.dish-fields` with inputs per `activeMenuTypeFields_()`. Tab/arrow keyboard nav. Auto-fill food_cost_money from RecipeCostService where applicable.

### g6. Form controls

Extend MenuItemForm and addItem/loadEvent to include per-item field controls; persist in MenuItemSelection.

---

## Suggested execution order

1. **d** -- Fix dropdown background.
2. **a, b, c** -- Layout/visual changes.
3. **f** -- "Add category" in section dropdown.
4. **g1** -- Data model.
5. **g2** -- Storage (MetadataRegistryService).
6. **g3** -- Metadata manager card.
7. **g4, g5, g6** -- Menu intelligence integration.
