import {
  RecipeCostService
} from "./chunk-7Z6ZOB5G.js";
import {
  KitchenStateService
} from "./chunk-ZA4PDXUK.js";
import {
  Injectable,
  __spreadProps,
  __spreadValues,
  inject,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-GCYOWW7U.js";

// src/app/core/services/menu-intelligence.service.ts
var MenuIntelligenceService = class _MenuIntelligenceService {
  kitchenState = inject(KitchenStateService);
  recipeCostService = inject(RecipeCostService);
  /**
   * Total portions to prepare for this dish.
   * - Plated/buffet: guest_count × portions_per_guest (no take rate; supports fractional e.g. 0.25, 0.5).
   * - Cocktail/passed: guest_count × pieces_per_person × take_rate (rounded).
   */
  derivePortions(servingType, guestCount, predictedTakeRate, piecesPerPerson, servingPortions = 1) {
    const sp = Math.max(0, servingPortions ?? 1);
    if (servingType === "cocktail_passed") {
      const boundedRate = Math.max(0, Math.min(1, predictedTakeRate));
      const ppp = Math.max(0, piecesPerPerson ?? 0);
      return Math.round(guestCount * ppp * boundedRate);
    }
    if (servingType === "buffet_family") {
      return guestCount * sp;
    }
    return guestCount * sp;
  }
  hydrateDerivedPortions(event) {
    return __spreadProps(__spreadValues({}, event), {
      sections_: event.sections_.map((section) => __spreadProps(__spreadValues({}, section), {
        items_: section.items_.map((item) => __spreadProps(__spreadValues({}, item), {
          derived_portions_: this.derivePortions(event.serving_type_, event.guest_count_, item.predicted_take_rate_, event.pieces_per_person_, item.serving_portions_ ?? 1)
        }))
      }))
    });
  }
  computeEventIngredientCost(event) {
    let total = 0;
    event.sections_.forEach((section) => {
      section.items_.forEach((item) => {
        const recipe = this.getRecipeBySelection(item);
        if (!recipe)
          return;
        const baseYield = Math.max(1, recipe.yield_amount_ || 1);
        const multiplier = item.derived_portions_ / baseYield;
        const scaledRecipe = __spreadProps(__spreadValues({}, recipe), {
          ingredients_: recipe.ingredients_.map((ing) => __spreadProps(__spreadValues({}, ing), {
            amount_: (ing.amount_ || 0) * multiplier
          }))
        });
        total += this.recipeCostService.computeRecipeCost(scaledRecipe);
      });
    });
    return total;
  }
  /** Total revenue from sell prices: sum of (sell_price × derived_portions) per item. */
  computeEventRevenue(event) {
    let total = 0;
    event.sections_.forEach((section) => {
      section.items_.forEach((item) => {
        const price = item.sell_price_ ?? 0;
        const portions = item.derived_portions_ ?? 0;
        total += price * portions;
      });
    });
    return total;
  }
  /** Food cost % using target revenue per guest (legacy). */
  computeFoodCostPct(event) {
    const revenuePerGuest = event.financial_targets_?.target_revenue_per_guest_ ?? 0;
    if (revenuePerGuest <= 0 || event.guest_count_ <= 0)
      return 0;
    const revenue = revenuePerGuest * event.guest_count_;
    if (revenue <= 0)
      return 0;
    return this.computeEventIngredientCost(event) / revenue * 100;
  }
  /** Food cost % from actual revenue (sell prices × portions). Use when saving so list shows correct %. */
  computeFoodCostPctFromActualRevenue(event) {
    const revenue = this.computeEventRevenue(event);
    if (revenue <= 0)
      return 0;
    return this.computeEventIngredientCost(event) / revenue * 100;
  }
  getRecipeBySelection(item) {
    return this.kitchenState.recipes_().find((r) => r._id === item.recipe_id_);
  }
  static \u0275fac = function MenuIntelligenceService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MenuIntelligenceService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MenuIntelligenceService, factory: _MenuIntelligenceService.\u0275fac, providedIn: "root" });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MenuIntelligenceService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

export {
  MenuIntelligenceService
};
//# sourceMappingURL=chunk-R7QO6CSG.js.map
