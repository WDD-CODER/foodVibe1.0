import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'
import { matchProductName } from './product-name-match.util'

export interface IngredientMatch {
  entity: { _id: string; nameHebrew: string }
  type: 'product' | 'recipe'
}

/**
 * Name lookup for a pasted or drafted ingredient. Order: product exact, recipe exact, product variant
 * (plural / spelling), recipe variant. Two equally good product variants are ambiguous and give null — never a silent pick.
 */
export function findIngredientMatch(
  name: string,
  products: readonly Pick<Product, '_id' | 'nameHebrew'>[],
  recipes: readonly Pick<Recipe, '_id' | 'nameHebrew'>[]
): IngredientMatch | null {
  const product = matchProductName(name, products)
  const recipe = matchProductName(name, recipes)
  if (product?.kind === 'exact') return { entity: product.product, type: 'product' }
  if (recipe?.kind === 'exact') return { entity: recipe.product, type: 'recipe' }
  if (product?.kind === 'variant') return { entity: product.product, type: 'product' }
  if (product?.kind === 'ambiguous') return null
  if (recipe?.kind === 'variant') return { entity: recipe.product, type: 'recipe' }
  return null
}
