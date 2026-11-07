'use strict'
/**
 * Plan 526 — 0010 planning step (pure, no DB): which v1 entity collections to drop and when to refuse.
 */

const { planDrop, V1_COLLECTIONS } = require('../migrations/0010-drop-v1-collections')

const allV2 = { products: 5, recipes: 5, dishes: 5, suppliers: 5, equipment: 5, venues: 5, menuEvents: 5 }

describe('0010 planDrop', () => {
  test('covers all seven v1 entity collections', () => {
    expect(V1_COLLECTIONS).toEqual(expect.arrayContaining([
      'PRODUCT_LIST', 'RECIPE_LIST', 'DISH_LIST', 'KITCHEN_SUPPLIERS', 'EQUIPMENT_LIST', 'VENUE_PROFILES', 'MENU_EVENT_LIST',
    ]))
    expect(V1_COLLECTIONS).toHaveLength(7)
  })

  test('drops every present v1 collection when the v2 copies have data', () => {
    const counts = Object.fromEntries(V1_COLLECTIONS.map(c => [c, 5]))
    expect(planDrop({ present: V1_COLLECTIONS, counts, v2Counts: allV2, has0001: true }))
      .toEqual({ drop: V1_COLLECTIONS, refuse: [] })
  })

  test('refuses without the 0001 marker', () => {
    const { refuse } = planDrop({ present: ['PRODUCT_LIST'], counts: { PRODUCT_LIST: 5 }, v2Counts: allV2, has0001: false })
    expect(refuse).toHaveLength(1)
    expect(refuse[0]).toMatch(/0001-v2-schema/)
  })

  test('refuses a non-empty v1 whose v2 is missing', () => {
    const { refuse } = planDrop({
      present: ['RECIPE_LIST'], counts: { RECIPE_LIST: 3 }, v2Counts: { ...allV2, recipes: undefined }, has0001: true,
    })
    expect(refuse).toEqual(['RECIPE_LIST has 3 doc(s) but recipes is missing'])
  })

  test('refuses a non-empty v1 whose v2 is empty', () => {
    const { refuse } = planDrop({
      present: ['DISH_LIST'], counts: { DISH_LIST: 2 }, v2Counts: { ...allV2, dishes: 0 }, has0001: true,
    })
    expect(refuse).toEqual(['DISH_LIST has 2 doc(s) but dishes is empty'])
  })

  test('drops an empty v1 even when its v2 is empty', () => {
    expect(planDrop({ present: ['VENUE_PROFILES'], counts: { VENUE_PROFILES: 0 }, v2Counts: { ...allV2, venues: 0 }, has0001: true }))
      .toEqual({ drop: ['VENUE_PROFILES'], refuse: [] })
  })

  test('nothing to drop when no v1 collection is present', () => {
    expect(planDrop({ present: [], counts: {}, v2Counts: allV2, has0001: true })).toEqual({ drop: [], refuse: [] })
  })
})
