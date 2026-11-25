'use strict'
/** Plan 724: the three dish analysis schemas, the net price rule and the return reason list. Pure schema tests. */

const S = require('../generated/schemas')
const { netPriceOf } = require('../generated/schemas/dish-analysis/net-price')

const base = { schemaVersion: 2, businessId: 'b1', createdBy: 'u1', createdAt: 1, updatedAt: 1 }
const dishDoc = over => ({ ...base, _id: 'd1', name: 'שניצל', costSource: 'units', active: true, ...over })
const row = over => ({ menuDishId: 'd1', nameSnapshot: 'שניצל', sold: 10, returned: 3, returnReasons: [], source: 'typed', ...over })
const monthDoc = over => ({ ...base, _id: 'm1', month: '2026-10', rows: [row()], ...over })
const aliasDoc = over => ({ ...base, _id: 'a1', name: 'שניצל גדול', nameKey: 'שניצל גדול', action: 'dish', menuDishId: 'd1', portionFactor: 1, hits: 0, ...over })

const dish = S.SCHEMA_BY_COLLECTION.menuDishes
const month = S.SCHEMA_BY_COLLECTION.dishSalesMonths
const alias = S.SCHEMA_BY_COLLECTION.dishSalesAliases
const passes = (schema, doc) => schema.safeParse(doc).success

describe('registry', () => {
  it('registers the three schemas', () => {
    expect(dish).toBe(S.menuDishSchema)
    expect(month).toBe(S.dishSalesMonthSchema)
    expect(alias).toBe(S.dishSalesAliasSchema)
  })
})

describe('menuDishes', () => {
  const full = {
    recipe: dishDoc({ costSource: 'recipe', recipeId: 'r1', course: 'main', priceWithVat: 118, note: 'x' }),
    product: dishDoc({ costSource: 'product', productId: 'p1', productAmount: 0.2, productUnit: 'kg' }),
    typed: dishDoc({ costSource: 'typed', typedCost: 12.5 }),
    units: dishDoc({ costSource: 'units' }),
  }

  it.each(Object.keys(full))('a full valid %s dish passes and an unknown key is refused', key => {
    expect(passes(dish, full[key])).toBe(true)
    expect(passes(dish, { ...full[key], surprise: 1 })).toBe(false)
  })

  it.each([
    ['recipe without recipeId', dishDoc({ costSource: 'recipe' })],
    ['product without productId', dishDoc({ costSource: 'product', productAmount: 1, productUnit: 'kg' })],
    ['product without productAmount', dishDoc({ costSource: 'product', productId: 'p1', productUnit: 'kg' })],
    ['product without productUnit', dishDoc({ costSource: 'product', productId: 'p1', productAmount: 1 })],
    ['typed without typedCost', dishDoc({ costSource: 'typed' })],
    ['recipe carrying typedCost', dishDoc({ costSource: 'recipe', recipeId: 'r1', typedCost: 3 })],
    ['typed carrying recipeId', dishDoc({ costSource: 'typed', typedCost: 3, recipeId: 'r1' })],
    ['units carrying productId', dishDoc({ costSource: 'units', productId: 'p1' })],
    ['an empty name', dishDoc({ name: '  ' })],
    ['a price of 100001', dishDoc({ priceWithVat: 100001 })],
  ])('refuses %s', (_name, doc) => {
    expect(passes(dish, doc)).toBe(false)
  })

  it('a price is optional and active defaults to true', () => {
    const { active, ...rest } = dishDoc()
    const parsed = dish.safeParse(rest)
    expect(parsed.success).toBe(true)
    expect(parsed.data.active).toBe(true)
  })
})

