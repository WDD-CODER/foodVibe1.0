import { Routes } from '@angular/router';
import { HomeScreenComponent } from './components/home-screen/home-screen.component';
import { IngredientLedgerComponent } from './components/ingredient-ledger/ingredient-ledger.component';

export const routes: Routes = [
  { path: '', component: HomeScreenComponent },
  { path: 'ingredients', component: IngredientLedgerComponent }
];
