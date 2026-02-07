import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { ItemLedger } from '@models/ingredient.model';
import { IngredientService } from '@services/ingredient.service';

@Component({
  selector: 'ingredient-ledger',
  standalone: true,
  templateUrl: 'ingredient-ledger.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IngredientLedgerComponent {
  protected readonly ingredientService = inject(IngredientService);

  trackById(_index: number, item: ItemLedger): string {
    return item._id;
  }
}
