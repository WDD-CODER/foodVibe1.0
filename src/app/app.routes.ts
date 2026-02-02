import { Routes } from '@angular/router';
import { IngredientLedgerComponent } from './components/ingredient-ledger/ingredient-ledger.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { InventoryItemListComponent } from './components/inventory/inventory-item-list/inventory-item-list.component';
import { InventoryItemFormComponent } from './components/inventory/inventory-item-form/inventory-item-form.component';
import { RecipesComponent } from './components/recipes/recipes.component';
import { DishesComponent } from './components/dishes/dishes.component';
import { MenuCreatingComponent }'./components/menu-creating/menu-creating.component';
import { ChecklistCreatorComponent } from './components/checklist-creator/checklist-creator.component';

export const routes: Routes = [
  { path: 'ingredients', component: IngredientLedgerComponent },
  {
    path: 'inventory',
    component: InventoryComponent,
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: InventoryItemListComponent },
      { path: 'add', component: InventoryItemFormComponent },
      { path: 'edit/:id', component: InventoryItemFormComponent },
    ],
  },
  { path: 'recipes', component: RecipesComponent },
  { path: 'dishes', component: DishesComponent },
  { path: 'menu-creating', component: MenuCreatingComponent },
  { path: 'checklist-creator', component: ChecklistCreatorComponent },
  { path: '', redirectTo: 'ingredients', pathMatch: 'full' },
];
