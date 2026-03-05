# Entity Storage Audit: Designated localStorage and Reusable Data

## Goal

Ensure every **reusable or shared entity** has a **designated place in localStorage** (single source of truth), so the app can use the same item in multiple places and backup/restore/export behave like a server. This audit was triggered by the logistics-baseline case: baseline items were only stored inside each recipe until we added `LOGISTICS_BASELINE_ITEMS`.

---

## 1. Current Designated Storage (Already Server-Like)

These entity types are stored in their own localStorage keys and are the single source of truth. References elsewhere use IDs.

| Storage key | Service / usage | Referenced by |
|-------------|------------------|---------------|
| `PRODUCT_LIST` | ProductDataService | Recipe ingredients (referenceId), inventory |
| `RECIPE_LIST` | RecipeDataService | Cook view, recipe book, ingredients (as sub-recipe) |
| `DISH_LIST` | DishDataService | Recipe book, menu events (dish selections) |
| `KITCHEN_SUPPLIERS` | SupplierDataService | Product supplierIds_ |
| `EQUIPMENT_LIST` | EquipmentDataService | Recipe/dish logistics_.baseline_ (equipment_id_), inventory/equipment page |
| `LOGISTICS_BASELINE_ITEMS` | LogisticsBaselineDataService | Recipe builder (library), recipes copy from it |
| `VENUE_PROFILES` | VenueDataService | Menu event logistics_.venue_profile_id_, venues page |
| `MENU_EVENT_LIST` | MenuEventDataService | Menu intelligence, menu library |
| `VERSION_HISTORY` | VersionHistoryService | Version history panel (recipe/dish/product snapshots) |
| `KITCHEN_UNITS` | UnitRegistryService | Products, recipes, conversions (single doc) |
| `KITCHEN_PREPARATIONS` | PreparationRegistryService | Recipe workflow (prep list), preparation search (single doc) |
| `KITCHEN_CATEGORIES` | MetadataRegistryService | Product categories_ (keys) (single doc) |
| `KITCHEN_ALLERGENS` | MetadataRegistryService | Product allergens_ (keys) (single doc) |
| `KITCHEN_LABELS` | MetadataRegistryService | Recipe labels_ (keys) (single doc) |
| `MENU_TYPES` | MetadataRegistryService | Menu event serving_type_, dish fields (single doc) |
| `signed-users-db` | UserService + StorageService | Auth, header |

All of the above (except activity log below) are included in BACKUP_ENTITY_TYPES, so they are mirrored to backup_<key> and included in backup export/restore.

---

## 2. Gaps: Data Not in Designated Storage or Not Persisted

### 2.1 Menu section categories (high impact for reuse)

**Where:** menu-intelligence.page.ts

**Current behavior:** Section names (e.g. "Appetizers", "Main Course") come from a hardcoded DEFAULT_SECTION_CATEGORIES constant. When the user adds a new section name (e.g. via section dropdown), it is pushed into a component signal sectionCategories_ only. That signal is not persisted to localStorage.

**Problem:** User-added section names are lost on refresh. The same section names cannot be reused consistently across menu events from a single source of truth.

**Recommendation:** Add designated storage MENU_SECTION_CATEGORIES (single document with items: string[]). Load on init; seed with defaults if empty. Save when user adds a new section name. Add to BACKUP_ENTITY_TYPES.

### 2.2 Activity log (backup/consistency)

**Where:** activity-log.service.ts

**Current behavior:** Activity entries stored in localStorage under 'activity_log' via direct getItem/setItem. Key is not in BACKUP_ENTITY_TYPES.

**Problem:** Export/restore do not include the activity log.

**Recommendation (Option A):** Add constant ACTIVITY_LOG; include in BACKUP_ENTITY_TYPES; have ActivityLogService use that constant so backup/restore/import include it.

### 2.3 Demo loader and logistics (optional)

Demo load does not replace LOGISTICS_BASELINE_ITEMS or MENU_SECTION_CATEGORIES. Optional: add demo payload and reload, or document as intentional.

---

## 3. Embedded Data That Is Correct As-Is (No New Key)

- Recipe/dish ingredients: referenceId; products/recipes in designated lists.
- Recipe/dish logistics baseline: copy per recipe; library is LOGISTICS_BASELINE_ITEMS.
- Recipe labels: keys; definitions in KITCHEN_LABELS.
- Product categories_/allergens_: keys; definitions in KITCHEN_CATEGORIES, KITCHEN_ALLERGENS.
- Menu event sections: per-event; section names from designated list (2.1).
- Version history: VERSION_HISTORY.

---

## 4. Summary: What to Do

| Item | Action | Priority |
|------|--------|----------|
| Logistics baseline items | Already done (LOGISTICS_BASELINE_ITEMS) | — |
| Menu section categories | Add MENU_SECTION_CATEGORIES; persist and load in menu-intelligence; add to BACKUP | High |
| Activity log | Add to BACKUP_ENTITY_TYPES; use constant in ActivityLogService | Medium |
