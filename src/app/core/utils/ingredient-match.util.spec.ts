import { findIngredientMatch } from './ingredient-match.util'

describe('findIngredientMatch', () => {
  const products = [{ _id: 'p1', nameHebrew: 'עגבניות' }]
  const recipes = [
    { _id: 'r1', nameHebrew: 'רוטב' },
    { _id: 'r2', nameHebrew: 'עגבניות' }
  ]

  it('matches a product by exact trimmed name', () => {
    expect(findIngredientMatch('  עגבניות ', products, recipes)).toEqual({ entity: products[0], type: 'product' })
  })

  it('falls back to a recipe when no product has the name', () => {
    expect(findIngredientMatch('רוטב', products, recipes)).toEqual({ entity: recipes[0], type: 'recipe' })
  })

  it('returns null for no match or an empty name', () => {
    expect(findIngredientMatch('מלח', products, recipes)).toBeNull()
    expect(findIngredientMatch('   ', products, recipes)).toBeNull()
  })
})
