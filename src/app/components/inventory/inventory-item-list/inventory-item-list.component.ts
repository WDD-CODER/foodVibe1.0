import { Component, OnDestroy, inject, ChangeDetectionStrategy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ItemLedger } from '../../../core/models/ingredient.model';
import { FormsModule } from '@angular/forms';
import { ItemDataService } from '../../../core/services/ingredient-data.service';
interface FilterOption {
  label: string;
  value: string;
  checked: boolean;
}

interface FilterCategory {
  name: string;
  options: FilterOption[];
}

@Component({
  selector: 'inventory-item-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-item-list.component.html',
  styleUrl: './inventory-item-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryItemListComponent implements OnDestroy {
  private readonly itemDataService = inject(ItemDataService);

  protected filteredItems = signal<ItemLedger[]>([]);
  protected filterCategories = signal<FilterCategory[]>([]);

  constructor() {
    effect(() => {
      const items = this.itemDataService.allItems();
      this.filteredItems.set(items);
      this.generateFilterCategories(items);
    });
  }

  ngOnDestroy(): void {
    // Cleanup handled by 'takeUntilDestroyed' if it were used, but effects clean up automatically.
  }

  private generateFilterCategories(items: ItemLedger[]): void {
    const categories: { [key: string]: Set<string> } = {};

    items.forEach(item => {
      // Collect allergen categories
      if (item.allergenIds) {
        if (!categories['Allergens']) categories['Allergens'] = new Set<string>();
        item.allergenIds.forEach(allergen => categories['Allergens'].add(allergen));
      }

      // Collect custom properties, including topCategory explicitly
      if (item.properties) {
        // Top Category
        if (item.properties.topCategory) {
          if (!categories['TopCategory']) categories['TopCategory'] = new Set<string>();
          categories['TopCategory'].add(item.properties.topCategory);
        }

        // Other dynamic properties (excluding subCategories as it's not a primary filter here)
        for (const key in item.properties) {
          if (item.properties.hasOwnProperty(key) && key !== 'topCategory' && key !== 'subCategories') {
            const value = item.properties[key];
            if (Array.isArray(value)) {
              if (!categories[key]) categories[key] = new Set<string>();
              value.forEach(prop => categories[key].add(prop));
            } else if (typeof value === 'string') {
              // This case handles if a property value is a single string instead of an array
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

  protected applyFilters(): void {
    const selectedFilters: { [key: string]: string[] } = {};

    this.filterCategories().forEach(category => {
      const checkedOptions = category.options.filter(option => option.checked).map(option => option.value);
      if (checkedOptions.length > 0) {
        selectedFilters[category.name] = checkedOptions;
      }
    });

    const allItems = this.itemDataService.allItems();

    if (Object.keys(selectedFilters).length === 0) {
      this.filteredItems.set(allItems); // No filters selected, show all
      return;
    }

    const filtered = allItems.filter(item => {
      return Object.keys(selectedFilters).every(categoryName => {
        let itemPropertyValues: string[] = [];

        if (categoryName === 'Allergens') {
          itemPropertyValues = item.allergenIds || [];
        } else if (categoryName === 'TopCategory') {
          itemPropertyValues = item.properties?.topCategory ? [item.properties.topCategory] : [];
        } else if (item.properties && item.properties[categoryName]) {
          const propValue = item.properties[categoryName];
          itemPropertyValues = Array.isArray(propValue) ? propValue : [propValue as string];
        }

        return selectedFilters[categoryName].some(filterValue =>
          itemPropertyValues.includes(filterValue)
        );
      });
    });
    this.filteredItems.set(filtered);
  }
}
