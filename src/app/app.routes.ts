import { Routes } from '@angular/router';
import { IngredientLedgerComponent } from './components/items/inventory-ledger/ingredient-ledger.component';
import { RecipesComponent } from './components/recipes/recipes.component';
import { DishesComponent } from './components/dishes/dishes.component';
import { MenuCreatingComponent } from './components/menu-creating/menu-creating.component';
import { ChecklistCreatorComponent } from './components/checklist-creator/checklist-creator.component';
import { InventoryItemListComponent } from './components/items/inventory-item-list/inventory-item-list.component';
import { AddItemFormComponent } from './components/items/item-form/add-item-form/add-item-form.component';
import { EditItemFormComponent } from './components/items/item-form/edit-item-form/edit-item-form.component';
import { InventoryPage } from './pages/inventory.page/inventory.page';
import { ProductFormComponent } from '@components/items/product-form/product-form.component';

export const routes: Routes = [
  {
    path: 'inventory',
    component: InventoryPage,
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: InventoryItemListComponent },
      { path: 'add', component: ProductFormComponent },
      { path: 'edit', component: ProductFormComponent },
    ],
  },
  { path: 'recipes', component: RecipesComponent },
  { path: 'dishes', component: DishesComponent },
  { path: 'menu-creating', component: MenuCreatingComponent },
  { path: 'checklist-creator', component: ChecklistCreatorComponent },
  { path: '', redirectTo: 'ingredients', pathMatch: 'full' },
];
