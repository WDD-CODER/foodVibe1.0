import { Injectable, inject } from '@angular/core';
import { KitchenStateService } from './kitchen-state.service';
import { Recipe } from '../models/recipe.model';
import { FlatPrepItem, MiseCategory } from '../models/recipe.model';

export interface ScaledIngredientRow {
  name: string;
  amount: number;
  unit: string;
  /** Available units for this ingredient (product/recipe options). */
  availableUnits: string[];
  /** Original ingredient referenceId for tracking. */
  referenceId: string;
  /** Original ingredient type. */
  type: 'product' | 'recipe';
}

export interface ScaledPrepRow {
  name: string;
  amount: number;
  unit: string;
  category_name?: string;
}

@Injectable({ providedIn: 'root' })
export class ScalingService {
  private readonly kitchenState_ = inject(KitchenStateService);

  /**
   * Scale factor for a recipe: targetQuantity / recipe yield.
   * Guard against zero yield.
   */
  getScaleFactor(recipe: Recipe, targetQuantity: number): number {
    const base = recipe.yield_amount_ ?? 1;
    if (base <= 0) return 1;
    return targetQuantity / base;
  }

  /**
   * Scaled ingredients with display names from KitchenState.
   */
  getScaledIngredients(recipe: Recipe, factor: number): ScaledIngredientRow[] {
    const ingredients = recipe.ingredients_ ?? [];
    const products = this.kitchenState_.products_();
    const recipes = this.kitchenState_.recipes_();

    return ingredients.map(ing => {
      const isProduct = ing.type === 'product';
      const item = isProduct
        ? products.find(p => p._id === ing.referenceId)
        : recipes.find(r => r._id === ing.referenceId);
      const name = (item as { name_hebrew?: string } | undefined)?.name_hebrew ?? '(לא נמצא)';
      const units = this.getAvailableUnitsForIngredient(item, ing.unit_ ?? '');
      return {
        name,
        amount: (ing.amount_ ?? 0) * factor,
        unit: ing.unit_ ?? '',
        availableUnits: units,
        referenceId: ing.referenceId,
        type: ing.type
      };
    });
  }

  private getAvailableUnitsForIngredient(item: unknown, currentUnit: string): string[] {
    const units = new Set<string>();
    if (currentUnit) units.add(currentUnit);
    if (!item) return Array.from(units);
    const meta = item as { base_unit_?: string; purchase_options_?: { unit_symbol_?: string }[]; unit_options_?: { unit_symbol_?: string }[]; yield_unit_?: string };
    if (meta.base_unit_) units.add(meta.base_unit_);
    if (meta.purchase_options_?.length) {
      meta.purchase_options_.forEach(o => { if (o.unit_symbol_) units.add(o.unit_symbol_); });
    }
    if (meta.unit_options_?.length) {
      meta.unit_options_.forEach(o => { if (o.unit_symbol_) units.add(o.unit_symbol_); });
    }
    if (meta.yield_unit_) units.add(meta.yield_unit_);
    return Array.from(units);
  }

  /**
   * Scaled prep items for dishes (prep_items_ and mise_categories_).
   */
  getScaledPrepItems(recipe: Recipe, factor: number): ScaledPrepRow[] {
    const rows: ScaledPrepRow[] = [];

    if (recipe.prep_items_?.length) {
      recipe.prep_items_.forEach(p => {
        rows.push({
          name: p.preparation_name,
          amount: (p.quantity ?? 0) * factor,
          unit: p.unit ?? 'unit',
          category_name: p.category_name
        });
      });
    }

    if (recipe.mise_categories_?.length) {
      recipe.mise_categories_.forEach((cat: MiseCategory) => {
        (cat.items ?? []).forEach(it => {
          rows.push({
            name: it.item_name,
            amount: (it.quantity ?? 0) * factor,
            unit: it.unit ?? 'unit',
            category_name: cat.category_name
          });
        });
      });
    }

    return rows;
  }
}
