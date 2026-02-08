import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MetadataRegistryService {
  // Global source for allergens 
  private allergens_ = signal<string[]>([
    'גלוטן', 'ביצים', 'בוטנים', 'אגוזים', 'סויה', 'חלב', 'שומשום'
  ]);

  // Global source for categories [cite: 1, 283]
  private categories_ = signal<string[]>([
    'ירקות', 'חלבי', 'בשר', 'יבש', 'דגים'
  ]);

  allAllergens_ = computed(() => this.allergens_());
  allCategories_ = computed(() => this.categories_());

  registerAllergen(name: string): void {
    if (!this.allergens_().includes(name)) {
      this.allergens_.update(list => [...list, name]);
    }
  }
}