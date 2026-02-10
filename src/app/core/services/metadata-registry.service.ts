import { Injectable, signal, computed, inject } from '@angular/core';
import { ProductDataService } from './product-data.service';

@Injectable({ providedIn: 'root' })
export class MetadataRegistryService {
  private readonly productDataService = inject(ProductDataService);

  // LOGIC CHANGE: Standardized English keys for Allergens
  private readonly allergens_ = signal<string[]>([
    'gluten', 'eggs', 'peanuts', 'nuts', 'soy', 'dairy', 'sesame'
  ]);

  // LOGIC CHANGE: Standardized English keys for Categories
  private readonly categories_ = signal<string[]>([
    'vegetables', 'dairy', 'meat', 'dry', 'fish'
  ]);
  
  private readonly globalUnits_ = signal<Record<string, number>>({
    'kg': 1000,
    'liter': 1000,
    'gram': 1,
    'ml': 1,
    'unit': 1
  });

  // Exposes keys for the UI to consume via the TranslatePipe
  allUnitKeys_ = computed(() => Object.keys(this.globalUnits_()));

  async purgeGlobalUnit(unitSymbol: string): Promise<void> {
    const affectedProducts = this.productDataService.allProducts_()
      .filter(p => p.base_unit_ === unitSymbol);

    // LOGIC CHANGE: Standardized fallback to English 'gram' [cite: 407, 413]
    for (const p of affectedProducts) {
      await this.productDataService.updateProduct({ ...p, base_unit_: 'gram' });
    }
  }

  allAllergens_ = computed(() => this.allergens_());
  allCategories_ = computed(() => this.categories_());

  registerAllergen(name: string): void {
    if (!this.allergens_().includes(name)) {
      this.allergens_.update(list => [...list, name]);
    }
  }

  registerCategory(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!this.categories_().includes(trimmed)) {
      this.categories_.update(list => [...list, trimmed]);
    }
  }

  deleteAllergen(name: string): void {
    this.allergens_.update(list => list.filter(a => a !== name));
  }

  deleteCategory(name: string): void {
    this.categories_.update(list => list.filter(c => c !== name));
  }
}