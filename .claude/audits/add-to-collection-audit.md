# Add-New Collection Persistence Audit

**Plan:** 268 | **Date:** 2026-04-14–15 | **Branch:** `audit/268-add-new-collection`
**Backend:** Express on :3000, Angular on :4200 | **DB:** Connected

---

## Inventory Table

| # | Collection | Page / Context | Picker Component | Service | Has "add new" UI? | Persists? | Re-appears? |
|---|-----------|---------------|-----------------|---------|:------------------:|:---------:|:-----------:|
| 1 | Units | quick-add-product-modal | CustomSelectComponent | UnitRegistryService | ✅ | ✅ | ✅ |
| 2 | Units | product-form — base unit | CustomSelectComponent | UnitRegistryService | ✅ | ✅ | ✅ |
| 3 | Units | product-form — purchase option | CustomSelectComponent | UnitRegistryService | ✅ | ✅ | ✅ |
| 4 | Units | recipe-workflow step unit | CustomSelectComponent | UnitRegistryService | ✅ | ✅ | ✅ |
| 5 | Units | recipe-ingredients-table | CustomSelectComponent | UnitRegistryService | ✅ | ✅ | ⚠️ product-specific |
| 6 | Units | recipe-builder yield unit | CustomSelectComponent | UnitRegistryService | ✅ | ✅ | ✅ |
| 7 | Product categories | quick-add-product-modal | CustomSelectComponent | MetadataRegistryService | ✅ | ✅ | ✅ |
| 8 | Product categories | product-form | ChipSearchDropdownComponent | MetadataRegistryService | ✅ | ✅ | ✅ |
| 9 | Suppliers | product-form | native select | AddSupplierFlowService → SupplierDataService | ✅ | ✅ | ✅ |
| 10 | Allergens | product-form | ChipSearchDropdownComponent | MetadataRegistryService | ✅ | ✅ | ✅ |
| 11 | Recipe labels | recipe-builder header | CustomMultiSelectComponent | MetadataRegistryService (KITCHEN_LABELS) | ✅ | ✅ | ✅ |
| 12 | Preparation categories | recipe-workflow | CustomSelectComponent | PreparationRegistryService (KITCHEN_PREPARATIONS) | ✅ | ✅ | ✅ |
| 13 | Equipment categories | equipment-list filter | CustomSelectComponent | **LOCAL SIGNAL ONLY** | ✅ | ❌ | ❌ |
| 14 | Menu event types | menu-intelligence | custom inline dropdown | **form patch only** | ✅ | ❌ | ❌ |
| 15 | Menu section categories (typed) | menu-intelligence | custom inline dropdown | MenuSectionCategoriesService | ✅ | ✅ | ✅ |
| 16 | Menu section categories (modal) | menu-intelligence | AddItemModal | MenuSectionCategoriesService | ✅ | ✅ | ✅ |
| 17 | New products/ingredients | recipe-builder ingredient-search | quick-add-product-modal | KitchenStateService → PRODUCT_LIST | ✅ | ✅ | ✅ |
| 18 | Equipment | recipe-builder logistics | AddEquipmentModal | EquipmentDataService → KITCHEN_EQUIPMENT | ✅ | ✅ | ✅ |

---

## Round-Trip Verdicts

### #1 — Units / quick-add-product-modal
**Test value:** `AUDIT-unit4-1744` (rate: 75g)
**Verdict:** ✅
**Notes:** DB confirmed `KITCHEN_UNITS/_id:LcOuv` has key. custom-select dropdown option click is flaky via Playwright — requires `ng.getComponent().select()` + JS `.click()`.

### #2 — Units / product-form (base unit)
**Test value:** `AUDIT-unit-1744` (rate: 500g)
**Verdict:** ✅
**Notes:** Confirmed via DB + UI re-appears after reload.

### #3 — Units / product-form (purchase option)
**Test value:** `AUDIT-unit3-1744` (rate: 100g)
**Verdict:** ✅
**Notes:** PUT KITCHEN_UNITS confirmed. Same custom-select flow as #1.

### #4 — Units / recipe-workflow
**Test value:** `audit-unit-1744`, `audit-unit2-1744`
**Verdict:** ✅
**Notes:** Both appeared in dish-mode flat grid unit picker.

### #5 — Units / recipe-ingredients-table
**Test value:** Global unit visible in picker only if product has unit in its options.
**Verdict:** ⚠️ PARTIAL
**Root cause:** `getUnitOptions()` at `recipe-ingredients-table.component.ts:481` is product-specific — filters to units the product supports. Global KITCHEN_UNITS persist but only appear if the product explicitly includes that unit in its options.

### #6 — Units / recipe-builder yield unit
**Test value:** `audit-unit-1744`
**Verdict:** ✅
**Notes:** Appears in yield unit picker after reload.

### #7 — Product categories / quick-add-product-modal
**Test value:** `audit-cat-1744`
**Verdict:** ✅
**Notes:** PUT KITCHEN_CATEGORIES confirmed.

### #8 — Product categories / product-form
**Test value:** `audit_cat2_1744`
**Verdict:** ✅
**Notes:** Requires `ng.getComponent(translation-key-modal).modalService.save(key, label)`. English key must use underscores only (hyphens fail validation).

### #9 — Suppliers / product-form
**Test value:** `AUDIT-supplier-1744`
**Verdict:** ✅
**Notes:** POST KITCHEN_SUPPLIERS → 201. Two-step flow: add-item-modal → translation-key-modal.

### #10 — Allergens / product-form
**Test value:** `audit_allergen_1744`
**Verdict:** ✅
**Notes:** PUT KITCHEN_ALLERGENS confirmed. UX issue: typing + Enter may miss modal if resultSubject has stale state. Must call `comp.onAddNewAllergen()` directly or re-trigger properly.

