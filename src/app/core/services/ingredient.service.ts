import { Injectable, signal } from '@angular/core';
import type { IngredientLedger } from '../models/ingredient.model';

@Injectable({ providedIn: 'root' })
export class IngredientService {
  private readonly state = signal<IngredientLedger[]>([]);

  /** Read-only signal of the current ingredient ledger list. */
  readonly ingredients = this.state.asReadonly();
}
