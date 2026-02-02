import { Injectable, signal } from '@angular/core';
import type { ItemLedger, TripleUnitConversion } from '../models/ingredient.model';

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
export class ItemDataService {
  private itemsStore = signal<ItemLedger[]>([
    {
      id: 'item_001',
      itemName: 'Tomato',
      units: defaultUnitConversion,
      allergenIds: [],
      properties: { topCategory: 'Vegetable', subCategories: ['Produce'], color: ['red'], season: ['summer'] }
    },
    {
      id: 'item_002',
      itemName: 'Chicken Breast',
      units: defaultUnitConversion,
      allergenIds: [],
      properties: { topCategory: 'Meat', subCategories: ['Poultry'], diet: ['keto', 'protein-rich'] }
    },
    {
      id: 'item_003',
      itemName: 'Flour',
      units: defaultUnitConversion,
      allergenIds: ['gluten'],
      properties: { topCategory: 'Grain', subCategories: ['Baking'], type: ['all-purpose'] }
    },
    {
      id: 'item_004',
      itemName: 'Milk',
      units: defaultUnitConversion,
      allergenIds: ['dairy'],
      properties: { topCategory: 'Dairy', subCategories: ['Liquids'], type: ['full-fat'] }
    },
    {
      id: 'item_005',
      itemName: 'Salmon',
      units: defaultUnitConversion,
      allergenIds: ['fish'],
      properties: { topCategory: 'Fish', subCategories: ['Seafood'], diet: ['omega-rich'] }
    },
    {
      id: 'item_006',
      itemName: 'Carrot',
      units: defaultUnitConversion,
      allergenIds: [],
      properties: { topCategory: 'Vegetable', subCategories: ['Root'], color: ['orange'], season: ['autumn'] }
    },
    {
      id: 'item_007',
      itemName: 'Egg',
      units: defaultUnitConversion,
      allergenIds: ['egg'],
      properties: { topCategory: 'Dairy', subCategories: ['Protein'] }
    },
    {
      id: 'item_008',
      itemName: 'Rice',
      units: defaultUnitConversion,
      allergenIds: [],
      properties: { topCategory: 'Grain', subCategories: ['Rice'], type: ['basmati'] }
    },
  ]);

  readonly allItems = this.itemsStore.asReadonly();
  readonly filterCategories = signal<FilterCategory[]>([]);

  // Demo global data for autocomplete/multi-select
  readonly allAllergens = signal<string[]>(['Gluten', 'Dairy', 'Fish', 'Egg', 'Peanuts', 'Soy', 'Tree Nuts', 'Shellfish']);
  readonly allPropertyKeys = signal<string[]>(['TopCategory', 'SubCategories', 'Color', 'Season', 'Diet', 'Type']);
  readonly allTopCategories = signal<string[]>(['Vegetable', 'Meat', 'Grain', 'Dairy', 'Fish']);

  constructor() {
    this.generateFilterCategories();
  }

  private generateFilterCategories(): void {
    const categories: { [key: string]: Set<string> } = {};

    this.itemsStore().forEach(item => {
      // Collect allergen categories
      if (item.allergenIds) {
        if (!categories['Allergens']) categories['Allergens'] = new Set<string>();
        item.allergenIds.forEach(allergen => categories['Allergens'].add(allergen));
      }

      // Collect custom properties
      if (item.properties) {
        for (const key in item.properties) {
          if (item.properties.hasOwnProperty(key)) {
            const value = item.properties[key];
            if (Array.isArray(value)) {
              if (!categories[key]) categories[key] = new Set<string>();
              value.forEach(prop => categories[key].add(prop));
            } else if (typeof value === 'string') {
              if (!categories[key]) categories[key] = new Set<string>();
              categories[key].add(value);
            }
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

  getItemById(id: string): ItemLedger | undefined {
    return this.itemsStore().find(i => i.id === id);
  }

  addItem(newItem: ItemLedger): void {
    this.itemsStore.update(items => [...items, newItem]);
    this.generateFilterCategories();
  }

  updateItem(updatedItem: ItemLedger): void {
    this.itemsStore.update(items =>
      items.map(ing => (ing.id === updatedItem.id ? updatedItem : ing))
    );
    this.generateFilterCategories();
  }

  deleteItem(id: string): void {
    this.itemsStore.update(items => items.filter(ing => ing.id !== id));
    this.generateFilterCategories();
  }
}