describe('dishSalesMonths', () => {
  it('a full valid month passes and an unknown key is refused', () => {
    const doc = monthDoc({
      note: 'חודש טוב',
      rows: [row({ returnReasons: [{ reason: 'comp', count: 1 }, { reason: 'other', count: 2, note: 'נשפך' }], netSales: 1000 })],
      closedAt: 5,
      closedBy: 'u1',
      frozen: {
        at: 5, vatRatePct: 18, dealerType: 'murshe',
        dishes: [{ menuDishId: 'd1', name: 'שניצל', course: 'main', priceWithVat: 118, costPerPortion: 20, costSource: 'recipe', partial: false }],
      },
      skipped: [{ name: 'מים', units: 4 }],
    })
    expect(passes(month, doc)).toBe(true)
    expect(passes(month, { ...doc, surprise: 1 })).toBe(false)
  })

  it('sold: null and sold: 0 both pass; so do returned null and 0', () => {
    expect(passes(month, monthDoc({ rows: [row({ sold: null, returned: null })] }))).toBe(true)
    expect(passes(month, monthDoc({ rows: [row({ sold: 0, returned: 0 })] }))).toBe(true)
  })

  it.each([
    ['month 2026-13', monthDoc({ month: '2026-13' })],
    ['month 2026-00', monthDoc({ month: '2026-00' })],
    ['two rows with one menuDishId', monthDoc({ rows: [row(), row()] })],
    ['reason counts above returned', monthDoc({ rows: [row({ returned: 2, returnReasons: [{ reason: 'comp', count: 1 }, { reason: 'expired', count: 2 }] })] })],
    ['a reason row on returned null', monthDoc({ rows: [row({ returned: null, returnReasons: [{ reason: 'comp', count: 1 }] })] })],
    ['a repeated reason', monthDoc({ rows: [row({ returned: 5, returnReasons: [{ reason: 'comp', count: 1 }, { reason: 'comp', count: 1 }] })] })],
    ['other without a note', monthDoc({ rows: [row({ returnReasons: [{ reason: 'other', count: 1 }] })] })],
    ['a negative sold', monthDoc({ rows: [row({ sold: -1 })] })],
    ['a fractional sold', monthDoc({ rows: [row({ sold: 1.5 })] })],
    ['301 rows', monthDoc({ rows: Array.from({ length: 301 }, (_, i) => row({ menuDishId: 'd' + i })) })],
  ])('refuses %s', (_name, doc) => {
    expect(passes(month, doc)).toBe(false)
  })

  it('the return reasons list and the server fields are as named', () => {
    expect(S.DISH_RETURN_REASONS).toEqual(['guest_returned', 'kitchen_mistake', 'staff_meal', 'comp', 'expired', 'other'])
    expect(S.DISH_MONTH_SERVER_FIELDS).toEqual(['closedAt', 'closedBy', 'frozen', 'skipped'])
    expect(S.MONTH_KEY_PATTERN.test('2026-12')).toBe(true)
  })
})

describe('dishSalesAliases', () => {
  it('a full valid alias passes and an unknown key is refused', () => {
    const doc = aliasDoc({ portionFactor: 0.5, hits: 3, lastSeenAt: 9 })
    expect(passes(alias, doc)).toBe(true)
    expect(passes(alias, { ...doc, surprise: 1 })).toBe(false)
    expect(passes(alias, aliasDoc({ action: 'skip', menuDishId: undefined }))).toBe(true)
  })

  it.each([
    ['skip with a menuDishId', aliasDoc({ action: 'skip' })],
    ['dish without a menuDishId', aliasDoc({ menuDishId: undefined })],
    ['portionFactor 0', aliasDoc({ portionFactor: 0 })],
    ['portionFactor 1.005', aliasDoc({ portionFactor: 1.005 })],
    ['portionFactor 21', aliasDoc({ portionFactor: 21 })],
    ['an empty name', aliasDoc({ name: '' })],
    ['an unknown action', aliasDoc({ action: 'merge' })],
  ])('refuses %s', (_name, doc) => {
    expect(passes(alias, doc)).toBe(false)
  })
})

describe('netPriceOf', () => {
  it('divides a murshe price by the VAT and leaves a patur price alone', () => {
    expect(netPriceOf(118, 18, 'murshe')).toBe(100)
    expect(netPriceOf(118, 18, 'patur')).toBe(118)
    expect(netPriceOf(100, 17, 'murshe')).toBe(85.47)
  })
})
