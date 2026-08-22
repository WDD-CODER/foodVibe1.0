import { Recipe } from '@models/recipe.model'
import { Product } from '@models/product.model'

export const MAX_ALLERGEN_RECURSION = 5

/**
 * Resolve all allergens for a recipe, including sub-recipe allergens up to maxDepth.
 * Pure function — no Angular DI. Takes id-keyed Maps (not arrays) so callers can pass
 * KitchenStateService's memoized productsById_/recipesById_ for O(1) lookups (plan 303 M1)
 * instead of paying an O(n) scan per ingredient.
 */
export function resolveRecipeAllergens(
  recipe: Recipe,
  recipesById: Map<string, Recipe>,
  productsById: Map<string, Product>,
  maxDepth = MAX_ALLERGEN_RECURSION,
  depth = 0
): string[] {
  if (depth >= maxDepth || !recipe?.ingredients_?.length) return []
  const set = new Set<string>()

  for (const ing of recipe.ingredients_) {
    if (ing.type === 'product') {
      const product = ing.referenceId ? productsById.get(ing.referenceId) : undefined
      ;(product?.allergens_ || []).forEach((a) => set.add(a))
    } else if (ing.type === 'recipe') {
      const subRecipe = ing.referenceId ? recipesById.get(ing.referenceId) : undefined
      if (subRecipe) {
        resolveRecipeAllergens(subRecipe, recipesById, productsById, maxDepth, depth + 1).forEach((a) => set.add(a))
      }
    }
  }

  return Array.from(set)
}
