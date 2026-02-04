import { Component, OnDestroy, inject, ChangeDetectionStrategy, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import type { ItemLedger } from '@models/ingredient.model';
import { FilterCategory } from '@models/filter-category.model';
import { FilterOption } from '@models/filter-option.model';
import { ItemDataService } from '@services/items-data.service';

@Component({
  selector: 'inventory-item-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './inventory-item-list.component.html',
  styleUrl: './inventory-item-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryItemListComponent implements OnDestroy {
  private readonly itemDataService = inject(ItemDataService);

  // Source Signals
  protected activeFilters_ = signal<Record<string, string[]>>({});
  protected filterCategories = signal<FilterCategory[]>([]);

  // Computed Signal: The Single Source of Truth for the UI list [cite: 3, 282]
  protected filteredItems_ = computed(() => {
    const items = this.itemDataService.allItems_();
    const filters = this.activeFilters_();

    if (Object.keys(filters).length === 0) return items;

    return items.filter(item => {
      return Object.entries(filters).every(([category, selectedValues]) => {
        let itemValues: string[] = [];
        
        if (category === 'Allergens') {
          itemValues = item.allergenIds || [];
        } else if (category === 'TopCategory') {
          itemValues = item.properties?.topCategory ? [item.properties.topCategory] : [];
        } else {
          const val = item.properties?.[category];
          itemValues = Array.isArray(val) ? val : val ? [val] : [];
        }
        
        return selectedValues.some(v => itemValues.includes(v));
      });
    });
  });

  constructor() {
    // Effect to handle dynamic filter category generation when data arrives [cite: 280, 281]
    effect(() => {
      const items = this.itemDataService.allItems_();
      this.generateFilterCategories(items);
    });
  }

  public setFilters(filters: Record<string, string[]>): void {
    this.activeFilters_.set(filters);
  }

  protected toggleFilter(categoryName: string, optionValue: string): void {
    this.activeFilters_.update(prev => {
      const current = { ...prev };
      const values = current[categoryName] || [];

      if (values.includes(optionValue)) {
        current[categoryName] = values.filter(v => v !== optionValue);
        if (current[categoryName].length === 0) delete current[categoryName];
      } else {
        current[categoryName] = [...values, optionValue];
      }
      return current;
    });
  }

  private generateFilterCategories(items: ItemLedger[]): void {
    const categories: { [key: string]: Set<string> } = {};

    items.forEach(item => {
      if (item.allergenIds) {
        if (!categories['Allergens']) categories['Allergens'] = new Set<string>();
        item.allergenIds.forEach(allergen => categories['Allergens'].add(allergen));
      }

      if (item.properties) {
        if (item.properties.topCategory) {
          if (!categories['TopCategory']) categories['TopCategory'] = new Set<string>();
          categories['TopCategory'].add(item.properties.topCategory);
        }

        for (const key in item.properties) {
          if (item.properties.hasOwnProperty(key) && key !== 'topCategory' && key !== 'subCategories') {
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
          options: Array.from(categories[categoryName]).map((option: string) => ({
            label: option,
            value: option,
            checked_: false, // Follows Signal state marker convention
          })),
        });
      }
    }
    this.filterCategories.set(filterCategories);
  }

  protected applyFilters(): void {
    const selectedFilters: Record<string, string[]> = {};

    this.filterCategories().forEach((category: FilterCategory) => {
      const checkedOptions = category.options
        .filter((option: FilterOption) => option.checked_)
        .map((option: FilterOption) => option.value);

      if (checkedOptions.length > 0) {
        selectedFilters[category.name] = checkedOptions;
      }
    });

    // Updating this signal triggers the 'filteredItems_' computed logic automatically [cite: 333]
    this.activeFilters_.set(selectedFilters);
  }

  ngOnDestroy(): void {}
}