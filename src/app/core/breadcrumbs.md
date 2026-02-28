# core — Breadcrumbs

## Purpose

App-wide building blocks: layout components (header, footer), guards, resolvers, pipes, directives, validators. Everything here is shared across pages.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| components/ | Header, footer, user-msg | → see components/breadcrumbs.md |
| services/ | Data, state, modals | → see services/breadcrumbs.md |
| models/ | Domain types and interfaces | → see models/breadcrumbs.md |
| guards/ | pending-changes.guard.ts | pendingChangesGuard (canDeactivate) |
| resolvers/ | product, recipe, equipment, venue | productResolver, recipeResolver, equipmentResolver, venueResolver |
| pipes/ | translation-pipe.pipe.ts | translatePipe (dictionary-based) |
| directives/ | select-on-focus, click-out-side, focus-by-row | Standalone directives |
| validators/ | item.validators.ts | Item validators for forms |
| utils/ | system-health.ts | System health helpers |

## Architecture Context

`core/` sits beside `pages/` and `shared/`. Routes in `app.routes.ts` use guards and resolvers from here; pages inject services and use pipes/directives.

## Patterns & Conventions

- Guards: function-based (e.g. `pendingChangesGuard`).
- Resolvers: return observable of entity for edit routes (product, recipe, equipment, venue).
- Components: standalone; header has nav links and layout.

## Dependencies

- **Imports from**: `./services`, `./models`, `@angular/router`, `@angular/core`.
- **Used by**: `app.routes.ts`, all pages, `appRoot`.

## Development Notes

- New entity with edit route: add resolver in `resolvers/`, wire in `app.routes.ts` on `edit/:id`.
- Pending changes: `pendingChangesGuard` used on recipe-builder and inventory add/edit.

## Recent Changes

- 2025-02: equipment.resolver, venue.resolver added for equipment and venues routes.

---
*Last updated: 2025-02-28*
*Updated by: breadcrumb-navigator*
