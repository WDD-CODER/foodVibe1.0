import type { Recipe } from '@models/recipe.model'
import { isPriceRiseAlert, previousPriceOf, priceChangePct, recipesUsingProducts } from './price-change.util'

describe('priceChangePct', () => {
  it('is the change in percent with two decimals', () => {
    expect(priceChangePct(5, 5.3)).toBe(6)
    expect(priceChangePct(5, 4.8)).toBe(-4)
    expect(priceChangePct(3, 4)).toBe(33.33)
  })

  it('is null when a price is missing or the old price is not above 0', () => {
    expect(priceChangePct(null, 5)).toBeNull()
    expect(priceChangePct(5, null)).toBeNull()
    expect(priceChangePct(0, 5)).toBeNull()
    expect(priceChangePct(-1, 5)).toBeNull()
  })

  it('is 0 for the same price', () => {
    expect(priceChangePct(5, 5)).toBe(0)
  })
})

describe('isPriceRiseAlert', () => {
  it('is true at or above the threshold only', () => {
    expect(isPriceRiseAlert(6, 5)).toBe(true)
    expect(isPriceRiseAlert(4, 5)).toBe(false)
    expect(isPriceRiseAlert(5, 5)).toBe(true)
    expect(isPriceRiseAlert(null, 5)).toBe(false)
  })
})

describe('recipesUsingProducts', () => {
  const recipe = (_id: string, ingredients: { type: 'product' | 'recipe'; referenceId: string }[]): Recipe =>
    ({
      _id,
      nameHebrew: _id,
      ingredients: ingredients.map((i, n) => ({ _id: String(n), amount: 1, unit: 'kg', ...i }))
    }) as unknown as Recipe

  it('finds a direct use', () => {
    const recipes = [
      recipe('r1', [{ type: 'product', referenceId: 'p1' }]),
      recipe('r2', [{ type: 'product', referenceId: 'p2' }])
    ]
    expect(recipesUsingProducts(recipes, new Set(['p1'])).map((r) => r._id)).toEqual(['r1'])
  })

  it('finds a use through a prep two levels down', () => {
    const recipes = [
      recipe('dish', [{ type: 'recipe', referenceId: 'prep1' }]),
      recipe('prep1', [{ type: 'recipe', referenceId: 'prep2' }]),
      recipe('prep2', [{ type: 'product', referenceId: 'p1' }]),
      recipe('other', [])
    ]
    expect(recipesUsingProducts(recipes, new Set(['p1'])).map((r) => r._id)).toEqual(['dish', 'prep1', 'prep2'])
  })

  it('stops on a cycle', () => {
    const recipes = [
      recipe('a', [{ type: 'recipe', referenceId: 'b' }]),
      recipe('b', [{ type: 'recipe', referenceId: 'a' }])
    ]
    expect(recipesUsingProducts(recipes, new Set(['p1']))).toEqual([])
  })
})

describe('previousPriceOf', () => {
  const src = (supplierId: string, price: number) => ({ supplierId, price, addedBy: 'u', addedAt: 1 })

  it('takes the invoice supplier own price first', () => {
    expect(previousPriceOf({ sources: [src('a', 90), src('b', 100)] }, 'b')).toEqual({
      price: 100,
      supplierId: 'b',
      isOwnSupplier: true
    })
  })

  it('takes the lowest other price and names its supplier', () => {
    expect(previousPriceOf({ sources: [src('a', 120), src('c', 100)] }, 'b')).toEqual({
      price: 100,
      supplierId: 'c',
      isOwnSupplier: false
    })
  })

  it('is null when no source has a price', () => {
    expect(previousPriceOf({ sources: [] }, 'b')).toBeNull()
    expect(previousPriceOf({ sources: [src('a', 0)] }, 'b')).toBeNull()
  })
})
