---
name: Remove logistics templates library
overview: Remove the global logistics templates library (תבניות לוגיסטיקה) and its management UI everywhere, while keeping per-recipe logistics (add equipment by search + quantity, saved on each recipe/dish) unchanged.
todos: []
isProject: false
---

# Remove Logistics Templates Library (תבניות לוגיסטיקה)

## What stays (do not touch)

- **Per-recipe logistics:** Each recipe/dish keeps `logistics_.baseline_` (array of equipment + quantity + phase + critical + notes). This is the data you "save" on the recipe.
- **Recipe Builder logistics section:** Search by equipment name, set quantity, click Add, chips for baseline rows, remove row — all unchanged. Only the **source** of dropdown options changes: from "library + equipment" to **equipment only**.
- **Models:** `BaselineEntry`, `DishLogistics`, `EquipmentPhase` in [logistics.model.ts](src/app/core/models/logistics.model.ts) stay; they describe recipe-level logistics. Only the **library-specific** type and storage are removed.

## What gets removed

- The **global library** of reusable templates: storage key `LOGISTICS_BASELINE_ITEMS`, the service that manages it, and the Metadata Manager card that edits it.
- In Recipe Builder: any use of that library (dropdown showing library rows, library-related state and methods). Dropdown will show **only equipment** matches.

---

## 1. Delete the logistics-baseline-manager component and service

- **Delete** the whole component folder (TS, HTML, SCSS) and [logistics-baseline-data.service.ts](src/app/core/services/logistics-baseline-data.service.ts).

## 2. Metadata Manager: remove the library card

- Remove `LogisticsBaselineManagerComponent` from imports and template; remove `<app-logistics-baseline-manager />`.

## 3. Recipe Builder: equipment-only logistics dropdown

- Remove `LogisticsBaselineDataService` and `LogisticsBaselineItem`; remove `logisticsSelectedLibraryItem_`; `logisticsSearchOptions_` returns only equipment; `selectLogisticsOption` and `addSelectedToolToBaseline` equipment-only with defaults; remove `addFromLibrary`. Template: single display for equipment options.

## 4. Demo loader: stop loading the library

- Remove logistics baseline fetch, replaceAll, and reloadFromStorage.

## 5. Storage and backup

- Remove `LOGISTICS_BASELINE_ITEMS` from `BACKUP_ENTITY_TYPES`.

## 6. Model and dictionary

- Remove `LogisticsBaselineItem` from logistics.model.ts. Remove metadata_logistics_* / metadata_baseline_* / metadata_phase_* keys from dictionary.

## 7. Optional

- Delete demo-logistics-baseline.json; remove dead .logistics-library-* SCSS blocks.
