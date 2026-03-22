# core/services — Breadcrumbs

## Purpose

Singleton services for data, state, modals, HTTP concerns, logging, export, backup, and cross-cutting behavior. Pages and shared components use `inject()`. Domain persistence goes through `StorageService` (async-storage); data services use shared storage keys and signals where applicable.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| async-storage.service.ts | Key-value persistence (IndexedDB/localStorage) | StorageService, BACKUP_ENTITY_TYPES, STORAGE_ERROR_MESSAGE |
| product-data.service.ts | Product CRUD | ProductDataService |
| dish-data.service.ts | Dish CRUD | DishDataService |
| recipe-data.service.ts | Recipe CRUD, routing helpers | RecipeDataService |
| supplier-data.service.ts | Supplier CRUD | SupplierDataService |
| equipment-data.service.ts | Equipment CRUD | EquipmentDataService, ERR_DUPLICATE_EQUIPMENT_NAME |
| venue-data.service.ts | Venue CRUD | VenueDataService |
| kitchen-state.service.ts | Central navigation/state for kitchen flows | KitchenStateService |
| metadata-registry.service.ts | Categories, allergens, units registry | MetadataRegistryService |
| unit-registry.service.ts | Units (mass, volume, dish) | UnitRegistryService, SYSTEM_UNITS |
| preparation-registry.service.ts | Preparation entries | PreparationRegistryService |
| menu-section-categories.service.ts | Menu section category registry | MenuSectionCategoriesService |
| conversion.service.ts | Unit conversion | ConversionService |
| recipe-cost.service.ts | Recipe costing, bruto/volume | RecipeCostService |
| scaling.service.ts | Scale by yield | ScalingService, ScaledIngredientRow, ScaledPrepRow |
| cook-view-state.service.ts | Cook-view workflow state | CookViewStateService |
| menu-event-data.service.ts | Menu events CRUD | MenuEventDataService |
| menu-intelligence.service.ts | Menu intelligence logic | MenuIntelligenceService |
| trash.service.ts | Trash/restore | TrashService |
| activity-log.service.ts | Activity log | ActivityLogService, ActivityEntry, ACTIVITY_STORAGE_KEY |
| version-history.service.ts | Version history | VersionHistoryService, VersionEntry |
| translation.service.ts | Dictionary / Hebrew resolution | TranslationService |
| key-resolution.service.ts | Canonical key resolution helpers | KeyResolutionService |
| user-msg.service.ts | Global user messages | UserMsgService |
| logging.service.ts | App-wide logging | LoggingService, LogEvent |
| add-item-modal.service.ts | Add-item modal orchestration | AddItemModalService, AddItemConfig |
| add-supplier-flow.service.ts | Add-supplier from product form | AddSupplierFlowService |
| add-equipment-modal.service.ts | Add-equipment modal | AddEquipmentModalService |
| auth-modal.service.ts | Sign-in / auth modal | AuthModalService |
| supplier-modal.service.ts | Supplier picker modal | SupplierModalService |
| quick-add-product-modal.service.ts | Quick-add product modal | QuickAddProductModalService |
| confirm-modal.service.ts | Confirm dialog | ConfirmModalService, ConfirmModalOptions |
| global-specific-modal.service.ts | Global vs specific choice | GlobalSpecificModalService |
| restore-choice-modal.service.ts | Restore-from-trash choice | RestoreChoiceModalService |
| translation-key-modal.service.ts | English key + Hebrew modal | TranslationKeyModalService |
| demo-loader.service.ts | Load demo JSON | DemoLoaderService |
| user.service.ts | User/session | UserService, LoginCredentials |
| util.service.ts | Shared utilities | UtilService |
| hero-fab.service.ts | Floating action button state per route | HeroFabService |
| export.service.ts | Data export orchestration | ExportService |
| backup.service.ts | Backup/restore flows | BackupService |
| global-error.handler.ts | Angular ErrorHandler implementation | GlobalErrorHandler |

## Architecture Context

Services live under `core/` and are injected into pages and shared UI. Data services delegate to `StorageService`. Modal flows pair with components under `shared/` or `core/components`.

## Patterns & Conventions

- `@Injectable({ providedIn: 'root' })` unless scoped otherwise.
- Data services: typical `getAll`, `getById`, `add`, `update`, `delete`; storage keys such as `KITCHEN_PRODUCTS`.
- Expose mutable state via signals with `.asReadonly()` where used.

## Dependencies

- **Imports from**: `../models/*`, `async-storage.service`, `@angular/core`, `@angular/common/http` where needed.
- **Used by**: All pages, shared components, resolvers, interceptors.

## Development Notes

- New entity CRUD: model in `core/models/`, service here, resolver in `core/resolvers/`, routes in `app.routes.ts`.
- Demo data: `DemoLoaderService` + `public/assets/data/demo-*.json`.
- Jasmine specs colocated as `*.spec.ts`.

## Recent Changes

- 2026-03-22: Synced file list with repo (auth, export, backup, logging, key-resolution, menu-section-categories, modals, global error handler).
- 2026-03-22: Removed unused commented `ingredient.service.ts` stub (no imports).

---
*Last updated: 2026-03-22*
*Updated by: breadcrumb-navigator*
