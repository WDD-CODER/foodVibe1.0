import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'

export interface IngredientMatch {
  entity: { _id: string; nameHebrew: string }
  type: 'product' | 'recipe'
}

const norm = (s: string): string => (s ?? '').trim().toLowerCase()

/** Exact-name match (trimmed, case-insensitive): products first, then recipes. Null when nothing matches. */
export function findIngredientMatch(
  name: string,
  products: readonly Pick<Product, '_id' | 'nameHebrew'>[],
  recipes: readonly Pick<Recipe, '_id' | 'nameHebrew'>[]
): IngredientMatch | null {
  const q = norm(name)
  if (!q) return null
  const product = products.find((p) => norm(p.nameHebrew) === q)
  if (product) return { entity: product, type: 'product' }
  const recipe = recipes.find((r) => norm(r.nameHebrew) === q)
  if (recipe) return { entity: recipe, type: 'recipe' }
  return null
}
