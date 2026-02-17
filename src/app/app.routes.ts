import { Routes } from '@angular/router';
import { productResolver } from './core/resolvers/product.resolver';
import { recipeResolver } from './core/resolvers/recipe.resolver';
import { pendingChangesGuard } from './core/guards/pending-changes.guard';

export const routes: Routes = [
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
    loadComponent: () =>
      import('./pages/metadata-manager/metadata-manager.page.component')
        .then(m => m.MetadataManagerComponent)
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
  { path: '', redirectTo: 'inventory', pathMatch: 'full' },
];