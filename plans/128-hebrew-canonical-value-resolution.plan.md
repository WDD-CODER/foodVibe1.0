---
name: Hebrew canonical value resolution
overview: Prevent duplicate canonical values (e.g. "unit" vs "יחידה") by resolving Hebrew user input to existing dictionary keys before persisting, and add agent guidance so new add-flows respect the same rule.
---

# Hebrew input → canonical key resolution (avoid duplicates)

## Problem

User types **יחידה** in the "add new unit" flow. The app stores it as a new registry key. The app already has **unit** (display "יחידה" in [public/assets/data/dictionary.json](public/assets/data/dictionary.json)). Result: two "units" in data, broken matching in [recipe-cost.service.ts](src/app/core/services/recipe-cost.service.ts) (`o.unit_symbol_ === ing.unit_`), scaling, and product options.

Same pattern can occur for **categories** and **allergens** when the user enters the Hebrew label instead of (or in addition to) the existing English key.

## Approach: normalize on input and build dictionary when needed

- **Single methodology**: (1) Before persisting any user-entered value that is a **canonical identifier** (unit, category, allergen, etc.), resolve it via a **Hebrew → canonical key** map from `dictionary.json`. If the entered value equals a known Hebrew translation of an existing key, use that key. (2) **If there is no matching key**, ask the user for the **English** value (canonical key), then add that key + the Hebrew label to the dictionary so we build the dictionary as we go. (3) **Units only — extra layer**: When adding a measurement unit (e.g. another purchase option on a product), after resolution (or after adding a new unit with English key), we must also check **whether this unit already exists on this specific product**. So: first resolve/add to dictionary; then when attaching to a product, reject if that product already has that unit symbol.
- **No change to data model**: We continue storing one string per unit/category/allergen (the canonical key). Display stays via `translatePipe` + dictionary.

## Touchpoints (where to implement)

| Area                          | Entry point                                                                                                                                                          | Current behavior                                            | Change                                                                                                                                                                                                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Units**                     | [UnitRegistryService.registerUnit](src/app/core/services/unit-registry.service.ts) (name from [unit-creator](src/app/shared/unit-creator/unit-creator.component.ts)) | `sanitizedName = name.trim().toLowerCase()` → stored as key | Resolve `name` via Hebrew → key. If match, use that key; if no match, prompt for English key and add key + Hebrew to dictionary. **Then** (when adding to a product) check if this unit **already exists on this product** — reject/use existing to avoid duplicate purchase option. |
| **Categories**                | [MetadataRegistryService.registerCategory](src/app/core/services/metadata-registry.service.ts)                                                                       | Callers pass value from AddItemModal; stored as-is          | Resolve Hebrew → key; if no match, prompt for English key and add key + Hebrew to dictionary; then register.                                                                                                                                                                         |
| **Allergens**                 | [MetadataRegistryService.registerAllergen](src/app/core/services/metadata-registry.service.ts)                                                                       | Same as categories                                          | Same: resolve; if no match, prompt for English key, add to dictionary, then register.                                                                                                                                                                                                |
| **Add-item modal**            | [AddItemModalService.save](src/app/core/services/add-item-modal.service.ts)                                                                                          | Returns trimmed string                                      | Modal stays generic; **callers** pass returned value through a resolver when the modal was used for category/allergen/unit.                                                                                                                                                          |
| **Section categories**        | [MenuSectionCategoriesService.addCategory](src/app/core/services/menu-section-categories.service.ts)                                                               | Stores trimmed name                                         | Resolve via `section_categories` reverse map if present.                                                                                                                                                                                                                            |
| **Equipment custom category** | [AddEquipmentModalComponent.openAddNewCategory](src/app/shared/add-equipment-modal/add-equipment-modal.component.ts)                                               | Stores result as key                                        | Resolve via a small map or same pattern if we add section_categories / generic.                                                                                                                                                                                                      |
| **Preparation categories**    | [PreparationRegistryService.registerCategory](src/app/core/services/preparation-registry.service.ts)                                                               | Already takes `englishKey` + `hebrewLabel`                 | When input is Hebrew-only: resolve to existing key if possible; if no match, **open a modal** asking for the **English key** for that Hebrew value, then register with `englishKey` + `hebrewLabel` and add to dictionary.                                                           |

Downstream **matching** (recipe-cost, scaling, product-form options) already compares by string; once we store only canonical keys, matching stays correct. Optional: in [recipe-cost.service.ts](src/app/core/services/recipe-cost.service.ts) line 267, keep exact match; optionally add a fallback that normalizes `ing.unit_` via the same resolver for legacy data that still has Hebrew in `unit_symbol_`.

## Implementation steps

1. **Canonical resolver (extend TranslationService)** — Extend [TranslationService](src/app/core/services/translation.service.ts). Add reverse maps (Hebrew → key) from dictionary sections `units`, `categories`, `allergens`, `section_categories`, `preparation_categories`. Expose `resolveUnit(input)`, `resolveCategory(input)`, `resolveAllergen(input)`, etc. When user supplies new English key for a Hebrew value, add key + Hebrew via `updateDictionary` and refresh reverse maps.
2. **Unit flow** — In [UnitRegistryService.registerUnit](src/app/core/services/unit-registry.service.ts): resolve name via TranslationService; if no match, obtain English key (unit-creator or modal) and update dictionary; then use key to store. Product-level check when adding purchase option: if product already has that unit_symbol_, do not add duplicate.
3. **Category / allergen flows** — In [MetadataRegistryService](src/app/core/services/metadata-registry.service.ts): resolve at entry in registerCategory and registerAllergen; if no match, prompt for English key and update dictionary.
4. **Section categories, equipment, preparation** — Resolve in addCategory/openAddNewCategory; when no match, open modal for English key then register + dictionary.
5. **Agent guidance** — In [.assistant/copilot-instructions.md](.assistant/copilot-instructions.md): add Section 7.1 (Hebrew canonical values) and in Section 0 add trigger bullet pointing to 7.1 when adding/editing canonical-value flows. No new Cursor rule file.

## Optional enhancements

- **Legacy data**: Runtime fallback when matching `unit_symbol_` to `ing.unit_`: if no exact match, try `resolveUnit(ing.unit_)` and compare to `unit_symbol_`.

## Files to add/change (summary)

- **Change**: [translation.service.ts](src/app/core/services/translation.service.ts) — reverse maps and resolve methods; support adding key+Hebrew when user supplies English key.
- **Change**: [unit-registry.service.ts](src/app/core/services/unit-registry.service.ts) — resolve unit before register; no match → English key + dictionary; product-level duplicate check.
- **Change**: Product-form and recipe-ingredients-table — when adding purchase unit, check this product already has that unit symbol.
- **Change**: [metadata-registry.service.ts](src/app/core/services/metadata-registry.service.ts) — resolve in registerCategory and registerAllergen; no match → prompt for English key.
- **Change**: [menu-section-categories.service.ts](src/app/core/services/menu-section-categories.service.ts), [add-equipment-modal](src/app/shared/add-equipment-modal/add-equipment-modal.component.ts), [preparation-registry.service.ts](src/app/core/services/preparation-registry.service.ts) — resolve from Hebrew; no match → modal for English key.
- **Change**: [.assistant/copilot-instructions.md](.assistant/copilot-instructions.md) — Section 7.1 + Section 0 trigger. No new Cursor rule.
