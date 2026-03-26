# App-wide custom-select: unified style and behavior (Plan 177 + app-wide merge)

## Goal
- **Unify** all `app-custom-select` usages to the same behavior: **type-to-filter**, scrollable dropdown, and when options include an "add new" sentinel, that option is styled and pinned at the bottom while filtering.
- **Workflow** (recipe-workflow): Keep default look (bordered box, no `variant="chip"`); add type-to-filter and add-new.
- **Everywhere else**: Add `[typeToFilter]="true"` and, where options include an add-new sentinel, `[addNewValue]="'<sentinel>'"`
- **Multi-select**: Out of scope. Product-form category and allergen use custom chip+dropdown UIs; custom-select stays single-value.

## Component
No changes to [custom-select.component.ts](src/app/shared/custom-select/custom-select.component.ts) or SCSS. `typeToFilter` defaults `false`; we add bindings at each usage. Sentinel values: `__add_new__` (category), `__add_unit__` (unit), `NEW_UNIT` (product-form), `__add_category__` (quick-add category).

---

## Implementation (all phases)

### 1. Recipe workflow
**File:** [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html)
- **Category select:** Add `[typeToFilter]="true"`, `[addNewValue]="'__add_new__'"`. No variant="chip".
- **Unit select:** Add `[typeToFilter]="true"`, `[addNewValue]="'__add_unit__'"`. No variant="chip".

### 2. Recipe ingredients table
**File:** [recipe-ingredients-table.component.html](src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.html)
- **Unit select:** Add `variant="chip"`, `[typeToFilter]="true"`, `[addNewValue]="'__add_unit__'"` (getUnitOptions already includes `__add_unit__`).

### 3. Product form
**File:** [product-form.component.html](src/app/pages/inventory/components/product-form/product-form.component.html)
- **base_unit_:** `[typeToFilter]="true"`, `[addNewValue]="'NEW_UNIT'"`.
- **unit_symbol_** (purchase row): `[typeToFilter]="true"`, `[addNewValue]="'NEW_UNIT'"`.
- **uom:** `[typeToFilter]="true"` only (no add-new in uomOptions_).

### 4. Cook-view
**File:** [cook-view.page.html](src/app/pages/cook-view/cook-view.page.html)
- **Yield unit** and **two ingredient unit** selects: `[typeToFilter]="true"` only.

### 5. Menu intelligence + menu library
- **Menu intelligence** [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html): serving_type_ — `[typeToFilter]="true"`.
- **Menu library list** [menu-library-list.component.html](src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html): eventType, servingStyle, sortBy — `[typeToFilter]="true"` on each.

### 6. Equipment
- **Equipment list** [equipment-list.component.html](src/app/pages/equipment/components/equipment-list/equipment-list.component.html): category — `[typeToFilter]="true"`, `[addNewValue]="'__add_new__'"`.
- **Equipment form** [equipment-form.component.html](src/app/pages/equipment/components/equipment-form/equipment-form.component.html): category — `[typeToFilter]="true"` only (fixed CATEGORIES, no add-new).
- **Add-equipment modal** [add-equipment-modal.component.html](src/app/shared/add-equipment-modal/add-equipment-modal.component.html): category — `[typeToFilter]="true"`, `[addNewValue]="'__add_new__'"`.

### 7. Venue form + unit creator + quick-add
- **Venue form** [venue-form.component.html](src/app/pages/venues/components/venue-form/venue-form.component.html): environment_type_, equipment — `[typeToFilter]="true"`.
- **Unit creator** [unit-creator.component.html](src/app/shared/unit-creator/unit-creator.component.html): basis unit — `[typeToFilter]="true"`.
- **Quick-add product modal** [quick-add-product-modal.component.html](src/app/shared/quick-add-product-modal/quick-add-product-modal.component.html): already has `[typeToFilter]="true"` on both; add `[addNewValue]="'__add_unit__'"` on base unit, `[addNewValue]="'__add_category__'"` on category.

---

## Summary table
| Location | File | Select(s) | Add |
|----------|------|-----------|-----|
| Recipe workflow | recipe-workflow.component.html | category, unit | typeToFilter, addNewValue __add_new__ / __add_unit__ |
| Recipe ingredients table | recipe-ingredients-table.component.html | unit | variant=chip, typeToFilter, addNewValue __add_unit__ |
| Product form | product-form.component.html | base_unit_, unit_symbol_, uom | typeToFilter; addNewValue NEW_UNIT on first two |
| Cook-view | cook-view.page.html | yield + 2 unit | typeToFilter |
| Menu intelligence | menu-intelligence.page.html | serving_type_ | typeToFilter |
| Menu library list | menu-library-list.component.html | 3 filters | typeToFilter |
| Equipment list | equipment-list.component.html | category | typeToFilter, addNewValue __add_new__ |
| Equipment form | equipment-form.component.html | category | typeToFilter |
| Add-equipment modal | add-equipment-modal.component.html | category | typeToFilter, addNewValue __add_new__ |
| Venue form | venue-form.component.html | 2 | typeToFilter |
| Unit creator | unit-creator.component.html | basis unit | typeToFilter |
| Quick-add product modal | quick-add-product-modal.component.html | base unit, category | addNewValue __add_unit__ / __add_category__ |

Result: all app-custom-select instances get type-to-filter and scrollable list; add-new is styled and pinned where options include the sentinel.
