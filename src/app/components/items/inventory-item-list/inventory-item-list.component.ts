import { Component, OnDestroy, inject, ChangeDetectionStrategy, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ItemLedger } from '../../../core/models/ingredient.model';
import { FormsModule } from '@angular/forms';
import { ItemDataService } from '../../../core/services/items-data.service';
import { FilterCategory } from '../../../core/models/filter-category.model';



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

  protected activeFilters_ = signal<Record<string, string[]>>({});
  public setFilters(filters: Record<string, string[]>): void {
    this.activeFilters_.set(filters);
  }


  protected filteredItems = signal<ItemLedger[]>([]);
  protected filterCategories = signal<FilterCategory[]>([]);


  protected filteredItems_ = computed(() => {
    const items = this.itemDataService.allItems_();
    const filters = this.activeFilters_();
    
    if (Object.keys(filters).length === 0) return items;

    return items.filter(item => {
      return Object.entries(filters).every(([category, selectedValues]) => {
        let itemValues: string[] = [];
        if (category === 'Allergens') itemValues = item.allergenIds || [];
        else if (category === 'TopCategory') itemValues = item.properties?.topCategory ? [item.properties.topCategory] : [];
        else {
          const val = item.properties?.[category];
          itemValues = Array.isArray(val) ? val : val ? [val] : [];
        }
        return selectedValues.some(v => itemValues.includes(v));
      });
    });
  });

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


  constructor() {
    effect(() => {
      const items = this.itemDataService.allItems_();
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

    const allItems_ = this.itemDataService.allItems_();

    if (Object.keys(selectedFilters).length === 0) {
      this.filteredItems.set(allItems_); // No filters selected, show all
      return;
    }

    const filtered = allItems_.filter(item => {
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
