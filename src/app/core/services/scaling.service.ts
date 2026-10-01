import { Injectable, inject } from '@angular/core'
import { KitchenStateService } from './kitchen-state.service'
import { Recipe } from '../models/recipe.model'
import { PrepCategory } from '../models/recipe.model'

export interface ScaledIngredientRow {
  name: string
  amount: number
  unit: string
  /** Available units for this ingredient (product/recipe options). */
  availableUnits: string[]
  /** Original ingredient referenceId for tracking. */
  referenceId?: string
  /** Original ingredient type. */
  type?: 'product' | 'recipe'
  /** True when the ingredient has no linked product/recipe (draft ingredient). */
  isUnlinked?: boolean
}

export interface ScaledPrepRow {
  name: string
  amount: number
  unit: string
  categoryName?: string
}

@Injectable({ providedIn: 'root' })
export class ScalingService {
  private readonly kitchenState_ = inject(KitchenStateService)

  /**
   * Scale factor for a recipe: targetQuantity / recipe yield.
   * Guard against zero yield.
   */
  getScaleFactor(recipe: Recipe, targetQuantity: number): number {
    const base = recipe.yieldAmount ?? 1
    if (base <= 0) return 1
    return targetQuantity / base
  }

  /**
   * Scaled ingredients with display names from KitchenState.
   */
  getScaledIngredients(recipe: Recipe, factor: number): ScaledIngredientRow[] {
    const ingredients = recipe.ingredients ?? []
    const products = this.kitchenState_.products_()
    const recipes = this.kitchenState_.recipes_()

    return ingredients.map((ing) => {
      if (!ing.referenceId) {
        return {
          name: ing.nameSnapshot || '(ללא שם)',
          amount: (ing.amount ?? 0) * factor,
          unit: ing.unit ?? '',
          availableUnits: [ing.unit ?? ''],
          isUnlinked: true
        }
      }
      const isProduct = ing.type === 'product'
      const item = isProduct
        ? products.find((p) => p._id === ing.referenceId)
        : recipes.find((r) => r._id === ing.referenceId)
      // When referenceId is set but the product/recipe no longer exists in state
      // (orphaned reference — e.g. product deleted or DB reset), fall back to
      // nameSnapshot and mark as unlinked so the UI can style it appropriately.
      const name = (item as { nameHebrew?: string } | undefined)?.nameHebrew ?? ing.nameSnapshot ?? ''
      const units = this.getAvailableUnitsForIngredient(item, ing.unit ?? '')
      return {
        name,
        amount: (ing.amount ?? 0) * factor,
        unit: ing.unit ?? '',
        availableUnits: units,
        referenceId: ing.referenceId,
        type: ing.type,
        ...(item ? {} : { isUnlinked: true })
      }
    })
  }

  private getAvailableUnitsForIngredient(item: unknown, currentUnit: string): string[] {
    const units = new Set<string>()
    if (currentUnit) units.add(currentUnit)
    if (!item) return Array.from(units)
    const meta = item as {
      baseUnit?: string
      purchaseOptions?: { unitSymbol?: string }[]
      unit_options_?: { unitSymbol?: string }[]
      yieldUnit?: string
    }
    if (meta.baseUnit) units.add(meta.baseUnit)
    if (meta.purchaseOptions?.length) {
      meta.purchaseOptions.forEach((o) => {
        if (o.unitSymbol) units.add(o.unitSymbol)
      })
    }
    if (meta.unit_options_?.length) {
      meta.unit_options_.forEach((o) => {
        if (o.unitSymbol) units.add(o.unitSymbol)
      })
    }
    if (meta.yieldUnit) units.add(meta.yieldUnit)
    return Array.from(units)
  }

  /**
   * Scaled prep items for dishes (prepItems and prepCategories).
   */
  getScaledPrepItems(recipe: Recipe, factor: number): ScaledPrepRow[] {
    const rows: ScaledPrepRow[] = []

    if (recipe.prepItems?.length) {
      recipe.prepItems.forEach((p) => {
        rows.push({
          name: p.preparationName,
          amount: (p.quantity ?? 0) * factor,
          unit: p.unit ?? 'unit',
          categoryName: p.categoryName
        })
      })
    }

    if (recipe.prepCategories?.length) {
      recipe.prepCategories.forEach((cat: PrepCategory) => {
        ;(cat.items ?? []).forEach((it) => {
          rows.push({
            name: it.itemName,
            amount: (it.quantity ?? 0) * factor,
            unit: it.unit ?? 'unit',
            categoryName: cat.categoryName
          })
        })
      })
    }

    return rows
  }
}
