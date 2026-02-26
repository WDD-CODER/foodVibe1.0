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