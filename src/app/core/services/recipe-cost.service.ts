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

/** Units that can be used for weight or volume total (registry fallback). */
const VOLUME_OR_WEIGHT_KEYS = new Set(['gram', 'gr', 'grams', 'g', 'kg', 'liter', 'l', 'ml']);

export type IngredientWeightRow = {
  amount_net?: number;
  unit?: string;
  referenceId?: string;
  item_type?: string;
  name_hebrew?: string;
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
   * Returns the weight in grams for a single row, or null if the unit cannot be converted to grams.
   */
  getRowWeightG(row: IngredientWeightRow, depth = 0): number | null {
    if (depth >= MAX_RECURSION_DEPTH) return null;
    const contribution = this.getRowWeightContributionG(row, depth);
    return contribution === 0 && !this.hasGramConversion(row) ? null : contribution;
  }

  /**
   * Computes total weight in grams from ingredient form rows.
   * Only includes ingredients that have a verifiable conversion path to grams.
   */
  computeTotalWeightG(ingredientRows: IngredientWeightRow[], depth = 0): number {
    if (depth >= MAX_RECURSION_DEPTH) return 0;
    return ingredientRows.reduce((acc, row) => acc + this.getRowWeightContributionG(row, depth), 0);
  }

  private hasGramConversion(row: IngredientWeightRow): boolean {
    const unit = (row.unit ?? 'gr').trim().toLowerCase();
    const key = UNIT_ALIASES[unit] ?? unit;
    if (MASS_UNITS.has(key) || MASS_UNITS.has(unit)) return true;
    if (row.referenceId && row.item_type === 'product') {
      const product = this.kitchenState_.products_().find(p => p._id === row.referenceId) as Product | undefined;
      if (product?.purchase_options_?.length && product.base_unit_) {
        const baseKey = (UNIT_ALIASES[product.base_unit_] ?? product.base_unit_).toLowerCase();
        if (baseKey === 'gram' || baseKey === 'kg' || MASS_UNITS.has(baseKey)) return true;
      }
    }
    if (row.referenceId && row.item_type === 'recipe') {
      const subRecipe = this.kitchenState_.recipes_().find(r => r._id === row.referenceId) as Recipe | undefined;
      if (subRecipe?.yield_unit_) {
        const yieldKey = (UNIT_ALIASES[subRecipe.yield_unit_] ?? subRecipe.yield_unit_).toLowerCase();
        if (yieldKey === 'gram' || yieldKey === 'kg' || MASS_UNITS.has(yieldKey)) return true;
      }
    }
    return false;
  }

  private getRowWeightContributionG(row: IngredientWeightRow, depth: number): number {
    const net = row.amount_net ?? 0;
    const unit = (row.unit ?? 'gr').trim().toLowerCase();
    const key = UNIT_ALIASES[unit] ?? unit;

    if (MASS_UNITS.has(key) || MASS_UNITS.has(unit)) {
      const factor = this.unitRegistry_.getConversion(key) || this.unitRegistry_.getConversion(unit);
      if (factor && factor > 0) return net * factor;
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
            const amountInBaseUnits = net / (opt.conversion_rate_ || 1);
            const gramsPerBaseUnit = baseKey === 'kg' ? 1000 : 1;
            return amountInBaseUnits * gramsPerBaseUnit;
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
          return (totalRecipeG / yieldAmount) * amountInYield;
        }
      }
    }

    if (VOLUME_OR_WEIGHT_KEYS.has(key) || VOLUME_OR_WEIGHT_KEYS.has(unit)) {
      const factor = this.unitRegistry_.getConversion(key) || this.unitRegistry_.getConversion(unit);
      if (factor && factor > 0) return net * factor;
    }

    return 0;
  }

  /**
   * Returns net weight in grams for the row divided by yield (bruto weight in g).
   */
  getRowBrutoWeightG(row: IngredientWeightRow, depth = 0): number {
    const netG = this.getRowWeightContributionG(row, depth);
    if (netG <= 0) return 0;
    const yieldFactor = this.getYieldFactorForRow(row);
    return netG / yieldFactor;
  }

  private getYieldFactorForRow(row: IngredientWeightRow): number {
    if (row.referenceId && row.item_type === 'product') {
      const product = this.kitchenState_.products_().find(p => p._id === row.referenceId) as Product | undefined;
      return product?.yield_factor_ ?? 1;
    }
    if (row.referenceId && row.item_type === 'recipe') {
      return 1;
    }
    return 1;
  }

  /**
   * Total bruto (gross) weight in grams from ingredient rows.
   */
  computeTotalBrutoWeightG(rows: IngredientWeightRow[], depth = 0): number {
    if (depth >= MAX_RECURSION_DEPTH) return 0;
    return rows.reduce((acc, row) => acc + this.getRowBrutoWeightG(row, depth), 0);
  }

  /**
   * Returns ingredient names that could not be converted to weight (grams).
   */
  getUnconvertibleNamesForWeight(rows: IngredientWeightRow[], depth = 0): string[] {
    if (depth >= MAX_RECURSION_DEPTH) return [];
    const names: string[] = [];
    for (const row of rows) {
      const contrib = this.getRowWeightContributionG(row, depth);
      if (contrib <= 0 && (row.amount_net ?? 0) > 0) {
        const name = row.name_hebrew?.trim();
        if (name && !names.includes(name)) names.push(name);
      }
    }
    return names;
  }

  /**
   * Total volume in liters and list of ingredient names that could not be converted to volume.
   * Uses 1 g = 1 ml fallback when product has no volume option.
   */
  computeTotalVolumeL(rows: IngredientWeightRow[], depth = 0): { totalL: number; unconvertibleNames: string[] } {
    if (depth >= MAX_RECURSION_DEPTH) return { totalL: 0, unconvertibleNames: [] };
    let totalMl = 0;
    const unconvertibleNames: string[] = [];
    const unit = (v: string) => (UNIT_ALIASES[v] ?? v).toLowerCase();

    for (const row of rows) {
      const net = row.amount_net ?? 0;
      if (net <= 0) continue;
      const rowUnit = (row.unit ?? '').trim().toLowerCase();
      const key = unit(rowUnit);

      const volFactor = this.unitRegistry_.getConversion(key) || 0;
      if (key === 'liter' || key === 'l') {
        totalMl += net * (volFactor || 1000);
        continue;
      }
      if (key === 'ml') {
        totalMl += net * (volFactor || 1);
        continue;
      }
      const netG = this.getRowWeightContributionG(row, depth);
      if (netG > 0) {
        totalMl += netG;
        continue;
      }
      const name = row.name_hebrew?.trim();
      if (name && !unconvertibleNames.includes(name)) unconvertibleNames.push(name);
    }
    return { totalL: totalMl / 1000, unconvertibleNames };
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
          const conv = unitOption.conversion_rate_ || 1;
          const pricePerUnit = unitOption.price_override_ / conv;
          return ing.amount_ * pricePerUnit;
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