### #11 — Recipe labels / recipe-header
**Test value:** `audit_label_1744`
**Verdict:** ✅
**Notes:** PUT KITCHEN_LABELS confirmed. Requires `ng.getComponent(app-label-creation-modal).englishKey_.set()` before save.

### #12 — Preparation categories / recipe-workflow
**Test value:** `audit_prep_cat_1744`
**Verdict:** ✅
**Notes:** PUT KITCHEN_PREPARATIONS confirmed. Called via `comp.translationKeyModal_.open()` + `comp.prepRegistry_.registerCategory()`.

### #13 — Equipment categories / equipment-list filter
**Test value:** N/A (not persisted)
**Verdict:** ❌
**Root cause:** `equipment-list.component.ts:255–256` — `openAddNewCategory()` only updates `customCategories_()` local signal. No storage service call. New category lost on page reload.
**Fix brief:** Add `equipmentCategoryRegistry.registerCategory(keyToUse)` call after line 256, mirroring the pattern used by `product-form.component.ts:357`.

### #14 — Menu event types / menu-intelligence
**Test value:** N/A (not persisted)
**Verdict:** ❌
**Root cause:** `menu-intelligence.page.ts:520` — `addNewEventType()` only calls `this.form_.patchValue({ event_type_: result.trim() })`. No registration or storage call. New event types are lost on reload.
**Fix brief:** Create a `MenuEventTypeService` (or extend `MenuSectionCategoriesService`) with `addEventType(name)` → persist to `MENU_TYPES` collection. Call it before `patchValue`.

### #15 — Menu section categories (typed) / menu-intelligence
**Test value:** (code-verified)
**Verdict:** ✅
**Notes:** `menu-intelligence.page.ts:984` calls `menuSectionCategories.addCategory()` → `persist()` → MENU_SECTION_CATEGORIES.

### #16 — Menu section categories (modal) / menu-intelligence
**Test value:** (code-verified)
**Verdict:** ✅
**Notes:** `menu-intelligence.page.ts:997` same service call.

### #17 — New products / ingredient-search
**Test value:** `AUDIT-quick-test1` (saved via POST PRODUCT_LIST → 201)
**Verdict:** ✅
**Notes:** `kitchenStateService.saveProduct()` confirmed in network log.

### #18 — Equipment / recipe-builder logistics
**Test value:** (code-verified)
**Verdict:** ✅
**Notes:** `equipmentData_.addEquipment()` → KITCHEN_EQUIPMENT.

---

## Root Cause Notes

### #5 — Units / recipe-ingredients-table (PARTIAL)
**Root cause:** `getUnitOptions()` at `recipe-ingredients-table.component.ts:481` queries product-specific unit options, not the global KITCHEN_UNITS list. When a new unit is added globally, it won't appear in an ingredient row unless the product's own unit list is updated to include it.
**Severity:** Low — global units DO persist. Only affects the ingredient-row picker UX.

### #13 — Equipment categories (FAIL)
**Root cause:** `equipment-list.component.ts:255–256` writes only to `customCategories_()` local signal. No call to any registry service.
**Severity:** Medium — users adding equipment categories lose them on every page refresh.

### #14 — Menu event types (FAIL)
**Root cause:** `menu-intelligence.page.ts:520` patches only form state. No MENU_TYPES persistence.
**Severity:** Medium — event type field must be re-typed each session.

---

## Recommended Fix Briefs (ranked)

### Fix A — Equipment categories persistence (❌ #13)
**File:** `equipment-list.component.ts`
**Location:** After line 256 (`this.customCategories_.update(...)`)
**Change:** Call an equipment category registry or reuse `MetadataRegistryService.registerCategory()` to persist `keyToUse`. Alternatively extend `EquipmentDataService` with `addCategory()`.
**Effort:** S (1–2 hours)

### Fix B — Menu event types persistence (❌ #14)
**File:** `menu-intelligence.page.ts`
**Location:** `addNewEventType()` at line 519
**Change:** Before `patchValue`, call `menuTypesService.addType(result.trim())` that persists to `MENU_TYPES`. Requires creating or extending a types service.
**Effort:** S–M (2–4 hours)

### Fix C — Recipe ingredients unit picker UX (⚠️ #5)
**File:** `recipe-ingredients-table.component.ts`
**Location:** `getUnitOptions()` at line 481
**Change:** After a new unit is registered globally, trigger the ingredient product's unit options to refresh — or add newly-created units to the product's unit list automatically.
**Effort:** M (4–8 hours, needs design decision)

---

## AUDIT-* Test Data for Cleanup

| Value | Collection (DB) | _id |
|-------|----------------|-----|
| `audit-unit-1744` | KITCHEN_UNITS | LcOuv (key in units map) |
| `audit-unit2-1744` | KITCHEN_UNITS | LcOuv |
| `audit-unit3-1744` | KITCHEN_UNITS | LcOuv |
| `audit-unit4-1744` | KITCHEN_UNITS | LcOuv |
| `audit-cat-1744` | KITCHEN_CATEGORIES | D2DaM |
| `audit_cat2_1744` | KITCHEN_CATEGORIES | D2DaM |
| `audit_allergen_1744` | KITCHEN_ALLERGENS | 3N1iD |
| `AUDIT-supplier-1744` | KITCHEN_SUPPLIERS | iZW4e |
| `audit_label_1744` | KITCHEN_LABELS | YpCiO |
| `audit_prep_cat_1744` | KITCHEN_PREPARATIONS | tQmKO |
| `AUDIT-quick-test1` | PRODUCT_LIST | (new product) |
