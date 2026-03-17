# Plan 142 — FAB Add-new for list pages

## Goal

Apply the same pattern as menu-library: when the user is on a **list** page, the hero FAB (on hover) shows an action that takes them to **add a new item** for that context. Each list registers its own action; when the user navigates to the add (or edit) screen, the list component is destroyed and clears the FAB.

## Where to implement

| List / route | Component | Add target | Label key |
|-------------|-----------|------------|-----------|
| Inventory (products) | InventoryProductListComponent | `/inventory/add` | `add_product` |
| Equipment | EquipmentListComponent | `[...equipmentBasePath, 'add']` | `add_equipment` |
| Venues | VenueListComponent | `/venues/add` | `add_venue` (only when not embeddedInDashboard) |
| Suppliers | SupplierListComponent | supplierModal.openAdd() | `add_supplier` (only when not embeddedInDashboard) |

## Implementation pattern (per list)

1. Inject HeroFabService.
2. Implement OnInit and OnDestroy.
3. In ngOnInit: setPageActions([{ labelKey, icon: 'plus', run }], 'replace'). For venues/suppliers only when !embeddedInDashboard.
4. run(): inventory → router.navigate(['/inventory/add']); equipment → router.navigate([...equipmentBasePath, 'add']); venue → requireAuth() then navigate; supplier → requireAuth() then supplierModal.openAdd().
5. In ngOnDestroy: heroFab.clearPageActions().

## Files

- src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
- src/app/pages/equipment/components/equipment-list/equipment-list.component.ts
- src/app/pages/venues/components/venue-list/venue-list.component.ts
- src/app/pages/suppliers/components/supplier-list/supplier-list.component.ts
