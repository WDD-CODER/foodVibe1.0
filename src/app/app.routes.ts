import { Routes } from '@angular/router';
import { IngredientLedgerComponent } from './components/ingredient-ledger/ingredient-ledger.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { RecipesComponent } from './components/recipes/recipes.component';
import { DishesComponent } from './components/dishes/dishes.component';
import { MenuCreatingComponent } from './components/menu-creating/menu-creating.component';
import { ChecklistCreatorComponent } from './components/checklist-creator/checklist-creator.component';

export const routes: Routes = [
  { path: 'ingredients', component: IngredientLedgerComponent },
  { path: 'inventory', component: InventoryComponent },
  { path: 'recipes', component: RecipesComponent },
  { path: 'dishes', component: DishesComponent },
  { path: 'menu-creating', component: MenuCreatingComponent },
  { path: 'checklist-creator', component: ChecklistCreatorComponent },
  { path: '', redirectTo: 'ingredients', pathMatch: 'full' }, // Default route
];
