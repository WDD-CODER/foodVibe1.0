## Goal
Audit every "add new item to an existing collection" flow in the app and verify each one truly persists the new item and immediately re-surfaces it in the picker/dropdown/list it was added from.

## Scope

### Collections to audit (18 flows identified from codebase scan):
| # | Collection | Page / Component | Picker Component | Service |
|---|-----------|-----------------|-----------------|---------|
| 1 | Units | quick-add-product-modal | `CustomSelectComponent` | `UnitRegistryService` |
| 2 | Units | inventory/product-form (base unit) | `CustomSelectComponent` | `UnitRegistryService` |
| 3 | Units | inventory/product-form (purchase option unit sym) | `CustomSelectComponent` | `UnitRegistryService` |
| 4 | Units | recipe-workflow (step unit) | `CustomSelectComponent` | `UnitRegistryService` |
| 5 | Units | recipe-ingredients-table | `CustomSelectComponent` | `UnitRegistryService` |
| 6 | Units | cook-view (yield unit) | `CustomSelectComponent` | `UnitRegistryService` |
| 7 | Product categories | quick-add-product-modal | `CustomSelectComponent` | `MetadataRegistryService` |
| 8 | Product categories | inventory/product-form | `ChipSearchDropdownComponent` | `MetadataRegistryService` |
| 9 | Suppliers | inventory/product-form | native `<select>` | `SupplierDataService` via `AddSupplierFlowService` |
| 10 | Allergens | inventory/product-form | `ChipSearchDropdownComponent` | `MetadataRegistryService` |
| 11 | Recipe labels | recipe-builder/recipe-header | `CustomMultiSelectComponent` | `MetadataRegistryService` |
| 12 | Preparation categories | recipe-builder/recipe-workflow | `CustomSelectComponent` | `PreparationRegistryService` |
| 13 | Equipment categories | equipment/equipment-list (filter) | `CustomSelectComponent` | LOCAL SIGNAL ONLY — no service |
| 14 | Menu event types | menu-intelligence | custom inline dropdown | form patch only — types derived from saved events |
| 15 | Menu section categories (typed) | menu-intelligence | custom inline dropdown | `MenuSectionCategoriesService` |
| 16 | Menu section categories (modal) | menu-intelligence | `AddItemModal` | `MenuSectionCategoriesService` |
| 17 | New products/ingredients | recipe-builder/ingredient-search | inline search | `ProductDataService` |
| 18 | Equipment | recipe-builder (logistics tools) | custom inline dropdown | `EquipmentDataService` |

### Key files:
- `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts`
- `src/app/pages/inventory/components/product-form/product-form.component.ts`
- `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts`
- `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts`
- `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts`
- `src/app/pages/recipe-builder/recipe-builder.page.ts`
- `src/app/pages/cook-view/cook-view.page.ts`
- `src/app/pages/equipment/components/equipment-list/equipment-list.component.ts`
- `src/app/pages/menu-intelligence/menu-intelligence.page.ts`
- `src/app/core/services/unit-registry.service.ts`
- `src/app/core/services/metadata-registry.service.ts`
- `src/app/core/services/supplier-data.service.ts`
- `src/app/core/services/preparation-registry.service.ts`
- `src/app/core/services/menu-section-categories.service.ts`

## Out of Scope
- No code changes in this pass — audit only; fixes go into recommended briefs
- Menu types managed via metadata-manager page (no inline "add new" UI)
- Bulk/batch add operations (only inline "add new" sentinel flows)
- Production Atlas — test account + local Compass only

## Success Criteria
- [ ] `.claude/audits/add-to-collection-audit.md` exists with 18-row inventory table
- [ ] Every row has ✅ / ⚠️ / ❌ verdict from actual `/browse` round-trip, not code-read guess
- [ ] Every non-✅ row has a root-cause paragraph pointing at file:line
- [ ] "Recommended fix briefs" section lists broken/partial flows ranked by severity
- [ ] Test data tagged `AUDIT-*` is either cleaned up or documented at bottom of audit file

## Session ID
2026-04-14-add-new-collection-audit
