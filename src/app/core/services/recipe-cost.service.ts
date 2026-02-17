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

/** Units that have a direct conversion to grams in the registry (mass units). */
const MASS_UNITS = new Set(['gram', 'gr', 'grams', 'g', 'kg']);

export type IngredientWeightRow = {
  amount_net?: number;
  unit?: string;
  referenceId?: string;
  item_type?: string;
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
   * Only includes ingredients that have a verifiable conversion path to grams:
   * - Unit is a mass unit in the registry (gram, kg)
   * - Or product has purchase_options with conversion_rate_ to base_unit_ (gram)
   * - Or recipe has yield_unit that converts to grams
   * Ingredients without conversion data are excluded from the total.
   */
  computeTotalWeightG(ingredientRows: IngredientWeightRow[], depth = 0): number {
    if (depth >= MAX_RECURSION_DEPTH) return 0;
    return ingredientRows.reduce((acc, row) => {
      const net = row.amount_net ?? 0;
      const unit = (row.unit ?? 'gr').trim().toLowerCase();
      const key = UNIT_ALIASES[unit] ?? unit;

      if (MASS_UNITS.has(key) || MASS_UNITS.has(unit)) {
        const factor = this.unitRegistry_.getConversion(key) || this.unitRegistry_.getConversion(unit);
        if (factor && factor > 0) return acc + net * factor;
      }

      if (row.referenceId && row.item_type === 'product') {
        const product = this.kitchenState_.products_().find(p => p._id === row.referenceId) as Product | undefined;
        if (product) {
          const opt = product.purchase_options_?.find(o =>
            (o.unit_symbol_ ?? '').toLowerCase() === unit || (o.unit_symbol_ ?? '').toLowerCase() === key
          );
          if (opt?.conversion_rate_ && product.base_unit_) {
            const baseKey = (UNIT_ALIASES[product.base_unit_] ?? product.base_unit_).toLowerCase();
            if (baseKey === 'gram' || baseKey === 'kg' || MASS_UNITS.has(baseKey)) {
              const gramsPerUnit = opt.conversion_rate_ * (baseKey === 'kg' ? 1000 : 1);
              return acc + net * gramsPerUnit;
            }
          }
        }
      }

      if (row.referenceId && row.item_type === 'recipe') {
        const subRecipe = this.kitchenState_.recipes_().find(r => r._id === row.referenceId) as Recipe | undefined;
        if (subRecipe?.yield_unit_) {
          const yieldKey = UNIT_ALIASES[subRecipe.yield_unit_] ?? subRecipe.yield_unit_;
          const yieldFactor = this.unitRegistry_.getConversion(yieldKey);
          if (yieldFactor && (yieldKey === 'gram' || yieldKey === 'kg' || MASS_UNITS.has(yieldKey))) {
            const amountInYield = this.normalizeToRecipeYieldUnit(net, unit, subRecipe.yield_unit_);
            const totalRecipeG = this.computeTotalWeightG(
              subRecipe.ingredients_?.map((i: Ingredient) => ({
                amount_net: i.amount_,
                unit: i.unit_,
                referenceId: i.referenceId,
                item_type: i.type
              })) ?? [],
              depth + 1
            );
            const yieldAmount = subRecipe.yield_amount_ || 1;
            return acc + (totalRecipeG / yieldAmount) * amountInYield;
          }
        }
      }

      return acc;
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
