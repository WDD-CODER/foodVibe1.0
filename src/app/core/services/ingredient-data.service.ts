import { Injectable, signal } from '@angular/core';
import type { IngredientLedger, TripleUnitConversion } from '../../core/models/ingredient.model';

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

@Injectable({ providedIn: 'root' })
export class IngredientDataService {
  private ingredientsStore = signal<IngredientLedger[]>([
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
      properties: { topCategory: ['Grain'], subCategories: ['Baking'], type: ['all-purpose'] }
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
  ]);

  readonly allIngredients = this.ingredientsStore.asReadonly();
  readonly filterCategories = signal<FilterCategory[]>([]);

  constructor() {
    this.generateFilterCategories();
  }

  private generateFilterCategories(): void {
    const categories: { [key: string]: Set<string> } = {};

    this.ingredientsStore().forEach(ingredient => {
      if (ingredient.allergenIds) {
        if (!categories['Allergens']) categories['Allergens'] = new Set<string>();
        ingredient.allergenIds.forEach(allergen => categories['Allergens'].add(allergen));
      }

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

  getIngredientById(id: string): IngredientLedger | undefined {
    return this.ingredientsStore().find(i => i.id === id);
  }

  addIngredient(newIngredient: IngredientLedger): void {
    this.ingredientsStore.update(ingredients => [...ingredients, newIngredient]);
    this.generateFilterCategories(); // Re-generate filters after adding an ingredient
  }

  updateIngredient(updatedIngredient: IngredientLedger): void {
    this.ingredientsStore.update(ingredients =>
      ingredients.map(ing => (ing.id === updatedIngredient.id ? updatedIngredient : ing))
    );
    this.generateFilterCategories(); // Re-generate filters after updating an ingredient
  }

  deleteIngredient(id: string): void {
    this.ingredientsStore.update(ingredients => ingredients.filter(ing => ing.id !== id));
    this.generateFilterCategories(); // Re-generate filters after deleting an ingredient
  }
}
