import { Injectable, inject } from '@angular/core'
import { netPriceOf } from '@schemas/dish-analysis/net-price'
import { BusinessService } from './business.service'
import { KitchenStateService } from './kitchen-state.service'
import { RecipeCostService } from './recipe-cost.service'
import { isProductUnpriced } from '../utils/product-validation.util'
import type { MissingItem } from '../engine/event-plan.types'
import type { MenuDish } from '../models/menu-dish.model'

/** What a dish's cost per portion is, and how far it can be trusted. */
export interface MenuDishCost {
  /** costed: a full number · partial: a number that is too low · missing: the recipe or product is gone · units: counted only. */
  state: 'costed' | 'partial' | 'missing' | 'units'
  costPerPortion: number | null
  missing: MissingItem[]
}

/** The business's VAT rate and dealer type when none are stored (plan 723). */
const DEFAULT_VAT_RATE_PCT = 18

/**
 * Plan 725: the one cost rule of a standing-menu dish (recipe, bought product, typed cost, units only).
 * The sales page and the later analysis read it, so a number is never computed twice.
 */
@Injectable({ providedIn: 'root' })
export class MenuDishCostService {
  private readonly kitchen_ = inject(KitchenStateService)
  private readonly recipeCost_ = inject(RecipeCostService)
  private readonly business_ = inject(BusinessService).business_

  costOf(dish: MenuDish): MenuDishCost {
    switch (dish.costSource) {
      case 'recipe': {
        const recipe = this.kitchen_.recipesById_().get(dish.recipeId ?? '')
        if (!recipe) return { state: 'missing', costPerPortion: null, missing: [] }
        const status = this.recipeCost_.computeRecipeCostStatus(recipe)
        return {
          state: status.partial ? 'partial' : 'costed',
          costPerPortion: this.recipeCost_.getRecipeCostPerUnit(recipe),
          missing: status.missing
        }
      }
      case 'product': {
        const product = this.kitchen_.productsById_().get(dish.productId ?? '')
        if (!product) return { state: 'missing', costPerPortion: null, missing: [] }
        const cost = this.recipeCost_.getCostForIngredient({
          _id: dish._id,
          type: 'product',
          referenceId: dish.productId,
          amount: dish.productAmount ?? 0,
          unit: dish.productUnit ?? ''
        })
        const unpriced = isProductUnpriced(product)
        return {
          state: unpriced ? 'partial' : 'costed',
          costPerPortion: cost,
          missing: unpriced
            ? [{ kind: 'unpriced', productId: product._id, name: product.nameHebrew, recipeIds: [] }]
            : []
        }
      }
      case 'typed':
        return { state: 'costed', costPerPortion: dish.typedCost ?? 0, missing: [] }
      default:
        return { state: 'units', costPerPortion: null, missing: [] }
    }
  }

  /** The price without VAT by the business's one rate and dealer type; null without a price. */
  netPrice(dish: Pick<MenuDish, 'priceWithVat'>): number | null {
    if (dish.priceWithVat == null) return null
    const settings = this.business_()?.settings
    return netPriceOf(dish.priceWithVat, settings?.vatRatePct ?? DEFAULT_VAT_RATE_PCT, settings?.dealerType ?? 'murshe')
  }

  /** Net price − cost per portion, only for a fully costed dish. */
  leftPerDish(dish: MenuDish): number | null {
    const net = this.netPrice(dish)
    const cost = this.costOf(dish)
    if (net == null || cost.state !== 'costed' || cost.costPerPortion == null) return null
    return Math.round((net - cost.costPerPortion) * 100) / 100
  }
}
