import type { Recipe } from '@models/recipe.model'

/** Plan 628: the change from the old price to the new one in percent, two decimals (the rule of `priceHistory.changePct`). */
export function priceChangePct(oldPrice: number | null, newPrice: number | null): number | null {
  if (oldPrice === null || newPrice === null || oldPrice <= 0) return null
  return Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100
}

/** Plan 629: true when the price rose by the business's threshold or more (at or above; no change figure → false). */
export function isPriceRiseAlert(changePct: number | null, thresholdPct: number): boolean {
  return changePct !== null && changePct >= thresholdPct
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
