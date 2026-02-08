import { Injectable, signal, computed, inject } from '@angular/core';
import { ProductDataService } from './product-data.service';

@Injectable({ providedIn: 'root' })
export class MetadataRegistryService {
productDataService = inject(ProductDataService)

  private allergens_ = signal<string[]>([
    'גלוטן', 'ביצים', 'בוטנים', 'אגוזים', 'סויה', 'חלב', 'שומשום'
  ]);

  private categories_ = signal<string[]>([
    'ירקות', 'חלבי', 'בשר', 'יבש', 'דגים'
  ]);


  async purgeGlobalUnit(unitSymbol: string): Promise<void> {
  const affectedProducts = this.productDataService.allProducts_()
    .filter(p => p.base_unit_ === unitSymbol);
    
  // Strategy: Either reset to 'grams' or flag for Chef Approval
  for (const p of affectedProducts) {
    await this.productDataService.updateProduct({ ...p, base_unit_: 'גרם' });
  }
}

  allAllergens_ = computed(() => this.allergens_());
  allCategories_ = computed(() => this.categories_());

  registerAllergen(name: string): void {
    if (!this.allergens_().includes(name)) {
      this.allergens_.update(list => [...list, name]);
    }
  }
}