import { Recipe } from '@models/recipe.model'
import { Product } from '@models/product.model'

export const MAX_ALLERGEN_RECURSION = 5

/**
 * Resolve all allergens for a recipe, including sub-recipe allergens up to maxDepth.
 * Pure function — no Angular DI.
 */
export function resolveRecipeAllergens(
  recipe: Recipe,
  allRecipes: Recipe[],
  allProducts: Product[],
  maxDepth = MAX_ALLERGEN_RECURSION,
  depth = 0
): string[] {
  if (depth >= maxDepth || !recipe?.ingredients_?.length) return []
  const set = new Set<string>()

  for (const ing of recipe.ingredients_) {
    if (ing.type === 'product') {
      const product = allProducts.find(p => p._id === ing.referenceId) as Product | undefined
      ;(product?.allergens_ || []).forEach(a => set.add(a))
    } else if (ing.type === 'recipe') {
      const subRecipe = allRecipes.find(r => r._id === ing.referenceId)
      if (subRecipe) {
        resolveRecipeAllergens(subRecipe, allRecipes, allProducts, maxDepth, depth + 1)
          .forEach(a => set.add(a))
      }
    }
  }

  return Array.from(set)
}
