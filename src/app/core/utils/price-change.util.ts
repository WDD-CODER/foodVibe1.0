import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'

/** Plan 628: the change from the old price to the new one in percent, two decimals (the rule of `priceHistory.changePct`). */
export function priceChangePct(oldPrice: number | null, newPrice: number | null): number | null {
  if (oldPrice === null || newPrice === null || oldPrice <= 0) return null
  return Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100
}

/** Plan 641: the price a product has today to compare an invoice price with. */
export interface PreviousPrice {
  price: number
  supplierId: string
  /** True when the price is the invoice supplier's own. */
  isOwnSupplier: boolean
}

/**
 * Plan 641: the invoice supplier's own price of the product when it has one, else the lowest price of its other
 * sources (the one recipes cost with); null when no source has a price above 0.
 */
export function previousPriceOf(product: Pick<Product, 'sources'>, supplierId: string): PreviousPrice | null {
  const priced = (product.sources ?? []).filter((source) => typeof source.price === 'number' && source.price > 0)
  const own = priced.find((source) => source.supplierId === supplierId)
  if (own) return { price: own.price, supplierId: own.supplierId, isOwnSupplier: true }
  let lowest: (typeof priced)[number] | null = null
  for (const source of priced) if (!lowest || source.price < lowest.price) lowest = source
  return lowest ? { price: lowest.price, supplierId: lowest.supplierId, isOwnSupplier: false } : null
}

/** Plan 629: true when the price rose by the business's threshold or more (at or above; no change figure → false). */
export function isPriceRiseAlert(changePct: number | null, thresholdPct: number): boolean {
  return changePct !== null && changePct >= thresholdPct
}

/** Plan 645: a change of `thresholdPct` or more in either direction asks the owner before saving. */
export function isBigPriceChange(changePct: number | null, thresholdPct: number): boolean {
  return changePct !== null && Math.abs(changePct) >= thresholdPct
}

/** The engine's own depth limit for a recipe inside a recipe. */
const MAX_DEPTH = 5

/**
 * Plan 629: the recipes and dishes that use one of the products, directly or through a preparation
 * (depth ≤ 5, each recipe visited once per walk so a cycle ends). Order of `recipes` kept.
 */
export function recipesUsingProducts(recipes: readonly Recipe[], productIds: ReadonlySet<string>): Recipe[] {
  const byId = new Map(recipes.map((recipe) => [recipe._id, recipe]))
  const uses = (recipe: Recipe, depth: number, visited: Set<string>): boolean => {
    if (visited.has(recipe._id)) return false
    visited.add(recipe._id)
    return recipe.ingredients.some((ingredient) => {
      const id = ingredient.referenceId
      if (!id) return false
      if (ingredient.type === 'product') return productIds.has(id)
      if (ingredient.type !== 'recipe' || depth >= MAX_DEPTH) return false
      const child = byId.get(id)
      return child !== undefined && uses(child, depth + 1, visited)
    })
  }
  return recipes.filter((recipe) => uses(recipe, 1, new Set<string>()))
}
