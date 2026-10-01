import { recipeSchema } from '@schemas/entities'
import { upgradeV1toV2 } from '@schemas/upgrade/upgrade'
import type { Recipe } from './index'

describe('v2 inferred types', () => {
  it('upgradeV1toV2 output parses into the inferred Recipe type', () => {
    const { doc } = upgradeV1toV2('DISH_LIST', {
      _id: 'r1',
      userId: 'u1',
      name_hebrew: 'x',
      ingredients_: [],
      steps_: [],
      yield_amount_: 1,
      yield_unit_: 'kg',
      default_station_: 'cold',
      is_approved_: true,
      addedAt_: 1,
      updatedAt_: 2
    })
    const parsed = recipeSchema.safeParse(doc)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      const recipe: Recipe = parsed.data
      expect(recipe.kind).toBe('dish')
      expect(recipe.schemaVersion).toBe(2)
    }
  })
})
