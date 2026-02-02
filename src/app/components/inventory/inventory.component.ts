import { Component, OnDestroy, inject, ChangeDetectionStrategy, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { IngredientLedger, TripleUnitConversion, UnitDescriptor, UnitConversion } from '../../core/models/ingredient.model';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs/operators';
import { combineLatest, Observable } from 'rxjs';

interface FilterOption {
  label: string;
  value: string;
  checked: boolean;
}

interface FilterCategory {
  name: string;
  options: FilterOption[];
}

const defaultUnitConversion: TripleUnitConversion = {
  purchase: { symbol: 'kg', label: 'Kilograms', factorToInventory: 1 },
  inventory: { symbol: 'kg', label: 'Kilograms', factorToInventory: 1 },
  recipe: { symbol: 'g', label: 'Grams', factorToInventory: 0.001 },
};

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryComponent implements OnDestroy {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  // Demo ingredient list
  private readonly allIngredients: IngredientLedger[] = [
    {
      id: 'ing_001',
      name: 'Tomato',
      units: defaultUnitConversion,
      allergenIds: [],
      properties: { topCategory: ['Vegetable'], subCategories: ['Produce'], color: ['red'], season: ['summer'] }
    },
    {
      id: 'ing_002',
      name: 'Chicken Breast',
      units: defaultUnitConversion,
      allergenIds: [],
      properties: { topCategory: ['Meat'], subCategories: ['Poultry'], diet: ['keto', 'protein-rich'] }
    },
    {
      id: 'ing_003',
      name: 'Flour',
      units: defaultUnitConversion,
      allergenIds: ['gluten'],
      properties: { category: ['grain'], type: ['all-purpose'] }
    },
    {
      id: 'ing_004',
      name: 'Milk',
      units: defaultUnitConversion,
      allergenIds: ['dairy'],
      properties: { topCategory: ['Dairy'], subCategories: ['Liquids'], type: ['full-fat'] }
    },
    {
      id: 'ing_005',
      name: 'Salmon',
      units: defaultUnitConversion,
      allergenIds: ['fish'],
      properties: { topCategory: ['Fish'], subCategories: ['Seafood'], diet: ['omega-rich'] }
    },
    {
      id: 'ing_006',
      name: 'Carrot',
      units: defaultUnitConversion,
      allergenIds: [],
      properties: { topCategory: ['Vegetable'], subCategories: ['Root'], color: ['orange'], season: ['autumn'] }
    },
    {
      id: 'ing_007',
      name: 'Egg',
      units: defaultUnitConversion,
      allergenIds: ['egg'],
      properties: { topCategory: ['Dairy'], subCategories: ['Protein'] }
    },
    {
      id: 'ing_008',
      name: 'Rice',
      units: defaultUnitConversion,
      allergenIds: [],
      properties: { topCategory: ['Grain'], subCategories: ['Rice'], type: ['basmati'] }
    },
  ];

  protected filteredIngredients = signal<IngredientLedger[]>(this.allIngredients);
  protected filterCategories = signal<FilterCategory[]>([]);

  constructor() {
    this.generateFilterCategories();
  }

  ngOnDestroy(): void {
    // Cleanup if any subscriptions were made, though none currently exist
  }

  private generateFilterCategories(): void {
    const categories: { [key: string]: Set<string> } = {};

    this.allIngredients.forEach(ingredient => {
      // Collect allergen categories
      if (ingredient.allergenIds) {
        if (!categories['Allergens']) categories['Allergens'] = new Set<string>();
        ingredient.allergenIds.forEach(allergen => categories['Allergens'].add(allergen));
      }

      // Collect custom properties
      if (ingredient.properties) {
        for (const key in ingredient.properties) {
          if (ingredient.properties.hasOwnProperty(key)) {
            if (!categories[key]) categories[key] = new Set<string>();
            ingredient.properties[key].forEach(prop => categories[key].add(prop));
          }
        }
      }
    });

    const filterCategories: FilterCategory[] = [];
    for (const categoryName in categories) {
      if (categories.hasOwnProperty(categoryName)) {
        filterCategories.push({
          name: categoryName,
          options: Array.from(categories[categoryName]).map(option => ({
            label: option,
            value: option,
            checked: false,
          })),
        });
      }
    }
    this.filterCategories.set(filterCategories);
  }

  protected applyFilters(): void {
    const selectedFilters: { [key: string]: string[] } = {};

    this.filterCategories().forEach(category => {
      const checkedOptions = category.options.filter(option => option.checked).map(option => option.value);
      if (checkedOptions.length > 0) {
        selectedFilters[category.name] = checkedOptions;
      }
    });

    if (Object.keys(selectedFilters).length === 0) {
      this.filteredIngredients.set(this.allIngredients); // No filters selected, show all
      return;
    }

    const filtered = this.allIngredients.filter(ingredient => {
      return Object.keys(selectedFilters).every(categoryName => {
        const ingredientPropertyValues = categoryName === 'Allergens'
          ? ingredient.allergenIds || []
          : (ingredient.properties && ingredient.properties[categoryName]) || [];

        return selectedFilters[categoryName].some(filterValue =>
          ingredientPropertyValues.includes(filterValue)
        );
      });
    });
    this.filteredIngredients.set(filtered);
  }
}
