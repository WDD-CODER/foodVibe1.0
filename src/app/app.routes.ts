import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'inventory',
    // Lazy load the parent page shell
    loadComponent: () => import('./pages/inventory.page/inventory.page').then(m => m.InventoryPage),
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { 
        path: 'list', 
        loadComponent: () => import('./components/items/inventory-item-list/inventory-item-list.component').then(m => m.InventoryItemListComponent) 
      },
      { 
        path: 'add', 
        loadComponent: () => import('./components/items/product-form/product-form.component').then(m => m.ProductFormComponent) 
      },
      { 
        // Full-screen edit route with ID parameter for MongoDB-ready identification
        path: 'edit/:id', 
        loadComponent: () => import('./components/items/product-form/product-form.component').then(m => m.ProductFormComponent) 
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
    path: 'checklist-creator', 
    loadComponent: () => import('./components/checklist-creator/checklist-creator.component').then(m => m.ChecklistCreatorComponent) 
  },
  { path: '', redirectTo: 'inventory', pathMatch: 'full' },
];