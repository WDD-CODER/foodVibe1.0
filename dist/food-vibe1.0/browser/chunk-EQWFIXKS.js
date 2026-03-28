import {
  UnitRegistryService
} from "./chunk-UA66Z5WI.js";
import {
  KitchenStateService
} from "./chunk-DRMAUDCM.js";
import {
  Injectable,
  inject,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-FJPSXAXA.js";

// src/app/core/utils/recipe-cost.constants.ts
var UNIT_ALIASES = {
  gr: "gram",
  grams: "gram",
  g: "gram",
  kg: "kg",
  '\u05E7"\u05D2': "kg",
  liter: "liter",
  l: "liter",
  ml: "ml",
  unit: "unit"
};
var MASS_UNITS = /* @__PURE__ */ new Set(["gram", "gr", "grams", "g", "kg"]);
var VOLUME_OR_WEIGHT_KEYS = /* @__PURE__ */ new Set(["gram", "gr", "grams", "g", "kg", "liter", "l", "ml"]);
var MAX_RECURSION_DEPTH = 5;

// src/app/core/services/recipe-cost.service.ts
var RecipeCostService = class _RecipeCostService {
  kitchenState_ = inject(KitchenStateService);
  unitRegistry_ = inject(UnitRegistryService);
  /**
   * Cost for a single ingredient (used by export). Recursive for type 'recipe'.
   */
  getCostForIngredient(ing, depth = 0) {
    if (depth >= MAX_RECURSION_DEPTH)
      return 0;
    return this.computeIngredientCost(ing, depth);
  }
  /**
   * Computes the total cost of a recipe from its ingredients (recursive, max depth 5).
   */
  computeRecipeCost(recipe, depth = 0) {
    if (depth >= MAX_RECURSION_DEPTH)
      return 0;
    if (!recipe?.ingredients_?.length)
      return 0;
    return recipe.ingredients_.reduce((acc, ing) => {
      const cost = this.computeIngredientCost(ing, depth);
      return acc + (cost ?? 0);
    }, 0);
  }
  /**
   * Cost per unit of recipe output (in recipe's yield_unit_).
   * Used when recipe is used as an ingredient.
   */
  getRecipeCostPerUnit(recipe, depth = 0) {
    const totalCost = this.computeRecipeCost(recipe, depth);
    const yieldAmount = recipe.yield_amount_ || 1;
    return totalCost / yieldAmount;
  }
  /**
   * Converts amount to base units (grams) using registry.
   */
  convertToBaseUnits(amount, unit) {
    const key = UNIT_ALIASES[unit] ?? unit;
    const factor = this.unitRegistry_.getConversion(key) || 1;
    return amount * factor;
  }
  /**
   * Converts amount in a given unit to the recipe's yield_unit quantity.
   * Uses recipe's yield_conversions_ when the unit is one of its declared units (primary or secondary);
   * otherwise falls back to global registry via normalizeToRecipeYieldUnit.
   */
  amountInRecipeYieldUnit(amount, unit, recipe) {
    const convs = recipe.yield_conversions_;
    if (convs?.length) {
      const u = (unit ?? "").trim().toLowerCase();
      const entry = convs.find((c) => (c?.unit ?? "").trim().toLowerCase() === u);
      if (entry != null && entry.amount != null && entry.amount > 0) {
        const yieldAmount = recipe.yield_amount_ ?? 1;
        return amount * (yieldAmount / entry.amount);
      }
    }
    const yieldUnit = recipe.yield_unit_ || "unit";
    return this.normalizeToRecipeYieldUnit(amount, unit, yieldUnit);
  }
  /**
   * Returns the weight in grams for a single row, or null if the unit cannot be converted to grams.
   */
  getRowWeightG(row, depth = 0) {
    if (depth >= MAX_RECURSION_DEPTH)
      return null;
    const contribution = this.getRowWeightContributionG(row, depth);
    return contribution === 0 && !this.hasGramConversion(row) ? null : contribution;
  }
  /**
   * Computes total weight in grams from ingredient form rows.
   * Only includes ingredients that have a verifiable conversion path to grams.
   */
  computeTotalWeightG(ingredientRows, depth = 0) {
    if (depth >= MAX_RECURSION_DEPTH)
      return 0;
    return ingredientRows.reduce((acc, row) => acc + this.getRowWeightContributionG(row, depth), 0);
  }
  hasGramConversion(row) {
    const unit = (row.unit ?? "gr").trim().toLowerCase();
    const key = UNIT_ALIASES[unit] ?? unit;
    if (MASS_UNITS.has(key) || MASS_UNITS.has(unit))
      return true;
    if (row.referenceId && row.item_type === "product") {
      const product = this.kitchenState_.products_().find((p) => p._id === row.referenceId);
      if (product?.purchase_options_?.length && product.base_unit_) {
        const baseKey = (UNIT_ALIASES[product.base_unit_] ?? product.base_unit_).toLowerCase();
        if (baseKey === "gram" || baseKey === "kg" || MASS_UNITS.has(baseKey))
          return true;
      }
    }
    if (row.referenceId && row.item_type === "recipe") {
      const subRecipe = this.kitchenState_.recipes_().find((r) => r._id === row.referenceId);
      if (subRecipe?.yield_unit_) {
        const yieldKey = (UNIT_ALIASES[subRecipe.yield_unit_] ?? subRecipe.yield_unit_).toLowerCase();
        if (yieldKey === "gram" || yieldKey === "kg" || MASS_UNITS.has(yieldKey))
          return true;
      }
    }
    return false;
  }
  getRowWeightContributionG(row, depth) {
    const net = row.amount_net ?? 0;
    const unit = (row.unit ?? "gr").trim().toLowerCase();
    const key = UNIT_ALIASES[unit] ?? unit;
    if (MASS_UNITS.has(key) || MASS_UNITS.has(unit)) {
      const factor = this.unitRegistry_.getConversion(key) || this.unitRegistry_.getConversion(unit);
      if (factor && factor > 0)
        return net * factor;
    }
    if (row.referenceId && row.item_type === "product") {
      const product = this.kitchenState_.products_().find((p) => p._id === row.referenceId);
      if (product) {
        const opt = product.purchase_options_?.find((o) => (o.unit_symbol_ ?? "").toLowerCase() === unit || (o.unit_symbol_ ?? "").toLowerCase() === key);
        if (opt?.conversion_rate_ && product.base_unit_) {
          const baseKey = (UNIT_ALIASES[product.base_unit_] ?? product.base_unit_).toLowerCase();
          if (baseKey === "gram" || baseKey === "kg" || MASS_UNITS.has(baseKey)) {
            const amountInBaseUnits = net * (opt.conversion_rate_ || 1);
            const gramsPerBaseUnit = baseKey === "kg" ? 1e3 : 1;
            return amountInBaseUnits * gramsPerBaseUnit;
          }
        }
      }
    }
    if (row.referenceId && row.item_type === "recipe") {
      const subRecipe = this.kitchenState_.recipes_().find((r) => r._id === row.referenceId);
      if (subRecipe?.yield_unit_) {
        const yieldKey = UNIT_ALIASES[subRecipe.yield_unit_] ?? subRecipe.yield_unit_;
        const yieldFactor = this.unitRegistry_.getConversion(yieldKey);
        if (yieldFactor && (yieldKey === "gram" || yieldKey === "kg" || MASS_UNITS.has(yieldKey))) {
          const amountInYield = this.amountInRecipeYieldUnit(net, unit, subRecipe);
          const totalRecipeG = this.computeTotalWeightG(subRecipe.ingredients_?.map((i) => ({
            amount_net: i.amount_,
            unit: i.unit_,
            referenceId: i.referenceId,
            item_type: i.type
          })) ?? [], depth + 1);
          const yieldAmount = subRecipe.yield_amount_ || 1;
          return totalRecipeG / yieldAmount * amountInYield;
        }
      }
    }
    if (VOLUME_OR_WEIGHT_KEYS.has(key) || VOLUME_OR_WEIGHT_KEYS.has(unit)) {
      const factor = this.unitRegistry_.getConversion(key) || this.unitRegistry_.getConversion(unit);
      if (factor && factor > 0)
        return net * factor;
    }
    return 0;
  }
  /**
   * Returns net weight in grams for the row divided by yield (bruto weight in g).
   */
  getRowBrutoWeightG(row, depth = 0) {
    const netG = this.getRowWeightContributionG(row, depth);
    if (netG <= 0)
      return 0;
    const yieldFactor = this.getYieldFactorForRow(row);
    return netG / yieldFactor;
  }
  getYieldFactorForRow(row) {
    if (row.referenceId && row.item_type === "product") {
      const product = this.kitchenState_.products_().find((p) => p._id === row.referenceId);
      return product?.yield_factor_ ?? 1;
    }
    if (row.referenceId && row.item_type === "recipe") {
      return 1;
    }
    return 1;
  }
  /**
   * Total bruto (gross) weight in grams from ingredient rows.
   */
  computeTotalBrutoWeightG(rows, depth = 0) {
    if (depth >= MAX_RECURSION_DEPTH)
      return 0;
    return rows.reduce((acc, row) => acc + this.getRowBrutoWeightG(row, depth), 0);
  }
  /**
   * Returns ingredient names that could not be converted to weight (grams).
   */
  getUnconvertibleNamesForWeight(rows, depth = 0) {
    if (depth >= MAX_RECURSION_DEPTH)
      return [];
    const names = [];
    for (const row of rows) {
      const contrib = this.getRowWeightContributionG(row, depth);
      if (contrib <= 0 && (row.amount_net ?? 0) > 0) {
        const name = row.name_hebrew?.trim();
        if (name && !names.includes(name))
          names.push(name);
      }
    }
    return names;
  }
  /**
   * Total volume in liters and list of ingredient names that could not be converted to volume.
   * Only rows with a volume unit (L, ml) contribute; weight-only rows are not converted (no 1g=1ml).
   * Returns totalL rounded to 4 decimal places for display consistency (B3 volume conversion spec).
   */
  computeTotalVolumeL(rows, depth = 0) {
    if (depth >= MAX_RECURSION_DEPTH)
      return { totalL: 0, unconvertibleNames: [] };
    let totalMl = 0;
    const unconvertibleNames = [];
    const unit = (v) => (UNIT_ALIASES[v] ?? v).toLowerCase();
    for (const row of rows) {
      const net = row.amount_net ?? 0;
      if (net <= 0)
        continue;
      const rowUnit = (row.unit ?? "").trim().toLowerCase();
      const key = unit(rowUnit);
      const volFactor = this.unitRegistry_.getConversion(key) ?? 0;
      if (key === "liter" || key === "l") {
        totalMl += net * (volFactor || 1e3);
        continue;
      }
      if (key === "ml") {
        totalMl += net * (volFactor || 1);
        continue;
      }
      const name = row.name_hebrew?.trim();
      if (name && !unconvertibleNames.includes(name))
        unconvertibleNames.push(name);
    }
    const totalL = Math.round(totalMl / 1e3 * 1e4) / 1e4;
    return { totalL, unconvertibleNames };
  }
  computeIngredientCost(ing, depth) {
    if (ing.type === "product") {
      const product = this.kitchenState_.products_().find((p) => p._id === ing.referenceId);
      if (!product)
        return 0;
      const yieldFactor = product.yield_factor_ || 1;
      const price = product.buy_price_global_ ?? 0;
      const unitOption = product.purchase_options_?.find((o) => o.unit_symbol_ === ing.unit_);
      let normalizedAmount;
      if (unitOption) {
        if (unitOption.price_override_ != null && unitOption.price_override_ > 0) {
          return ing.amount_ * unitOption.price_override_;
        }
        normalizedAmount = ing.amount_ * (unitOption.conversion_rate_ || 1);
      } else {
        const amountG = this.convertToBaseUnits(ing.amount_, ing.unit_);
        const baseUnit = product.base_unit_ || "gram";
        const baseFactor = this.unitRegistry_.getConversion(baseUnit) || 1;
        normalizedAmount = amountG / baseFactor;
      }
      return normalizedAmount / yieldFactor * price;
    }
    if (ing.type === "recipe") {
      const subRecipe = this.kitchenState_.recipes_().find((r) => r._id === ing.referenceId);
      if (!subRecipe)
        return 0;
      const costPerUnit = this.getRecipeCostPerUnit(subRecipe, depth + 1);
      const amountInYieldUnit = this.amountInRecipeYieldUnit(ing.amount_, ing.unit_, subRecipe);
      return amountInYieldUnit * costPerUnit;
    }
    return 0;
  }
  /** Normalizes amount to recipe's yield_unit for cost scaling. */
  normalizeToRecipeYieldUnit(amount, fromUnit, toUnit) {
    if (fromUnit === toUnit)
      return amount;
    const fromFactor = this.unitRegistry_.getConversion(UNIT_ALIASES[fromUnit] ?? fromUnit) || 1;
    const toFactor = this.unitRegistry_.getConversion(UNIT_ALIASES[toUnit] ?? toUnit) || 1;
    if (toFactor === 0)
      return amount;
    return amount * fromFactor / toFactor;
  }
  static \u0275fac = function RecipeCostService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _RecipeCostService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _RecipeCostService, factory: _RecipeCostService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RecipeCostService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  RecipeCostService
};
//# sourceMappingURL=chunk-EQWFIXKS.js.map
