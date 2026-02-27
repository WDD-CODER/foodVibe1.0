import { Routes } from '@angular/router';
import { productResolver } from './core/resolvers/product.resolver';
import { recipeResolver } from './core/resolvers/recipe.resolver';
import { equipmentResolver } from './core/resolvers/equipment.resolver';
import { venueResolver } from './core/resolvers/venue.resolver';
import { pendingChangesGuard } from './core/guards/pending-changes.guard';

export const routes: Routes = [
  {
    path: 'equipment',
    loadComponent: () => import('./pages/equipment/equipment.page').then(m => m.EquipmentPage),
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        loadComponent: () => import('./pages/equipment/components/equipment-list/equipment-list.component').then(m => m.EquipmentListComponent),
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/equipment/components/equipment-form/equipment-form.component').then(m => m.EquipmentFormComponent),
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/equipment/components/equipment-form/equipment-form.component').then(m => m.EquipmentFormComponent),
        resolve: { equipment: equipmentResolver },
      },
    ],
  },
  {
    path: 'venues',
    loadComponent: () => import('./pages/venues/venues.page').then(m => m.VenuesPage),
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        loadComponent: () => import('./pages/venues/components/venue-list/venue-list.component').then(m => m.VenueListComponent),
      },
      {
        path: 'add',
        loadComponent: () => import('./pages/venues/components/venue-form/venue-form.component').then(m => m.VenueFormComponent),
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/venues/components/venue-form/venue-form.component').then(m => m.VenueFormComponent),
        resolve: { venue: venueResolver },
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
        canDeactivate: [pendingChangesGuard]
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./pages/inventory/components/product-form/product-form.component').then(m => m.ProductFormComponent),
        resolve: { product: productResolver },
        canDeactivate: [pendingChangesGuard]
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
    canDeactivate: [pendingChangesGuard]
  },
  {
    path: 'recipe-builder/:id',
    loadComponent: () => import('./pages/recipe-builder/recipe-builder.page').then(m => m.RecipeBuilderPage),
    resolve: { recipe: recipeResolver },
    canDeactivate: [pendingChangesGuard]
  },
  {
    path: 'recipe-book',
    loadComponent: () => import('@pages/recipe-book/recipe-book.page').then(m => m.RecipeBookPage),
  },
  {
    path: 'menu-library',
    loadComponent: () => import('@pages/menu-library/menu-library.page').then(m => m.MenuLibraryPage),
  },
  {
    path: 'menu-intelligence',
    loadComponent: () => import('@pages/menu-intelligence/menu-intelligence.page').then(m => m.MenuIntelligencePage),
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: 'menu-intelligence/:id',
    loadComponent: () => import('@pages/menu-intelligence/menu-intelligence.page').then(m => m.MenuIntelligencePage),
    canDeactivate: [pendingChangesGuard],
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
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
  },
  {
    path: 'trash',
    loadComponent: () => import('./pages/trash/trash.page').then(m => m.TrashPage),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];