# core/models — Breadcrumbs

## Purpose

TypeScript interfaces, types, and enums for domain entities and shared structures. No logic; used by services, components, and resolvers.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| product.model.ts | Product entity (supplier, allergens, stock, etc.) | Product, product interface |
| recipe.model.ts | Recipe structure (ingredients, prep, header, cost) | Recipe, ingredient/prep types |
| recipe/ | Recipe-related sub-models (if any) | → see recipe/ |
| ingredient.model.ts | Ingredient row / ingredient model | Ingredient types |
| supplier.model.ts | Supplier entity | Supplier |
| equipment.model.ts | Equipment entity (logistics) | Equipment |
| venue.model.ts | Venue entity (logistics) | Venue |
| logistics.model.ts | Shared logistics types | Logistics types |
| menu-event.model.ts | Menu event structure | MenuEvent types |
| user.model.ts | User/session model | User |
| msg.model.ts | User message / toast model | Msg types |
| filter-category.model.ts | Filter category for sidebars/lists | FilterCategory |
| filter-option.model.ts | Filter option (e.g. checkbox) | FilterOption |
| units.enum.ts | Unit enum (mass, volume, etc.) | Units enum |

## Architecture Context

Models are the single source of type definitions for `core/services` and `pages/`. Recipe and product models are the most central; equipment and venue added for logistics layer.

## Patterns & Conventions

- Interfaces for entities; enums for fixed sets (e.g. units).
- Naming: entity name matches file (e.g. `Product` in product.model.ts).

## Dependencies

- **Imports from**: Minimal (Angular/core only if needed).
- **Used by**: Services, resolvers, page components, shared components.

## Development Notes

- When adding a new entity (e.g. equipment, venue): add model here, then data service, resolver, and routes.

## Recent Changes

- 2025-02: equipment.model, venue.model, logistics.model; recipe/menu-event updates.

---
*Last updated: 2025-02-28*
*Updated by: breadcrumb-navigator*
