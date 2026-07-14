import { Routes } from '@angular/router'
import { productResolver } from './core/resolvers/product.resolver'
import { recipeResolver } from './core/resolvers/recipe.resolver'
import { equipmentResolver } from './core/resolvers/equipment.resolver'
import { equipmentEnsureLoadedResolver } from './core/resolvers/equipment-ensure-loaded.resolver'
import { venueResolver } from './core/resolvers/venue.resolver'
import { venuesEnsureLoadedResolver } from './core/resolvers/venues-ensure-loaded.resolver'
import { menuEventsEnsureLoadedResolver } from './core/resolvers/menu-events-ensure-loaded.resolver'
import { menuSectionCategoriesEnsureLoadedResolver } from './core/resolvers/menu-section-categories-ensure-loaded.resolver'
import { preparationsEnsureLoadedResolver } from './core/resolvers/preparations-ensure-loaded.resolver'
import { supplierResolver } from './core/resolvers/supplier.resolver'
import { pendingChangesGuard } from './core/guards/pending-changes.guard'
import { authGuard } from './core/guards/auth.guard'

export const routes: Routes = [
  {
    path: 'equipment',
    loadComponent: () => import('./pages/equipment/equipment.page').then(m => m.EquipmentPage),
    resolve: { equipmentLoaded: equipmentEnsureLoadedResolver },
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        loadComponent: () => import('./pages/equipment/components/equipment-list/equipment-list.component').then(m => m.EquipmentListComponent),
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/equipment/components/equipment-form/equipment-form.component').then(m => m.EquipmentFormComponent),
        canActivate: [authGuard],
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/equipment/components/equipment-form/equipment-form.component').then(m => m.EquipmentFormComponent),
        resolve: { equipment: equipmentResolver },
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: 'venues',
    loadComponent: () => import('./pages/venues/venues.page').then(m => m.VenuesPage),
    resolve: { venuesLoaded: venuesEnsureLoadedResolver },
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        loadComponent: () => import('./pages/venues/components/venue-list/venue-list.component').then(m => m.VenueListComponent),
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/venues/components/venue-form/venue-form.component').then(m => m.VenueFormComponent),
        resolve: { equipmentLoaded: equipmentEnsureLoadedResolver },
        canActivate: [authGuard],
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/venues/components/venue-form/venue-form.component').then(m => m.VenueFormComponent),
        resolve: {
          venue: venueResolver,
          equipmentLoaded: equipmentEnsureLoadedResolver,
        },
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: 'inventory',
    loadComponent: () => import('./pages/inventory/inventory.page').then(m => m.InventoryPage),
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        loadComponent: () => import('./pages/inventory/components/inventory-product-list/inventory-product-list.component').then(m => m.InventoryProductListComponent)
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/inventory/components/product-form/product-form.component').then(m => m.ProductFormComponent),
        canActivate: [authGuard],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/inventory/components/product-form/product-form.component').then(m => m.ProductFormComponent),
        resolve: { product: productResolver },
        canActivate: [authGuard],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'equipment',
        loadComponent: () => import('./pages/equipment/components/equipment-list/equipment-list.component').then(m => m.EquipmentListComponent),
        resolve: { equipmentLoaded: equipmentEnsureLoadedResolver },
      },
      {
        path: 'equipment/add',
        loadComponent: () => import('./pages/equipment/components/equipment-form/equipment-form.component').then(m => m.EquipmentFormComponent),
        resolve: { equipmentLoaded: equipmentEnsureLoadedResolver },
        canActivate: [authGuard],
      },
      {
        path: 'equipment/edit/:id',
        loadComponent: () => import('./pages/equipment/components/equipment-form/equipment-form.component').then(m => m.EquipmentFormComponent),
        resolve: {
          equipmentLoaded: equipmentEnsureLoadedResolver,
          equipment: equipmentResolver,
        },
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: 'command-center',
    redirectTo: 'dashboard?tab=metadata',
    pathMatch: 'full',
  },
  {
    path: 'recipe-builder',
    loadComponent: () => import('./pages/recipe-builder/recipe-builder.page').then(m => m.RecipeBuilderPage),
    resolve: {
      equipmentLoaded: equipmentEnsureLoadedResolver,
      preparationsLoaded: preparationsEnsureLoadedResolver,
    },
    canActivate: [authGuard],
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: 'recipe-builder/:id',
    loadComponent: () => import('./pages/recipe-builder/recipe-builder.page').then(m => m.RecipeBuilderPage),
    resolve: {
      recipe: recipeResolver,
      equipmentLoaded: equipmentEnsureLoadedResolver,
      preparationsLoaded: preparationsEnsureLoadedResolver,
    },
    canActivate: [authGuard],
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: 'recipe-book',
    loadComponent: () => import('@pages/recipe-book/recipe-book.page').then(m => m.RecipeBookPage),
  },
  {
    path: 'menu-library',
    loadComponent: () => import('@pages/menu-library/menu-library.page').then(m => m.MenuLibraryPage),
    resolve: { menuEventsLoaded: menuEventsEnsureLoadedResolver },
  },
  {
    path: 'menu-intelligence',
    loadComponent: () => import('@pages/menu-intelligence/menu-intelligence.page').then(m => m.MenuIntelligencePage),
    canActivate: [authGuard],
    canDeactivate: [pendingChangesGuard],
    resolve: {
      menuEventsLoaded: menuEventsEnsureLoadedResolver,
      sectionCategoriesLoaded: menuSectionCategoriesEnsureLoadedResolver,
    },
  },
  {
    path: 'menu-intelligence/:id',
    loadComponent: () => import('@pages/menu-intelligence/menu-intelligence.page').then(m => m.MenuIntelligencePage),
    canActivate: [authGuard],
    canDeactivate: [pendingChangesGuard],
    resolve: {
      menuEventsLoaded: menuEventsEnsureLoadedResolver,
      sectionCategoriesLoaded: menuSectionCategoriesEnsureLoadedResolver,
    },
  },
  {
    path: 'cook',
    loadComponent: () => import('./pages/cook-view/cook-view.page').then(m => m.CookViewPage),
  },
  {
    path: 'cook/:id',
    loadComponent: () => import('./pages/cook-view/cook-view.page').then(m => m.CookViewPage),
    resolve: { recipe: recipeResolver },
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: 'suppliers',
    loadComponent: () => import('./pages/suppliers/suppliers.page').then(m => m.SuppliersPage),
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        loadComponent: () => import('./pages/suppliers/components/supplier-list/supplier-list.component').then(m => m.SupplierListComponent),
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/suppliers/components/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent),
        canActivate: [authGuard],
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/suppliers/components/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent),
        resolve: { supplier: supplierResolver },
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
  },
  {
    path: 'trash',
    loadComponent: () => import('./pages/trash/trash.page').then(m => m.TrashPage),
    canActivate: [authGuard],
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
]
