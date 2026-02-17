import { Injectable, inject } from '@angular/core';
import { KitchenStateService } from './kitchen-state.service';
import { UnitRegistryService } from './unit-registry.service';
import { Recipe } from '../models/recipe.model';
import { Product } from '../models/product.model';
import { Ingredient } from '../models/ingredient.model';

const MAX_RECURSION_DEPTH = 5;

/** Normalizes unit keys for conversion lookup (e.g. 'gr' -> 'gram'). */
const UNIT_ALIASES: Record<string, string> = {
  gr: 'gram',
  grams: 'gram',
  g: 'gram',
  kg: 'kg',
  liter: 'liter',
  l: 'liter',
  ml: 'ml',
  unit: 'unit'
};

@Injectable({ providedIn: 'root' })
export class RecipeCostService {
  private readonly kitchenState_ = inject(KitchenStateService);
  private readonly unitRegistry_ = inject(UnitRegistryService);

  /**
   * Computes the total cost of a recipe from its ingredients (recursive, max depth 5).
   */
  computeRecipeCost(recipe: Recipe, depth = 0): number {
    if (depth >= MAX_RECURSION_DEPTH) return 0;
    if (!recipe?.ingredients_?.length) return 0;

    return recipe.ingredients_.reduce((acc, ing) => {
      const cost = this.computeIngredientCost(ing, depth);
      return acc + (cost ?? 0);
    }, 0);
  }

  /**
   * Cost per unit of recipe output (in recipe's yield_unit_).
   * Used when recipe is used as an ingredient.
   */
  getRecipeCostPerUnit(recipe: Recipe, depth = 0): number {
    const totalCost = this.computeRecipeCost(recipe, depth);
    const yieldAmount = recipe.yield_amount_ || 1;
    return totalCost / yieldAmount;
  }

  /**
   * Converts amount to base units (grams) using registry.
   */
  convertToBaseUnits(amount: number, unit: string): number {
    const key = UNIT_ALIASES[unit] ?? unit;
    const factor = this.unitRegistry_.getConversion(key) || 1;
    return amount * factor;
  }

  /**
   * Computes total weight in grams from ingredient form rows.
   * Products: net amount in grams. Recipes: amount in grams (from yield_unit when applicable).
   */
  computeTotalWeightG(ingredientRows: { amount_net?: number; unit?: string }[]): number {
    return ingredientRows.reduce((acc, row) => {
      const net = row.amount_net ?? 0;
      const unit = row.unit ?? 'gr';
      return acc + this.convertToBaseUnits(net, unit);
    }, 0);
  }

  private computeIngredientCost(ing: Ingredient, depth: number): number {
    if (ing.type === 'product') {
      const product = this.kitchenState_.products_().find(p => p._id === ing.referenceId) as Product | undefined;
      if (!product) return 0;
      const yieldFactor = product.yield_factor_ || 1;
      const price = product.buy_price_global_ ?? 0;
      const unitOption = product.purchase_options_?.find(o => o.unit_symbol_ === ing.unit_);
      let normalizedAmount = ing.amount_;
      if (unitOption) {
        if (unitOption.price_override_ != null) {
          return ing.amount_ * unitOption.price_override_;
        }
        normalizedAmount = ing.amount_ / (unitOption.conversion_rate_ || 1);
      }
      return (normalizedAmount / yieldFactor) * price;
    }

    if (ing.type === 'recipe') {
      const subRecipe = this.kitchenState_.recipes_().find(r => r._id === ing.referenceId) as Recipe | undefined;
      if (!subRecipe) return 0;
      const costPerUnit = this.getRecipeCostPerUnit(subRecipe, depth + 1);
      const yieldAmount = subRecipe.yield_amount_ || 1;
      const yieldUnit = subRecipe.yield_unit_ || 'unit';
      const amountInYieldUnit = this.normalizeToRecipeYieldUnit(ing.amount_, ing.unit_, yieldUnit);
      return amountInYieldUnit * costPerUnit;
    }

    return 0;
  }

  /** Normalizes amount to recipe's yield_unit for cost scaling. */
  private normalizeToRecipeYieldUnit(amount: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return amount;
    const fromFactor = this.unitRegistry_.getConversion(UNIT_ALIASES[fromUnit] ?? fromUnit) || 1;
    const toFactor = this.unitRegistry_.getConversion(UNIT_ALIASES[toUnit] ?? toUnit) || 1;
    if (toFactor === 0) return amount;
    return (amount * fromFactor) / toFactor;
  }
}
