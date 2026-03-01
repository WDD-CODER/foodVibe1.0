import { Component, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { KitchenStateService } from '@services/kitchen-state.service';
import { RecipeCostService } from '@services/recipe-cost.service';
import { TranslationService } from '@services/translation.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';
import { ClickOutSideDirective } from '@directives/click-out-side';
import { Recipe } from '@models/recipe.model';
import { Product } from '@models/product.model';
import { VersionEntityType } from '@services/version-history.service';
import { VersionHistoryPanelComponent } from 'src/app/shared/version-history-panel/version-history-panel.component';
import { LoaderComponent } from 'src/app/shared/loader/loader.component';
import { ScrollableDropdownComponent } from 'src/app/shared/scrollable-dropdown/scrollable-dropdown.component';

export type SortField = 'name' | 'type' | 'cost' | 'labels' | 'allergens';

const MAX_ALLERGEN_RECURSION = 5;

@Component({
  selector: 'recipe-book-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, ClickOutSideDirective, VersionHistoryPanelComponent, LoaderComponent, ScrollableDropdownComponent],
  templateUrl: './recipe-book-list.component.html',
  styleUrl: './recipe-book-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeBookListComponent {
  private readonly kitchenState = inject(KitchenStateService);
  private readonly router = inject(Router);
  private readonly recipeCostService = inject(RecipeCostService);
  private readonly translationService = inject(TranslationService);
  private readonly metadataRegistry = inject(MetadataRegistryService);

  protected activeFilters_ = signal<Record<string, string[]>>({});
  protected searchQuery_ = signal<string>('');
  protected sortBy_ = signal<SortField | null>(null);
  protected sortOrder_ = signal<'asc' | 'desc'>('asc');
  protected isPanelOpen_ = signal<boolean>(true);
  protected expandedFilterCategories_ = signal<Set<string>>(new Set());
  protected allergenPopoverRecipeId_ = signal<string | null>(null);
  protected allergenExpandAll_ = signal<boolean>(false);
  protected hoveredCostRecipeId_ = signal<string | null>(null);
  protected tappedCostRecipeId_ = signal<string | null>(null);
  protected costTooltipAnchor_ = signal<DOMRect | null>(null);
  protected ingredientSearchQuery_ = signal<string>('');
  protected selectedProductIds_ = signal<string[]>([]);
  protected historyFor_ = signal<{ entityType: VersionEntityType; entityId: string; entityName: string } | null>(null);
  protected deletingId_ = signal<string | null>(null);

  protected categoryDisplayKey(internalName: string): string {
    const map: Record<string, string> = {
      'Labels': 'labels',
      'Type': 'type',
      'Allergens': 'allergens',
      'Approved': 'approved',
      'Station': 'station'
    };
    return map[internalName] ?? internalName.toLowerCase();
  }

  protected getAllRecipeLabels(recipe: Recipe): string[] {
    return [...new Set([...(recipe.labels_ ?? []), ...(recipe.autoLabels_ ?? [])])];
  }

  protected getLabelColor(key: string): string {
    return this.metadataRegistry.getLabelColor(key);
  }

  protected toggleFilterCategory(name: string): void {
    this.expandedFilterCategories_.update(set => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  protected isCategoryExpanded(name: string): boolean {
    return this.expandedFilterCategories_().has(name);
  }

  protected togglePanel(): void {
    this.isPanelOpen_.update(v => !v);
  }

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

      const recipeLabels = this.getAllRecipeLabels(recipe);
      if (recipeLabels.length > 0) {
        recipeLabels.forEach(l => {
          if (!categories['Labels']) categories['Labels'] = new Set();
          categories['Labels'].add(l);
        });
      } else {
        if (!categories['Labels']) categories['Labels'] = new Set();
        categories['Labels'].add('no_label');
      }

      if (!categories['Approved']) categories['Approved'] = new Set();
      categories['Approved'].add(recipe.is_approved_ ? 'true' : 'false');

      const station = (recipe.default_station_ || '').trim() || '_none';
      if (!categories['Station']) categories['Station'] = new Set();
      categories['Station'].add(station);
    });

    const optionLabel = (name: string, value: string): string => {
      if (name === 'Approved') return value === 'true' ? 'approved_yes' : 'approved_no';
      if (name === 'Station' && value === '_none') return 'no_station';
      return value;
    };

    return Object.keys(categories).map(name => ({
      name,
      displayKey: this.categoryDisplayKey(name),
      options: Array.from(categories[name]).map(option => ({
        label: optionLabel(name, option),
        value: option,
        checked_: (filters[name] || []).includes(option)
      }))
    }));
  });

  protected filteredProductsForIngredientSearch_ = computed(() => {
    const query = this.ingredientSearchQuery_().trim().toLowerCase();
    if (!query) return [];
    return this.kitchenState.products_().filter(p =>
      (p.name_hebrew ?? '').toLowerCase().includes(query)
    );
  });

  protected filteredRecipes_ = computed(() => {
    let recipes = this.kitchenState.recipes_();
    const filters = this.activeFilters_();
    const search = this.searchQuery_().trim().toLowerCase();
    const sortBy = this.sortBy_();
    const sortOrder = this.sortOrder_();
    const selectedIds = this.selectedProductIds_();

    if (Object.keys(filters).length > 0) {
      recipes = recipes.filter(recipe => {
        return Object.entries(filters).every(([category, selectedValues]) => {
          let recipeValues: string[] = [];
          if (category === 'Type') {
            recipeValues = [this.isRecipeDish(recipe) ? 'dish' : 'preparation'];
          } else if (category === 'Allergens') {
            recipeValues = this.getRecipeAllergens(recipe);
            // "Do not include allergens": show only recipes that have NONE of the selected allergens
            return selectedValues.every(v => !recipeValues.includes(v));
          } else if (category === 'Labels') {
            const labels = this.getAllRecipeLabels(recipe);
            recipeValues = labels.length > 0 ? labels : ['no_label'];
          } else if (category === 'Approved') {
            recipeValues = [recipe.is_approved_ ? 'true' : 'false'];
          } else if (category === 'Station') {
            const st = (recipe.default_station_ || '').trim() || '_none';
            recipeValues = [st];
          }
          return selectedValues.some(v => recipeValues.includes(v));
        });
      });
    }

    if (selectedIds.length > 0) {
      recipes = recipes.filter(r => this.recipeContainsAllProducts(r, selectedIds));
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

  protected activeCostTooltipRecipe_ = computed(() => {
    const id = this.hoveredCostRecipeId_() ?? this.tappedCostRecipeId_();
    return id ? this.filteredRecipes_().find(r => r._id === id) ?? null : null;
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

  protected getRecipeYieldDescription(recipe: Recipe): string {
    const amount = recipe.yield_amount_ ?? 1;
    const unit = recipe.yield_unit_ ? this.translationService.translate(recipe.yield_unit_) : '';
    return `${amount} ${unit}`.trim() || String(amount);
  }

  protected recipeContainsAllProducts(recipe: Recipe, productIds: string[]): boolean {
    if (productIds.length === 0) return true;
    const ids = this.getRecipeProductIds(recipe);
    return productIds.every(id => ids.has(id));
  }

  private getRecipeProductIds(recipe: Recipe, depth = 0): Set<string> {
    if (depth >= MAX_ALLERGEN_RECURSION || !recipe?.ingredients_?.length) return new Set();
    const set = new Set<string>();
    const recipes = this.kitchenState.recipes_();
    for (const ing of recipe.ingredients_) {
      if (ing.type === 'product') {
        set.add(ing.referenceId);
      } else if (ing.type === 'recipe') {
        const sub = recipes.find(r => r._id === ing.referenceId);
        if (sub) this.getRecipeProductIds(sub, depth + 1).forEach(id => set.add(id));
      }
    }
    return set;
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
      case 'labels': {
        const aLabels = this.getAllRecipeLabels(a);
        const bLabels = this.getAllRecipeLabels(b);
        const aStr = aLabels.length > 0 ? aLabels.map(l => this.translationService.translate(l)).join(', ') : '';
        const bStr = bLabels.length > 0 ? bLabels.map(l => this.translationService.translate(l)).join(', ') : '';
        return hebrewCompare(aStr, bStr);
      }
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

  protected toggleAllergenExpandAll(): void {
    this.allergenExpandAll_.update(v => !v);
    this.allergenPopoverRecipeId_.set(null);
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

  protected clearAllFilters(): void {
    this.activeFilters_.set({});
  }

  protected hasActiveFilters_ = computed(() =>
    Object.values(this.activeFilters_()).some(arr => arr.length > 0)
  );

  protected selectedCountInCategory(category: { options: { checked_: boolean }[] }): number {
    return category.options.filter(o => o.checked_).length;
  }

  protected toggleAllergenPopover(recipeId: string): void {
    this.allergenExpandAll_.set(false);
    this.allergenPopoverRecipeId_.update(id => (id === recipeId ? null : recipeId));
  }

  protected closeAllergenPopover(): void {
    this.allergenPopoverRecipeId_.set(null);
  }

  /** Close allergen chips view (single row or expand-all) on outside click; restores allergy icon. */
  protected closeAllergenView(clickTarget?: EventTarget | null): void {
    const el = clickTarget instanceof HTMLElement ? clickTarget : null;
    if (el?.closest('.table-header .col-allergens')) return;
    this.allergenPopoverRecipeId_.set(null);
    this.allergenExpandAll_.set(false);
  }

  protected showCostTooltip(recipeId: string, event?: Event): void {
    const el = event?.currentTarget as HTMLElement | undefined;
    if (el) this.costTooltipAnchor_.set(el.getBoundingClientRect());
    this.hoveredCostRecipeId_.set(recipeId);
  }

  protected hideCostTooltip(): void {
    this.hoveredCostRecipeId_.set(null);
    if (!this.tappedCostRecipeId_()) this.costTooltipAnchor_.set(null);
  }

  protected toggleCostTooltipTap(recipeId: string, event?: Event): void {
    const wasOpen = this.tappedCostRecipeId_() === recipeId;
    this.tappedCostRecipeId_.update(id => (id === recipeId ? null : recipeId));
    if (!wasOpen && recipeId) {
      const el = event?.currentTarget as HTMLElement | undefined;
      if (el) this.costTooltipAnchor_.set(el.getBoundingClientRect());
    } else if (!this.tappedCostRecipeId_() && !this.hoveredCostRecipeId_()) {
      this.costTooltipAnchor_.set(null);
    }
  }

  protected closeCostTooltipTap(): void {
    this.tappedCostRecipeId_.set(null);
    if (!this.hoveredCostRecipeId_()) this.costTooltipAnchor_.set(null);
  }

  protected addIngredientProduct(product: Product): void {
    if (this.selectedProductIds_().includes(product._id)) return;
    this.selectedProductIds_.update(ids => [...ids, product._id]);
    this.ingredientSearchQuery_.set('');
  }

  protected removeIngredientProduct(productId: string): void {
    this.selectedProductIds_.update(ids => ids.filter(id => id !== productId));
  }

  protected clearIngredientProducts(): void {
    this.selectedProductIds_.set([]);
  }

  protected getSelectedProducts(): Product[] {
    const ids = this.selectedProductIds_();
    return this.kitchenState.products_().filter(p => ids.includes(p._id));
  }

  protected onAddRecipe(): void {
    this.router.navigate(['/recipe-builder']);
  }

  protected onEditRecipe(recipe: Recipe): void {
    this.router.navigate(['/recipe-builder', recipe._id]);
  }

  protected openHistory(recipe: Recipe): void {
    const entityType: VersionEntityType = this.isRecipeDish(recipe) ? 'dish' : 'recipe';
    this.historyFor_.set({ entityType, entityId: recipe._id, entityName: recipe.name_hebrew });
  }

  protected closeHistory(): void {
    this.historyFor_.set(null);
  }

  protected onCookRecipe(recipe: Recipe): void {
    this.router.navigate(['/cook', recipe._id]);
  }

  protected onRowClick(recipe: Recipe, event: MouseEvent): void {
    const el = event.target as HTMLElement;
    if (el.closest('button') || el.closest('a') || el.closest('.cost-cell-wrap') || el.closest('.allergen-btn-wrapper')) return;
    this.router.navigate(['/cook', recipe._id]);
  }

  protected onDeleteRecipe(recipe: Recipe): void {
    if (confirm('האם אתה בטוח שברצונך למחוק?')) {
      this.deletingId_.set(recipe._id);
      this.kitchenState.deleteRecipe(recipe).subscribe({
        next: () => { this.deletingId_.set(null); },
        error: () => { this.deletingId_.set(null); }
      });
    }
  }

  protected getRecipeCost(recipe: Recipe): number {
    return this.recipeCostService.computeRecipeCost(recipe);
  }
}
