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

describe('findIngredientMatch variants', () => {
  const products = [
    { _id: 'p1', nameHebrew: 'עגבנייה' },
    { _id: 'p2', nameHebrew: 'מלח' }
  ]
  const recipes = [
    { _id: 'r1', nameHebrew: 'עגבניות' },
    { _id: 'r2', nameHebrew: 'מלחים' }
  ]

  it('links a plural to the singular product', () => {
    expect(findIngredientMatch('עגבניות', products, [])).toEqual({ entity: products[0], type: 'product' })
  })

  it('orders product-exact, recipe-exact, product-variant, recipe-variant', () => {
    expect(findIngredientMatch('עגבנייה', products, recipes)?.type).toBe('product')
    expect(findIngredientMatch('עגבניות', products, recipes)?.type).toBe('recipe')
    expect(findIngredientMatch('מלחים', products, recipes)?.type).toBe('recipe')
    expect(findIngredientMatch('מלחים', products, [])?.type).toBe('product')
    expect(findIngredientMatch('מלח', [], recipes)).toEqual({ entity: recipes[1], type: 'recipe' })
  })

  it('gives null when two products fit equally', () => {
    const twins = [
      { _id: 'a', nameHebrew: 'עגבנייה' },
      { _id: 'b', nameHebrew: 'עגבניה' }
    ]
    expect(findIngredientMatch('עגבניות', twins, [])).toBeNull()
  })
})
