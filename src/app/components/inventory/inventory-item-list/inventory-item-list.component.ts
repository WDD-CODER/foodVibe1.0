import { Component, OnDestroy, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { IngredientLedger } from '../../../core/models/ingredient.model';
import { FormsModule } from '@angular/forms';
import { IngredientDataService } from '../../../core/services/ingredient-data.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  selector: 'app-inventory-item-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-item-list.component.html',
  styleUrl: './inventory-item-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryItemListComponent implements OnDestroy {
  private readonly ingredientDataService = inject(IngredientDataService);

  protected filteredIngredients = signal<IngredientLedger[]>([]);
  protected filterCategories = signal<FilterCategory[]>([]);

  constructor() {
    this.ingredientDataService.allIngredients.pipe(takeUntilDestroyed()).subscribe(ingredients => {
      this.filteredIngredients.set(ingredients);
      this.generateFilterCategories(ingredients);
    });
  }

  ngOnDestroy(): void {
    // 'takeUntilDestroyed' handles cleanup, so explicit ngOnDestroy is not strictly necessary for subscriptions.
  }

  private generateFilterCategories(ingredients: IngredientLedger[]): void {
    const categories: { [key: string]: Set<string> } = {};

    ingredients.forEach(ingredient => {
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

    const allIngredients = this.ingredientDataService.allIngredients();

    if (Object.keys(selectedFilters).length === 0) {
      this.filteredIngredients.set(allIngredients); // No filters selected, show all
      return;
    }

    const filtered = allIngredients.filter(ingredient => {
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
