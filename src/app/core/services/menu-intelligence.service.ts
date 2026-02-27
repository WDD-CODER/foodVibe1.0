import { Injectable, inject } from '@angular/core';
import { KitchenStateService } from './kitchen-state.service';
import { RecipeCostService } from './recipe-cost.service';
import { MenuEvent, MenuItemSelection, ServingType } from '@models/menu-event.model';
import { Recipe } from '@models/recipe.model';

type MenuEventLike = Omit<MenuEvent, '_id'> | MenuEvent;

@Injectable({ providedIn: 'root' })
export class MenuIntelligenceService {
  private readonly kitchenState = inject(KitchenStateService);
  private readonly recipeCostService = inject(RecipeCostService);

  derivePortions(
    servingType: ServingType,
    guestCount: number,
    predictedTakeRate: number,
    piecesPerPerson?: number
  ): number {
    const boundedRate = Math.max(0, Math.min(1, predictedTakeRate));
    if (servingType === 'cocktail_passed') {
      const ppp = Math.max(0, piecesPerPerson ?? 0);
      return Math.round(guestCount * ppp * boundedRate);
    }

    if (servingType === 'buffet_family') {
      return Math.round(guestCount * boundedRate * 1.15);
    }

    return Math.round(guestCount * boundedRate);
  }

  hydrateDerivedPortions(event: MenuEventLike): MenuEventLike {
    return {
      ...event,
      sections_: event.sections_.map(section => ({
        ...section,
        items_: section.items_.map(item => ({
          ...item,
          derived_portions_: this.derivePortions(
            event.serving_type_,
            event.guest_count_,
            item.predicted_take_rate_,
            event.pieces_per_person_
          ),
        })),
      })),
    };
  }

  computeEventIngredientCost(event: MenuEventLike): number {
    let total = 0;
    event.sections_.forEach(section => {
      section.items_.forEach(item => {
        const recipe = this.getRecipeBySelection(item);
        if (!recipe) return;
        const baseYield = Math.max(1, recipe.yield_amount_ || 1);
        const multiplier = item.derived_portions_ / baseYield;
        const scaledRecipe: Recipe = {
          ...recipe,
          ingredients_: recipe.ingredients_.map(ing => ({
            ...ing,
            amount_: (ing.amount_ || 0) * multiplier,
          })),
        };
        total += this.recipeCostService.computeRecipeCost(scaledRecipe);
      });
    });
    return total;
  }

  computeFoodCostPct(event: MenuEventLike): number {
    const revenuePerGuest = event.financial_targets_?.target_revenue_per_guest_ ?? 0;
    if (revenuePerGuest <= 0 || event.guest_count_ <= 0) return 0;
    const revenue = revenuePerGuest * event.guest_count_;
    if (revenue <= 0) return 0;
    return (this.computeEventIngredientCost(event) / revenue) * 100;
  }

  private getRecipeBySelection(item: MenuItemSelection): Recipe | undefined {
    return this.kitchenState.recipes_().find(r => r._id === item.recipe_id_);
  }
}
