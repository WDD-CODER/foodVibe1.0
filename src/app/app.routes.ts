import { Routes } from '@angular/router';
import { productResolver } from './core/resolvers/product.resolver';
import { pendingChangesGuard } from './core/guards/pending-changes.guard';

export const routes: Routes = [
  {
    path: 'inventory',
    // Lazy load the parent page shell
    loadComponent: () => import('./pages/inventory.page/inventory.page').then(m => m.InventoryPage),
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        loadComponent: () => import('./components/inventory/products/inventory-product-list/inventory-product-list.component').then(m => m.InventoryProductListComponent)
      },
      {
        path: 'add',
        loadComponent: () => import('./components/inventory/products/product-form/product-form.component').then(m => m.ProductFormComponent),
        canDeactivate: [pendingChangesGuard]
      },
      {
        // Full-screen edit route with ID parameter for MongoDB-ready identification
        path: 'edit/:id',
        loadComponent: () => import('./components/inventory/products/product-form/product-form.component').then(m => m.ProductFormComponent),
        resolve: { product: productResolver },
        canDeactivate: [pendingChangesGuard]
      },
    ],
  },
  {
    path: 'recipes',
    loadComponent: () => import('./components/recipes/recipes.component').then(m => m.RecipesComponent)
  },
  {
    path: 'dishes',
    loadComponent: () => import('./components/dishes/dishes.component').then(m => m.DishesComponent)
  },
  {
    path: 'menu-creating',
    loadComponent: () => import('./components/menu-creating/menu-creating.component').then(m => m.MenuCreatingComponent)
  },
  {
    path: 'command-center',
    loadComponent: () => 
      import('./pages/metadata-manager/metadata-manager.page.component')
        .then(m => m.MetadataManagerComponent)
  },
  { path: '', redirectTo: 'inventory', pathMatch: 'full' },
];