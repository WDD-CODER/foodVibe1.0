# core/services — Breadcrumbs

## Purpose

Singleton services for data, state, modals, HTTP concerns, logging, export, and cross-cutting behavior. Pages and shared components use `inject()`. Domain persistence goes through `StorageService` (async-storage); data services use shared storage keys and signals where applicable.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| `async-storage.service.ts` | Key-value persistence (IndexedDB/localStorage) | StorageService, BACKUP_ENTITY_TYPES, STORAGE_ERROR_MESSAGE |
| `product-data.service.ts` | Product CRUD (on BaseEntityDataService; loads on start) | ProductDataService |
| `dish-data.service.ts` | Dish CRUD (on BaseEntityDataService) | DishDataService |
| `recipe-data.service.ts` | Recipe CRUD (on BaseEntityDataService) | RecipeDataService |
| `supplier-data.service.ts` | Supplier CRUD | SupplierDataService |
| `equipment-data.service.ts` | Equipment CRUD | EquipmentDataService, ERR_DUPLICATE_EQUIPMENT_NAME |
| `venue-data.service.ts` | Venue CRUD | VenueDataService |
| `kitchen-state.service.ts` | Central state for kitchen flows; save/delete methods return Promises | KitchenStateService |
| `metadata-registry.service.ts` | Categories, allergens, units registry | MetadataRegistryService |
| `taxonomy-store.service.ts` | Single store for all taxonomy terms (categories, units, preparations…); the registry services are thin facades over it and load through `loadSafely` / `reloadSafely` | TaxonomyStore, TermInUseError, TermReadOnlyError, TaxonomyLoadLog |
| `unit-registry.service.ts` | Units (mass, volume, dish); `awaitUnitCreated()` resolves the saved unit or null | UnitRegistryService, SYSTEM_UNITS |
| `preparation-registry.service.ts` | Preparation entries | PreparationRegistryService |
| `menu-section-categories.service.ts` | Menu section category registry | MenuSectionCategoriesService |
| `conversion.service.ts` | Unit conversion | ConversionService |
| `recipe-cost.service.ts` | Recipe costing, bruto/volume | RecipeCostService |
| `scaling.service.ts` | Scale by yield | ScalingService, ScaledIngredientRow, ScaledPrepRow |
| `cook-view-state.service.ts` | Cook-view workflow state | CookViewStateService |
| `menu-event-data.service.ts` | Menu events CRUD (on BaseEntityDataService) | MenuEventDataService |
| `menu-intelligence.service.ts` | Menu intelligence logic | MenuIntelligenceService |
| `trash.service.ts` | Trash/restore | TrashService |
| `business.service.ts` | The signed-in user's business (`business_`) | BusinessService |
| `permission.service.ts` | Client mirror of the server permission checker; UI hides/locks by the same rules | PermissionService, PermissionAction |
| `activity-log.service.ts` | Activity log | ActivityLogService, ActivityEntry, ACTIVITY_STORAGE_KEY |
| `version-history.service.ts` | Version history | VersionHistoryService, VersionEntry |
| `translation.service.ts` | Dictionary / Hebrew resolution | TranslationService |
| `key-resolution.service.ts` | Canonical key resolution helpers | KeyResolutionService |
| `keyboard-inset.service.ts` | Detects the on-screen keyboard (visualViewport) and exposes the inset as `--kb-inset` / `kb-open` | KeyboardInsetService, KEYBOARD_OPEN_THRESHOLD_PX |
| `user-msg.service.ts` | Global user messages | UserMsgService |
| `logging.service.ts` | App-wide logging | LoggingService, LogEvent |
| `add-item-modal.service.ts` | Add-item modal orchestration | AddItemModalService, AddItemConfig |
| `add-supplier-flow.service.ts` | Add-supplier from product form | AddSupplierFlowService |
| `add-equipment-modal.service.ts` | Add-equipment modal | AddEquipmentModalService |
| `auth-modal.service.ts` | Sign-in / auth modal | AuthModalService |
| `quick-add-product-modal.service.ts` | Quick-add product modal | QuickAddProductModalService |
| `confirm-modal.service.ts` | Confirm dialog | ConfirmModalService, ConfirmModalOptions |
| `global-specific-modal.service.ts` | Global vs specific choice | GlobalSpecificModalService |
| `restore-choice-modal.service.ts` | Restore-from-trash choice | RestoreChoiceModalService |
| `translation-key-modal.service.ts` | English key + Hebrew modal | TranslationKeyModalService |
| `user.service.ts` | User/session | UserService, LoginCredentials |
| `util.service.ts` | Shared utilities | UtilService |
| `hero-fab.service.ts` | Floating action button state per route | HeroFabService |
| `export.service.ts` | Data export orchestration | ExportService |
| `global-error.handler.ts` | Angular ErrorHandler implementation | GlobalErrorHandler |
| `base-entity-data.service.ts` | Shared load/reload base for every entity data service | BaseEntityDataService\<T\>, EntityLoadOptions |
| `ai-recipe-draft.service.ts` | AI-drafted recipe staging | AiRecipeDraftService |
| `app-update.service.ts` | App update/reload prompt | AppUpdateService |
| `cloudinary.service.ts` | Image upload to Cloudinary | CloudinaryService |
| `equipment-category-registry.service.ts` | Equipment category registry | EquipmentCategoryRegistryService |
| `excel-workbook.util.ts` | Excel export style constants | XLSX_MIME, EXCEL_TEAL, EXCEL_HEADER_GRAY, EXCEL_SUBTITLE_GRAY, EXCEL_BORDER_THIN, EXCEL_BORDER_MEDIUM |
| `gemini.service.ts` | Gemini AI calls (proxied via server/routes/ai.js) | GeminiService |
| `product-name-matcher.service.ts` | Links a typed or pasted product name to an existing product: exact + plural/spelling variants in the browser, then one AI call for the rest (plan 463) | ProductNameMatcherService |
| `gemini-shots.service.ts` | Gemini image/shot capture flow | GeminiShotsService |
| `http-storage.adapter.ts` | HTTP-backed storage adapter | HttpStorageAdapter |
| `master-push.service.ts` | Push local entity to master/global | MasterPushService |
| `menu-event-type.service.ts` | Menu event type registry | MenuEventTypeService |
| `event-pipeline.service.ts` | Client of `API.events`: stage moves and notes; writes the returned event into the store (plan 443) | EventPipelineService |
| `event-type-snapshot.service.ts` | Freezes an event's event-type and serving-type coefficients when picked (plan 441) | EventTypeSnapshotService |
| `menu-export.service.ts` | Menu export orchestration | MenuExportService |
| `quick-edit-product-modal.service.ts` | Quick-edit product modal orchestration | QuickEditProductModalService |
| `recipe-export.service.ts` | Recipe export orchestration | RecipeExportService |
| `server-heartbeat.service.ts` | Server availability heartbeat | ServerHeartbeatService |
| `station-registry.service.ts` | Kitchen stations (taxonomy kind `station`) for the recipe header and metadata manager | StationRegistryService |
| `user-admin.service.ts` | User admin management | UserAdminService |
| `loading.service.ts` | Global loading indicator state | LoadingService |

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
- Jasmine specs colocated as `*.spec.ts`.


---
*Last updated: 2026-10-22*
*Updated by: breadcrumbs*
