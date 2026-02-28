# pages — Breadcrumbs

## Purpose

Feature areas, one directory per route segment. Each page owns its layout (tabs, sidebar, router-outlet) and loads child components for list/detail/add/edit.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| dashboard/ | Default route; overview + core settings (metadata) tabs; `/command-center` redirects here | DashboardPage |
| equipment/ | Equipment CRUD; list, add, edit/:id; equipmentResolver | EquipmentPage |
| venues/ | Venues CRUD; list, add, edit/:id; venueResolver | VenuesPage |
| inventory/ | Product list + product form (add/edit); productResolver, pendingChangesGuard | InventoryPage |
| recipe-book/ | Recipe list, filters, add/edit/delete; KitchenStateService for navigation | RecipeBook list page |
| recipe-builder/ | Single-recipe edit: header, ingredients table, workflow; pendingChangesGuard | RecipeBuilderPage |
| cook-view/ | Cook view workflow (prep, steps) | CookViewPage |
| menu-library/ | Menu library list, filters, from-date, sort | MenuLibrary page |
| menu-intelligence/ | Menu intelligence views | MenuIntelligencePage |
| metadata-manager/ | Categories, allergens, units management | MetadataManagerPage |
| trash/ | Trash list and restore | TrashPage |

## Architecture Context

Lazy-loaded via `app.routes.ts`. Each page uses `core/services` and often `shared/` modals. Equipment and venues use resolvers for edit routes.

## Patterns & Conventions

- Page = container with `<router-outlet>`; children = list, form, or detail components.
- Naming: `*.page.ts` for page component; `components/` subfolder for list/form components.

## Dependencies

- **Imports from**: `../../core/services`, `../../core/models`, `../../shared`.
- **Used by**: `app.routes.ts` only; no other app code imports pages directly (lazy load).

## Development Notes

- New page: add directory, page component, add route in `app.routes.ts`, add nav link in header if needed.
- Styling: follow `.assistant/skills/cssLayer/SKILL.md` (tokens, five-group rhythm).

## Recent Changes

- 2025-02: Equipment and venues pages with list/form components; menu-library styling and filters.

---
*Last updated: 2025-02-28*
*Updated by: breadcrumb-navigator*
