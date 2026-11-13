# core/models — Breadcrumbs

## Purpose

TypeScript interfaces, types, and small constants for domain entities and shared structures. No business logic; consumed by services, components, and resolvers.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| `product.model.ts` | Product entity, purchase options | Product, PurchaseOption_ |
| `recipe.model.ts` | Recipe, prep, steps | Recipe, RecipeStep, PrepCategory, MiseItem, FlatPrepItem |
| `course.model.ts` | Course / dish-type definition | CourseDefinition |
| `ingredient.model.ts` | Ingredient row types | Ingredient |
| `supplier.model.ts` | Supplier entity | Supplier |
| `equipment.model.ts` | Equipment entity, scaling rules | Equipment, EquipmentCategory, ScalingRule |
| `venue.model.ts` | Venue profile / infra | VenueProfile, VenueInfraItem, EnvironmentType |
| `logistics.model.ts` | Event/dish logistics | EventLogistics, DishLogistics, BaselineEntry, ServiceOverride, etc. |
| `menu-event.model.ts` | Menu builder event model (plan 579: logistics answer section is a string, payer ours, hiddenKeys on the site logistics) | MenuEvent, MenuSection, MenuTypeDefinition, ALL_DISH_FIELDS |
| `client.model.ts` | Client entity (who an event is for), mirror of the client schema | Client, ClientType, CLIENT_TYPES |
| `knowledge-item.model.ts` | Knowledge item (a fact the business knows about itself), mirror of the schema (plan 554) | KnowledgeItem, KNOWLEDGE_TOPICS |
| `front-desk-profile.model.ts` | Front desk profile type and constants, mirror of the profile schema | FrontDeskProfile, BUSINESS_TYPES, FRONT_DESK_STATUSES |
| `ai-usage.model.ts` | AI usage ledger report shapes (platform admin) | AiUsageRow, AiUsageReport, AiUsageParams, AiUsageGroupBy |
| `user.model.ts` | User/session | User |
| `msg.model.ts` | User message / toast | Msg |
| `label.model.ts` | Label definitions for UI | LabelDefinition, LABEL_COLOR_PALETTE |
| `admin-user.model.ts` | Admin user entity | AdminUser |
| `ai-menu-draft.model.ts` | AI-drafted menu + match types | AiMenuDraft, AiMenuSectionDraft, AiMenuDishDraft, AiMenuPatch, MatchedMenu, MatchedSection, MatchedDish |
| `ai-product-draft.model.ts` | AI-drafted product | AiProductDraft, AiProductPatch |
| `business-stats.model.ts` | Dashboard read model of the business stats route (plan 447) | StatsPeriod, BusinessStats, BusinessStatsCards, CountCard, FunnelStage, UpcomingEvent |
| `business-report.model.ts` | Read model of the business report route (plan 568) | BusinessReport, ReportMetricKey, ReportValue, ReportPoint, ReportFinding |
| `parsed-result.model.ts` | Parsed recipe/dish import result | ParsedResult, ParsedResultType, ParsedRecipe, ParsedDish, ParsedIngredient, ParsedStep |
| `v2/` | v2 entity types inferred from the shared Zod schemas; `v2/conformance.ts` locks them to the client interfaces at compile time | V2ConformsToClient |
| `request.model.ts` | Customer request type (plan 549) | FrontDeskRequest, ManualRequestInput, DECLINE_REASONS |
| `booking.model.ts` | Booking type (plan 549) | Booking |

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


---
*Last updated: 2026-09-27*
*Updated by: breadcrumbs*
