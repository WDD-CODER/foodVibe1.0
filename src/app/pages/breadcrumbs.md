# pages — Breadcrumbs

## Purpose

Feature areas: one folder per lazy-loaded route segment. Each page owns layout (tabs, sidebars, `router-outlet`) and local `components/` for list, form, and detail views.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| dashboard/ | Default/overview; metadata entry | DashboardPage |
| equipment/ | Equipment CRUD; `equipmentResolver` | EquipmentPage |
| venues/ | Venues CRUD; `venueResolver` | VenuesPage |
| suppliers/ | Suppliers CRUD; `supplierResolver` | SuppliersPage |
| inventory/ | Products list + form; `productResolver`, `pendingChangesGuard` | InventoryPage |
| recipe-book/ | Recipe list and filters | RecipeBookPage |
| recipe-builder/ | Single-recipe editor; `pendingChangesGuard` | RecipeBuilderPage |
| cook-view/ | Cook workflow | CookViewPage |
| menu-library/ | Menu library list and filters | MenuLibraryPage |
| menu-intelligence/ | Menu intelligence views | MenuIntelligencePage |
| metadata-manager/ | Categories, allergens, units, preparations | MetadataManagerComponent |
| trash/ | Trash and restore | TrashPage |

## Architecture Context

Lazy-loaded from `app.routes.ts`. Pages depend on `core/services`, `core/guards`, `core/resolvers`, and `shared/` modals/components.

## Patterns & Conventions

- Page container with optional child routes; local UI under `components/`.
- Naming: `*.page.ts` for routed pages; metadata-manager uses `metadata-manager.page.component.ts` + `MetadataManagerComponent`.

## Dependencies

- **Imports from**: `../../core/services`, `../../core/models`, `../../shared`, `../../core/guards`, `../../core/resolvers`.
- **Used by**: Router config only (lazy `loadComponent` / `loadChildren`).

## Development Notes

- New feature area: add folder, page component, route in `app.routes.ts`, header link if user-facing.
- Styling: `.claude/skills/cssLayer/SKILL.md`.

## Recent Changes

- 2026-03-22: Added suppliers; fixed page class names (RecipeBookPage, MetadataManagerComponent, MenuLibraryPage); resolver notes updated.

---
*Last updated: 2026-03-22*
*Updated by: breadcrumb-navigator*
