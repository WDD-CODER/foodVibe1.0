import { Component, inject } from '@angular/core';
import type { ItemLedger } from '../../core/models/ingredient.model';
import { IngredientService } from '../../core/services/ingredient.service';

@Component({
  selector: 'app-ingredient-ledger',
  standalone: true,
  templateUrl: 'ingredient-ledger.component.html',
})
export class IngredientLedgerComponent {
  protected readonly ingredientService = inject(IngredientService);

  trackById(_index: number, item: ItemLedger): string {
    return item.id;
  }
}
