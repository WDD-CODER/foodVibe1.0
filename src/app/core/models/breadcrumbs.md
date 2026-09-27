# core/models — Breadcrumbs

## Purpose

TypeScript interfaces, types, and small constants for domain entities and shared structures. No business logic; consumed by services, components, and resolvers.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| product.model.ts | Product entity, purchase options | Product, PurchaseOption_ |
| recipe.model.ts | Recipe, prep, steps | Recipe, RecipeStep, PrepCategory, MiseItem, FlatPrepItem |
| ingredient.model.ts | Ingredient row types | Ingredient |
| supplier.model.ts | Supplier entity | Supplier |
| equipment.model.ts | Equipment entity, scaling rules | Equipment, EquipmentCategory, ScalingRule |
| venue.model.ts | Venue profile / infra | VenueProfile, VenueInfraItem, EnvironmentType |
| logistics.model.ts | Event/dish logistics | EventLogistics, DishLogistics, BaselineEntry, ServiceOverride, etc. |
| menu-event.model.ts | Menu builder event model | MenuEvent, MenuSection, MenuTypeDefinition, ALL_DISH_FIELDS |
| user.model.ts | User/session | User |
| msg.model.ts | User message / toast | Msg |
| label.model.ts | Label definitions for UI | LabelDefinition, LABEL_COLOR_PALETTE |
| admin-user.model.ts | Admin user entity | AdminUser |
| ai-menu-draft.model.ts | AI-drafted menu + match types | AiMenuDraft, AiMenuSectionDraft, AiMenuDishDraft, AiMenuPatch, MatchedMenu, MatchedSection, MatchedDish |
| ai-product-draft.model.ts | AI-drafted product | AiProductDraft, AiProductPatch |
| parsed-result.model.ts | Parsed recipe/dish import result | ParsedResult, ParsedResultType, ParsedRecipe, ParsedDish, ParsedIngredient, ParsedStep |

## Architecture Context

Models are the type layer for `core/services` and `pages/`. Product and recipe models are the most central; logistics and menu-event support menu intelligence and library flows.

## Patterns & Conventions

- Prefer interfaces for entities; `export type` for unions and aliases.
- File name aligns with primary type (`product.model.ts` → `Product`).

## Dependencies

- **Imports from**: None between model files (pure types; Angular only in consuming layers).
- **Used by**: Services, resolvers, page and shared components.

## Development Notes

- New persisted entity: add model here, then data service, resolver, and routes.

## Recent Changes

- 2026-09-27 (nightly-maintenance): Removed `filter-category.model.ts`, `filter-option.model.ts`, `units.enum.ts` — no longer present in the repo (stale doc entries). Added 4 undocumented files that do exist on disk: `admin-user.model.ts`, `ai-menu-draft.model.ts`, `ai-product-draft.model.ts`, `parsed-result.model.ts`.
- 2026-03-22: Aligned exports with code (label, KitchenUnit); removed inaccurate "recipe/ sub-models" wording.
- 2026-03-22: Removed unused empty `recipe/recipe.module.ts` (no references).

---
*Last updated: 2026-09-27*
*Updated by: breadcrumb-navigator*
