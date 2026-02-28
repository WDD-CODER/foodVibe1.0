# core/services — Breadcrumbs

## Purpose

Singleton services for data, state, modals, and cross-cutting concerns. Used by pages and shared components via `inject()`. Persistence goes through `StorageService` (async-storage); domain data services (product, recipe, equipment, venue, etc.) use it.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| async-storage.service.ts | Key-value persistence (IndexedDB/localStorage); used by all data services | StorageService |
| product-data.service.ts | Product CRUD, KITCHEN_PRODUCTS | ProductDataService |
| dish-data.service.ts | Dish recipes CRUD | DishDataService |
| recipe-data.service.ts | Recipe CRUD, recipe_type_ routing | RecipeDataService |
| supplier-data.service.ts | Supplier CRUD, KITCHEN_SUPPLIERS | SupplierDataService |
| equipment-data.service.ts | Equipment CRUD, demo + storage | EquipmentDataService |
| venue-data.service.ts | Venue CRUD, demo + storage | VenueDataService |
| kitchen-state.service.ts | Central app state; recipe/dish/product routing; deleteRecipe | KitchenStateService |
| metadata-registry.service.ts | Categories, allergens, units registry; NEW_CATEGORY/NEW_ALLERGEN | MetadataRegistryService |
| unit-registry.service.ts | Units (mass, volume, dish); primary/secondary filtering | UnitRegistryService |
| preparation-registry.service.ts | Preparation entries; getPreparationByName, updatePreparationCategory | PreparationRegistryService |
| conversion.service.ts | Unit conversion (e.g. volume→grams) | ConversionService |
| recipe-cost.service.ts | Recipe cost, totals, bruto/volume, unconvertible lists | RecipeCostService |
| scaling.service.ts | Scale recipe by yield; ScaledIngredientRow, ScaledPrepRow | ScalingService |
| cook-view-state.service.ts | Cook-view workflow state | CookViewStateService |
| menu-event-data.service.ts | Menu events CRUD | MenuEventDataService |
| menu-intelligence.service.ts | Menu intelligence logic | MenuIntelligenceService |
| trash.service.ts | Trash/restore for recipes, products | TrashService |
| activity-log.service.ts | Activity log entries; ActivityEntry, ActivityChange | ActivityLogService |
| version-history.service.ts | Version history; VersionEntry | VersionHistoryService |
| translation.service.ts | Dictionary-based translation (Hebrew/English) | TranslationService |
| user-msg.service.ts | Global user messages (toast-style) | UserMsgService |
| add-item-modal.service.ts | Add-item modal orchestration; AddItemConfig | AddItemModalService |
| add-supplier-flow.service.ts | Add-supplier flow from product form | AddSupplierFlowService |
| confirm-modal.service.ts | Confirm dialog; ConfirmModalOptions | ConfirmModalService |
| global-specific-modal.service.ts | Global vs specific modal (e.g. preparation category); GlobalSpecificModalConfig | GlobalSpecificModalService |
| restore-choice-modal.service.ts | Restore-from-trash choice modal | RestoreChoiceModalService |
| translation-key-modal.service.ts | Translation key modal (metadata manager) | TranslationKeyModalService |
| demo-loader.service.ts | Load demo data (equipment, venues, etc.) | DemoLoaderService |
| ingredient.service.ts | Ingredient helpers | IngredientService |
| user.service.ts | User/session | UserService |
| util.service.ts | Shared utilities | UtilService |
| *.spec.ts | Unit tests (Jasmine/Karma) | — |

## Architecture Context

Services sit in `core/` and are injected into pages and shared components. Data services (product, recipe, equipment, venue, dish) delegate persistence to `StorageService`. Modals are driven by dedicated services (confirm, add-item, global-specific, restore-choice, translation-key).

## Patterns & Conventions

- Standalone injectables; `inject()` in constructors.
- Data services: typical methods `getAll()`, `getById()`, `add()`, `update()`, `delete()`; storage keys like `KITCHEN_PRODUCTS`, `KITCHEN_RECIPES`.
- Signal naming in consumers: `data_ = signal()` for mutable state.

## Dependencies

- **Imports from**: `../models/*`, `async-storage.service` (data services), `@angular/core`.
- **Used by**: All pages, shared components, resolvers.

## Development Notes

- New entity CRUD: add model in `core/models/`, data service here, resolver in `core/resolvers/`, route in `app.routes.ts`.
- Demo data: `DemoLoaderService` and `public/assets/data/demo-*.json`.

## Recent Changes

- 2025-02: Equipment and venue data services, resolvers, demo loader and demo JSON.

---
*Last updated: 2025-02-28*
*Updated by: breadcrumb-navigator*
