# Route Inventory — FoodVibe 1.0
Generated: 2026-04-09 | Audit: 375×812 mobile, RTL

| path | requires_auth | has_children | page_component |
|------|--------------|-------------|---------------|
| `/dashboard` | No | No | DashboardPage (tabs: overview, metadata, venues, add-venue, trash) |
| `/inventory` | No (list); Yes (add/edit) | Yes | InventoryPage → InventoryProductListComponent |
| `/inventory/list` | No | No | InventoryProductListComponent |
| `/inventory/add` | Yes (authGuard + pendingChanges) | No | ProductFormComponent |
| `/inventory/edit/:id` | Yes (authGuard + pendingChanges) | No | ProductFormComponent |
| `/inventory/equipment` | No | No | EquipmentListComponent (embedded) |
| `/inventory/equipment/add` | Yes (authGuard) | No | EquipmentFormComponent |
| `/inventory/equipment/edit/:id` | Yes (authGuard) | No | EquipmentFormComponent |
| `/equipment` | No (list); Yes (add/edit) | Yes | EquipmentPage (nav + router-outlet) |
| `/equipment/list` | No | No | EquipmentListComponent |
| `/equipment/add` | Yes (authGuard) | No | EquipmentFormComponent |
| `/equipment/edit/:id` | Yes (authGuard) | No | EquipmentFormComponent |
| `/recipe-book` | No | No | RecipeBookPage → RecipeBookListComponent |
| `/recipe-builder` | Yes (authGuard + pendingChanges) | No | RecipeBuilderPage |
| `/recipe-builder/:id` | Yes (authGuard + pendingChanges) | No | RecipeBuilderPage |
| `/menu-library` | No | No | MenuLibraryPage → MenuLibraryListComponent |
| `/menu-intelligence` | Yes (authGuard + pendingChanges) | No | MenuIntelligencePage |
| `/menu-intelligence/:id` | Yes (authGuard + pendingChanges) | No | MenuIntelligencePage |
| `/cook` | No | No | CookViewPage (empty state) |
| `/cook/:id` | No (canDeactivate only — no authGuard) | No | CookViewPage |
| `/suppliers` | No (list); Yes (add/edit) | Yes | SuppliersPage → SupplierListComponent |
| `/suppliers/list` | No | No | SupplierListComponent |
| `/suppliers/add` | Yes (authGuard) | No | SupplierFormComponent |
| `/suppliers/edit/:id` | Yes (authGuard) | No | SupplierFormComponent |
| `/venues` | No (list); Yes (add/edit) | Yes | VenuesPage → VenueListComponent |
| `/venues/list` | No | No | VenueListComponent |
| `/venues/add` | Yes (authGuard) | No | VenueFormComponent |
| `/venues/edit/:id` | Yes (authGuard) | No | VenueFormComponent |
| `/trash` | Yes (authGuard) | No | TrashPage (also embedded in dashboard tab) |
| `/` → `/dashboard` | — | — | redirect |
| `/command-center` → `/dashboard?tab=metadata` | — | — | redirect |

## Audit Priority Order (public-first)

### Tier 1 — Public, no auth needed
1. `/dashboard` (default tab: overview)
2. `/recipe-book`
3. `/inventory/list`
4. `/menu-library`
5. `/cook` (empty state — no recipe selected)
6. `/equipment/list`
7. `/suppliers/list`
8. `/venues/list`

### Tier 2 — Auth-required (login needed)
9. `/recipe-builder` (new recipe)
10. `/menu-intelligence` (new menu)
11. `/trash`
12. `/inventory/add`
13. `/inventory/edit/:id`
14. `/cook/:id` (with a recipe loaded)
