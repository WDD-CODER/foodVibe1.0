import { Recipe } from '@models/recipe.model'
import {
  categoryDisplayKey,
  compareRecipes,
  filterOptionLabel,
  formatDateTime,
  formatShortDate,
  getAllRecipeLabels,
  getRecipeProductIds,
  isRecipeDish,
  parseDateToEndOfDay,
  parseDateToStartOfDay,
  recipeContainsAllProducts,
  recipeFilterValues,
  RecipeCompareDeps
} from './recipe-book-list.util'

function makeRecipe(partial: Partial<Recipe>): Recipe {
  return { _id: 'r', nameHebrew: '', ingredients: [], steps: [], ...partial } as Recipe
}

describe('recipe-book-list.util', () => {
  describe('isRecipeDish', () => {
    it('is true for dish type or prep items, false otherwise', () => {
      expect(isRecipeDish(makeRecipe({ recipeType: 'dish' }))).toBeTrue()
      expect(isRecipeDish(makeRecipe({ recipeType: 'preparation' }))).toBeFalse()
      expect(isRecipeDish(makeRecipe({ prepItems: [{}] } as unknown as Partial<Recipe>))).toBeTrue()
    })
  })

  describe('getAllRecipeLabels', () => {
    it('merges manual and auto labels without duplicates', () => {
      expect(getAllRecipeLabels(makeRecipe({ labels: ['a', 'b'], autoLabels: ['b', 'c'] }))).toEqual(['a', 'b', 'c'])
      expect(getAllRecipeLabels(makeRecipe({}))).toEqual([])
    })
  })

  describe('categoryDisplayKey / filterOptionLabel', () => {
    it('maps known categories and lower-cases unknown ones', () => {
      expect(categoryDisplayKey('Labels')).toBe('labels')
      expect(categoryDisplayKey('Other')).toBe('other')
    })

    it('maps approved and empty station/course values to keys', () => {
      expect(filterOptionLabel('Approved', 'true')).toBe('approved_yes')
      expect(filterOptionLabel('Approved', 'false')).toBe('approved_no')
      expect(filterOptionLabel('Station', '_none')).toBe('no_station')
      expect(filterOptionLabel('Course', '_none')).toBe('no_course')
      expect(filterOptionLabel('Labels', 'vegan')).toBe('vegan')
    })
  })

  describe('recipeFilterValues', () => {
    const recipe = makeRecipe({ recipeType: 'dish', isApproved: true, defaultStation: ' ', course: 'main' })

    it('returns the values per category', () => {
      expect(recipeFilterValues(recipe, 'Type', [])).toEqual(['dish'])
      expect(recipeFilterValues(recipe, 'Allergens', ['gluten'])).toEqual(['gluten'])
      expect(recipeFilterValues(recipe, 'Labels', [])).toEqual(['no_label'])
      expect(recipeFilterValues(recipe, 'Approved', [])).toEqual(['true'])
      expect(recipeFilterValues(recipe, 'Station', [])).toEqual(['_none'])
      expect(recipeFilterValues(recipe, 'Course', [])).toEqual(['main'])
      expect(recipeFilterValues(recipe, 'Unknown', [])).toEqual([])
    })

    it('counts a course that is no longer a dish type as no course', () => {
      expect(recipeFilterValues(recipe, 'Course', [], new Set(['main']))).toEqual(['main'])
      expect(recipeFilterValues(recipe, 'Course', [], new Set(['starter']))).toEqual(['_none'])
      expect(recipeFilterValues(recipe, 'Course', [], new Set())).toEqual(['main'])
    })
  })

  describe('date helpers', () => {
    it('parses YYYY-MM-DD to local start and end of day', () => {
      expect(parseDateToStartOfDay('2026-10-10')).toBe(new Date(2026, 9, 10).getTime())
      expect(parseDateToEndOfDay('2026-10-10')).toBe(new Date(2026, 9, 10, 23, 59, 59, 999).getTime())
      expect(parseDateToStartOfDay('bad')).toBeNull()
      expect(parseDateToEndOfDay('2026-xx-01')).toBeNull()
    })

    it('formats or returns a dash when missing', () => {
      expect(formatShortDate(undefined)).toBe('—')
      expect(formatShortDate(1700000000000)).toMatch(/\d/)
      expect(formatDateTime(undefined)).toBe('—')
      expect(formatDateTime(1700000000000)).toMatch(/\d/)
    })
  })

  describe('product containment', () => {
    const sub = makeRecipe({
      _id: 'sub',
      ingredients: [{ _id: 'i2', referenceId: 'p2', type: 'product', amount: 1, unit: 'gram' }]
    } as unknown as Partial<Recipe>)
    const top = makeRecipe({
      _id: 'top',
      ingredients: [
        { _id: 'i1', referenceId: 'p1', type: 'product', amount: 1, unit: 'gram' },
        { _id: 'i3', referenceId: 'sub', type: 'recipe', amount: 1, unit: 'gram' }
      ]
    } as unknown as Partial<Recipe>)
    const byId = new Map([
      ['sub', sub],
      ['top', top]
    ])

    it('collects product ids through sub-recipes', () => {
      expect([...getRecipeProductIds(top, byId)].sort()).toEqual(['p1', 'p2'])
    })

    it('checks that every selected product is used', () => {
      expect(recipeContainsAllProducts(top, [], byId)).toBeTrue()
      expect(recipeContainsAllProducts(top, ['p1', 'p2'], byId)).toBeTrue()
      expect(recipeContainsAllProducts(top, ['p3'], byId)).toBeFalse()
    })
  })

  describe('compareRecipes', () => {
    const deps: RecipeCompareDeps = {
      translate: (k) => k,
      cost: (r) => (r._id === 'a' ? 5 : 10),
      allergens: () => []
    }
    const a = makeRecipe({ _id: 'a', nameHebrew: 'א', createdAt: 1, updatedAt: 3, rating: 2 })
    const b = makeRecipe({ _id: 'b', nameHebrew: 'ב', createdAt: 2, updatedAt: 1, rating: 4 })

    it('orders by the chosen column ascending', () => {
      expect(compareRecipes(a, b, 'name', deps)).toBeLessThan(0)
      expect(compareRecipes(a, b, 'cost', deps)).toBeLessThan(0)
      expect(compareRecipes(a, b, 'dateAdded', deps)).toBeLessThan(0)
      expect(compareRecipes(a, b, 'dateUpdated', deps)).toBeGreaterThan(0)
      expect(compareRecipes(a, b, 'rating', deps)).toBeLessThan(0)
    })
  })
})
