# src/app/pages — breadcrumbs

One folder per lazy-loaded route segment (loaded from `app.routes.ts`). Each page owns its layout and keeps list / form / detail views under its own `components/`.

| Entry | Purpose |
| --- | --- |
| `dashboard/` | `/dashboard` — overview tabs; also hosts metadata (`/command-center` redirects to `dashboard?tab=metadata`) |
| `inventory/` | `/inventory` — products list + form; `equipment` child routes live under it |
| `equipment/` | Equipment list + form components, routed under `/inventory/equipment` (no page of its own) |
| `venues/` | `/venues` — venue list, detail and form |
| `suppliers/` | `/suppliers` — supplier list and form |
| `recipe-book/` | `/recipe-book` — recipe list and filters |
| `recipe-builder/` | `/recipe-builder/:id` — single-recipe editor with local `services/` and `utils/` |
| `cook-view/` | `/cook/:id` — step-by-step cook workflow |
| `menu-library/` | `/menu-library` — menu list and filters |
| `menu-intelligence/` | `/menu-intelligence/:id` — menu editor and costing views |
| `metadata-manager/` | Categories, allergens, units, preparations (`metadata-manager/metadata-manager.page.component.ts`) |
| `trash/` | `/trash` — soft-deleted items and restore |

## Key exports
`DashboardPage`, `InventoryPage`, `VenuesPage`, `SuppliersPage`, `RecipeBookPage`, `RecipeBuilderPage`, `CookViewPage`, `MenuLibraryPage`, `MenuIntelligencePage`, `MetadataManagerComponent`, `TrashPage`

---
*Updated by: breadcrumbs*
