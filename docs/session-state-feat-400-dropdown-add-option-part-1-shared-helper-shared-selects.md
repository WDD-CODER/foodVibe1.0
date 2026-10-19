# Session state — plan 400 (dropdown add option, part 1)

Branch: `feat/400-dropdown-add-option-part-1-shared-helper-shared-selects`

## A1 — dropdowns that offer "add" (shared selects)

| Where | Component | Sentinel | Label key | Typed add (`הוסף "<x>"`) |
| --- | --- | --- | --- | --- |
| Equipment list → inline edit → category | custom-select | `__add_new__` | `add_new_category` | yes (skips the name modal) |
| Add-equipment modal → category | custom-select | `__add_new__` | `add_new_category` | yes |
| Product form → category | chip-search-dropdown | — | `add_new_category` | yes (prefills key modal) |
| Product form → supplier | chip-search-dropdown | — | `add_new_supplier` (new) | no — `AddSupplierFlowService.open()` takes no name |
| Product form → allergens | chip-search-dropdown | — | `add_new_allergen` | yes (only shown for a typed name) |
| Product form → base unit / purchase unit / compare-to unit | custom-select | `NEW_UNIT` | `add_new_unit` (default) | no — unit creator takes no name |
| Quick-add product modal → base unit | custom-select | `__add_unit__` | `add_new_unit` (default) | no |
| Quick-add product modal → category | custom-select | `__add_category__` | `add_new_category` | yes (skips the name modal) |
| Recipe builder → labels | custom-multi-select | `__add_label__` | `add_new_label` | yes (prefills label modal) |
| Recipe builder → ingredient unit | custom-select | `__add_unit__` | `add_new_unit` (default) | no |
| Recipe builder → workflow prep category | custom-select | `__add_new__` | `add_new_preparation_category` (new) | yes (prefills key modal) |
| Recipe builder → workflow unit | custom-select | `__add_unit__` | `add_new_unit` (default) | no |
| AI recipe draft editor → units (×3) | custom-select | `__add_unit__` | `add_new_unit` (default) | no |
| Scaling chip → unit | custom-select | `__add_unit__` | `add_new_unit` (default) | no |
| Cook view → units | custom-select | `__add_unit__` | `add_new_unit` (default) | no — file not touched (default covers it) |
| Selection bar → bulk value | custom-select | per field | `addNewLabelKey` on the field, default `add_new_item` | no — no field sets `addNewValue` today |

Typed add is opt-in (`[allowTypedAdd]="true"`) so the label never promises a name the caller's
add flow can't take.

## Page-level dropdowns → plan 401

Recipe builder ingredient search, preparation search, logistics tool picker; menu event type and
section category.

## Follow-ups (not in scope)

- Unit creator and `AddSupplierFlowService` take no prefilled name, so units and suppliers show
  only the generic label. Adding a `name` to `UnitRegistryService.openUnitCreator()` context and to
  `AddSupplierFlowService.open()` would let them use `הוסף "<typed>"` too.
- `add_new_allergen` reads "הוסף אלרגן" (no "חדש"); dictionary is append-only, so left as is.

## Session Summary

- Shared add-option helper (`core/utils/add-option.util.ts`), `shared/add-option-row`, `KeyedPickerSearch` copied to `core/utils`; custom-select, custom-multi-select, chip-search-dropdown use them.
- Callers pass `add_new_<thing>` keys; typed add is opt-in (`allowTypedAdd`) where the add flow takes a name.
- `ng build` + `ng test` (574) green.

## Next Steps

- Plan 401 (page dropdowns) and 402 (convention doc) build on this.
