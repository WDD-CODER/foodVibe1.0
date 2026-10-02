import { Injectable, inject } from '@angular/core'
import { KitchenStateService } from './kitchen-state.service'
import { RecipeCostService } from './recipe-cost.service'
import { MenuEvent, MenuItemSelection, ServingType } from '@models/menu-event.model'
import { Recipe } from '@models/recipe.model'

type MenuEventLike = Omit<MenuEvent, '_id'> | MenuEvent

@Injectable({ providedIn: 'root' })
export class MenuIntelligenceService {
  private readonly kitchenState = inject(KitchenStateService)
  private readonly recipeCostService = inject(RecipeCostService)

  /**
   * Total portions to prepare for this dish.
   * - Plated/buffet: guest_count × portions_per_guest (no take rate; supports fractional e.g. 0.25, 0.5).
   * - Cocktail/passed: guest_count × pieces_per_person × take_rate (rounded).
   */
  derivePortions(
    servingType: ServingType,
    guestCount: number,
    predictedTakeRate: number,
    piecesPerPerson?: number,
    servingPortions: number = 1
  ): number {
    const sp = Math.max(0, servingPortions ?? 1)
    if (servingType === 'cocktail_passed') {
      const boundedRate = Math.max(0, Math.min(1, predictedTakeRate))
      const ppp = Math.max(0, piecesPerPerson ?? 0)
      return Math.round(guestCount * ppp * boundedRate)
    }

    if (servingType === 'buffet_family') {
      return guestCount * sp
    }

    return guestCount * sp
  }

  hydrateDerivedPortions(event: MenuEventLike): MenuEventLike {
    return {
      ...event,
      sections: event.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          derivedPortions: this.derivePortions(
            event.servingType,
            event.guestCount,
            item.predictedTakeRate,
            event.piecesPerPerson,
            item.servingPortions ?? 1
          )
        }))
      }))
    }
  }

  computeEventIngredientCost(event: MenuEventLike): number {
    let total = 0
    event.sections.forEach((section) => {
      section.items.forEach((item) => {
        const recipe = this.getRecipeBySelection(item)
        if (!recipe) return
        const baseYield = Math.max(1, recipe.yieldAmount || 1)
        const multiplier = item.derivedPortions / baseYield
        const scaledRecipe: Recipe = {
          ...recipe,
          ingredients: recipe.ingredients.map((ing) => ({
            ...ing,
            amount: (ing.amount || 0) * multiplier
          }))
        }
        total += this.recipeCostService.computeRecipeCost(scaledRecipe)
      })
    })
    return total
  }

  /** Total revenue from sell prices: sum of (sell_price × derived_portions) per item. */
  computeEventRevenue(event: MenuEventLike): number {
    let total = 0
    event.sections.forEach((section) => {
      section.items.forEach((item) => {
        const price = item.sellPrice ?? 0
        const portions = item.derivedPortions ?? 0
        total += price * portions
      })
    })
    return total
  }

  /** Food cost % using target revenue per guest (legacy). */
  computeFoodCostPct(event: MenuEventLike): number {
    const revenuePerGuest = event.financialTargets?.targetRevenuePerGuest ?? 0
    if (revenuePerGuest <= 0 || event.guestCount <= 0) return 0
    const revenue = revenuePerGuest * event.guestCount
    if (revenue <= 0) return 0
    return (this.computeEventIngredientCost(event) / revenue) * 100
  }

  /** Food cost % from actual revenue (sell prices × portions). Use when saving so list shows correct %. */
  computeFoodCostPctFromActualRevenue(event: MenuEventLike): number {
    const revenue = this.computeEventRevenue(event)
    if (revenue <= 0) return 0
    return (this.computeEventIngredientCost(event) / revenue) * 100
  }

  private getRecipeBySelection(item: MenuItemSelection): Recipe | undefined {
    return this.kitchenState.recipes_().find((r) => r._id === item.recipeId)
  }
}
