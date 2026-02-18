import { Component, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { KitchenStateService } from '@services/kitchen-state.service';
import { RecipeCostService } from '@services/recipe-cost.service';
import { TranslationService } from '@services/translation.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { Recipe } from '@models/recipe.model';
import { Product } from '@models/product.model';

export type SortField = 'name' | 'type' | 'cost' | 'approved' | 'station' | 'main_category' | 'allergens';

const MAX_ALLERGEN_RECURSION = 5;

@Component({
  selector: 'recipe-book-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, ClickOutSideDirective],
  templateUrl: './recipe-book-list.component.html',
  styleUrl: './recipe-book-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeBookListComponent {
  private readonly kitchenState = inject(KitchenStateService);
  private readonly router = inject(Router);
  private readonly recipeCostService = inject(RecipeCostService);
  private readonly translationService = inject(TranslationService);

  protected activeFilters_ = signal<Record<string, string[]>>({});
  protected searchQuery_ = signal<string>('');
  protected sortBy_ = signal<SortField | null>(null);
  protected sortOrder_ = signal<'asc' | 'desc'>('asc');
  protected isSidebarOpen_ = signal<boolean>(false);
  protected allergenPopoverRecipeId_ = signal<string | null>(null);

  protected filterCategories_ = computed(() => {
    const recipes = this.kitchenState.recipes_();
    const filters = this.activeFilters_();
    const categories: Record<string, Set<string>> = {};

    recipes.forEach(recipe => {
      const isDish = this.isRecipeDish(recipe);
      const typeVal = isDish ? 'dish' : 'preparation';
      if (!categories['Type']) categories['Type'] = new Set();
      categories['Type'].add(typeVal);

      const allergens = this.getRecipeAllergens(recipe);
      allergens.forEach(a => {
        if (!categories['Allergens']) categories['Allergens'] = new Set();
        categories['Allergens'].add(a);
      });
    });

    if (!categories['Main-category']) categories['Main-category'] = new Set(['no_category']);

    return Object.keys(categories).map(name => ({
      name,
      options: Array.from(categories[name]).map(option => ({
        label: option,
        value: option,
        checked_: (filters[name] || []).includes(option)
      }))
    }));
  });

  protected filteredRecipes_ = computed(() => {
    let recipes = this.kitchenState.recipes_();
    const filters = this.activeFilters_();
    const search = this.searchQuery_().trim().toLowerCase();
    const sortBy = this.sortBy_();
    const sortOrder = this.sortOrder_();

    if (Object.keys(filters).length > 0) {
      recipes = recipes.filter(recipe => {
        return Object.entries(filters).every(([category, selectedValues]) => {
          let recipeValues: string[] = [];
          if (category === 'Type') {
            recipeValues = [this.isRecipeDish(recipe) ? 'dish' : 'preparation'];
          } else if (category === 'Allergens') {
            recipeValues = this.getRecipeAllergens(recipe);
          } else if (category === 'Main-category') {
            recipeValues = ['no_category'];
          }
          return selectedValues.some(v => recipeValues.includes(v));
        });
      });
    }

    if (search) {
      recipes = recipes.filter(r => (r.name_hebrew ?? '').toLowerCase().includes(search));
    }

    if (sortBy) {
      recipes = [...recipes].sort((a, b) => {
        const cmp = this.compareRecipes(a, b, sortBy);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return recipes;
  });

  protected isRecipeDish(recipe: Recipe): boolean {
    return recipe.recipe_type_ === 'dish' || !!(recipe.prep_items_?.length || recipe.mise_categories_?.length);
  }

  protected getRecipeAllergens(recipe: Recipe, depth = 0): string[] {
    if (depth >= MAX_ALLERGEN_RECURSION || !recipe?.ingredients_?.length) return [];
    const set = new Set<string>();
    const products = this.kitchenState.products_();
    const recipes = this.kitchenState.recipes_();

    for (const ing of recipe.ingredients_) {
      if (ing.type === 'product') {
        const product = products.find(p => p._id === ing.referenceId) as Product | undefined;
        (product?.allergens_ || []).forEach(a => set.add(a));
      } else if (ing.type === 'recipe') {
        const subRecipe = recipes.find(r => r._id === ing.referenceId);
        if (subRecipe) {
          this.getRecipeAllergens(subRecipe, depth + 1).forEach(a => set.add(a));
        }
      }
    }
    return Array.from(set);
  }

  private compareRecipes(a: Recipe, b: Recipe, field: SortField): number {
    const hebrewCompare = (x: string, y: string) => (x || '').localeCompare(y || '', 'he');
    switch (field) {
      case 'name':
        return hebrewCompare(a.name_hebrew || '', b.name_hebrew || '');
      case 'type': {
        const aType = this.isRecipeDish(a) ? 'dish' : 'preparation';
        const bType = this.isRecipeDish(b) ? 'dish' : 'preparation';
        return hebrewCompare(
          this.translationService.translate(aType),
          this.translationService.translate(bType)
        );
      }
      case 'cost':
        return this.recipeCostService.computeRecipeCost(a) - this.recipeCostService.computeRecipeCost(b);
      case 'approved':
        return (a.is_approved_ ? 1 : 0) - (b.is_approved_ ? 1 : 0);
      case 'station':
        return hebrewCompare(a.default_station_ || '', b.default_station_ || '');
      case 'main_category':
        return 0;
      case 'allergens': {
        const aAll = this.getRecipeAllergens(a);
        const bAll = this.getRecipeAllergens(b);
        const aVal = this.translationService.translate((aAll[0] ?? '') as string);
        const bVal = this.translationService.translate((bAll[0] ?? '') as string);
        return hebrewCompare(aVal, bVal);
      }
      default:
        return 0;
    }
  }

  protected setSort(field: SortField): void {
    const current = this.sortBy_();
    if (current === field) {
      this.sortOrder_.update(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy_.set(field);
      this.sortOrder_.set('asc');
    }
  }

  protected sortIconFor_(field: SortField): 'arrow-up' | 'arrow-down' | 'arrow-up-down' {
    const current = this.sortBy_();
    if (current !== field) return 'arrow-up-down';
    return this.sortOrder_() === 'asc' ? 'arrow-up' : 'arrow-down';
  }

  protected toggleSidebar(): void {
    this.isSidebarOpen_.update(v => !v);
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

  protected toggleAllergenPopover(recipeId: string): void {
    this.allergenPopoverRecipeId_.update(id => (id === recipeId ? null : recipeId));
  }

  protected closeAllergenPopover(): void {
    this.allergenPopoverRecipeId_.set(null);
  }

  protected onAddRecipe(): void {
    this.router.navigate(['/recipe-builder']);
  }

  protected onEditRecipe(recipe: Recipe): void {
    this.router.navigate(['/recipe-builder', recipe._id]);
  }

  protected onDeleteRecipe(recipe: Recipe): void {
    if (confirm('האם אתה בטוח שברצונך למחוק?')) {
      this.kitchenState.deleteRecipe(recipe).subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  protected getRecipeCost(recipe: Recipe): number {
    return this.recipeCostService.computeRecipeCost(recipe);
  }
}
