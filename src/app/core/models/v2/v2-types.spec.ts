import { recipeSchema } from '@schemas/entities'
import { upgradeV1toV2 } from '@schemas/upgrade/upgrade'
import type { Recipe } from './index'
import { v2ConformsToClient } from './conformance'

describe('v2 inferred types', () => {
  it('client view interfaces conform to the schema types', () => {
    expect(v2ConformsToClient.length).toBe(6)
  })

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
    // businessId and createdBy are stamped by migration 0006, after the v1 upgrade (plan 424)
    const parsed = recipeSchema.safeParse({ ...doc, businessId: 'b1', createdBy: 'u1' })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      const recipe: Recipe = parsed.data
      expect(recipe.schemaVersion).toBe(2)
    }
  })
})
