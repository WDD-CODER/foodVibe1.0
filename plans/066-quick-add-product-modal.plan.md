---
name: Quick-Add Product Modal
overview: Add a "quick-add product" flow to the ingredient search dropdown in the recipe builder. An "Add Item" row always appears at the bottom of the dropdown when the query is non-empty. Clicking or pressing Enter on it opens a compact, keyboard-optimised modal that creates a new product and auto-selects it as the ingredient.
todos:
  - id: create-service
    content: Create QuickAddProductModalService (signal-based, Promise<Product|null> return pattern)
    status: pending
  - id: create-modal-component
    content: Create QuickAddProductModalComponent (compact + expandable sections, keyboard auto-advance, OnPush, a11y)
    status: pending
  - id: style-modal
    content: Style modal SCSS using engine classes + cssLayer skill (expand/collapse transition, add-item row accent)
    status: pending
  - id: update-ingredient-search
    content: Update ingredient-search — dropdown condition, add-item row, keyboard nav fix, auto-select on resolve
    status: pending
  - id: register-in-app-root
    content: Add modal component to app.component.html and import in app.component.ts
    status: pending
  - id: add-dictionary-keys
    content: Add Hebrew translation keys to dictionary.json
    status: pending
isProject: false
---

# Quick-Add Product Modal from Ingredient Search

## Flow

- User types in ingredient search → if searchQuery non-empty, show dropdown (results + add-item row at bottom).
- User acts on add-item row (click or Enter when highlighted) → QuickAddProductModalService.open({ prefillName }).
- Modal opens — focus on base_unit_ select; user picks unit → focus auto-advances to Save.
- Save (compact or with expanded optional fields) → ProductDataService.addProduct() → modal resolves Promise<Product> → ingredient-search emits itemSelected → onItemSelected patches row → focusQuantityAtRow.

## New Files

### 1. QuickAddProductModalService — src/app/core/services/quick-add-product-modal.service.ts

Follows AddItemModalService pattern (Subject + firstValueFrom). isOpen_ signal, config_ signal<{ prefillName: string } | null>. open(config): Promise<Product | null>; save(product); cancel().

### 2. QuickAddProductModalComponent — src/app/shared/quick-add-product-modal/

Compact: name_hebrew (pre-filled), base_unit_ (native select, focus on open). Expand toggle. Expanded: buy_price_global_, category_ (single select → categories_: [value]), yield_factor_, allergens_ (checkboxes from MetadataRegistryService.allAllergens_()), min_stock_level_, expiry_days_default_. Keyboard: focus base_unit_ on open; select (change) advances focus; Enter submits, Escape cancels. A11y: role="dialog", aria-modal="true", aria-labelledby. On save: validate name + base_unit_; isSubmitting_; ProductDataService.addProduct() with defaults; on error UserMsgService toast.

## Modified Files

### 3. Ingredient search

Template: show dropdown when showResults_() && searchQuery_().trim().length > 0. Add <li class="result-item result-item--add"> with plus icon and "הוסף \"{{ searchQuery_() }}\" כמוצר חדש". TS: inject QuickAddProductModalService; fix onSearchKeydown so Enter when highlightedIndex_ === filteredResults_().length (or -1 when empty) calls addNewProduct(); extend highlight upper bound to filteredResults_().length; addNewProduct() async open modal, on resolve selectItem({ ...product, item_type_: 'product' }). SCSS: .result-item--add border-block-start dashed, color primary, gap.

### 4. App root

app.component.html: add <app-quick-add-product-modal/>. app.component.ts: import QuickAddProductModalComponent.

### 5. Dictionary

general: quick_add_product, add_as_new_product, show_more_details, hide_details, saving (Hebrew values).

## Defaults for quick-add

buy_price_global_: 0, purchase_options_: [], categories_: category_ ? [category_] : [], supplierIds_: [], yield_factor_: 1, allergens_: selected, min_stock_level_: 0, expiry_days_default_: 0.
