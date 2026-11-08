'use strict'
/** Plan 536 - the recipe line's supplier and the event's supplier moves pass the schema; 501 moves do not. */

const { recipeSchema, menuEventSchema } = require('../generated/schemas/entities')
const { recipeBody, menuEventBody, stored } = require('./helpers/v2-docs')

const line = (extra = {}) => ({ _id: 'l1', referenceId: 'p1', type: 'product', amount: 2, unit: 'kg', ...extra })
const move = (i = 0) => ({ productId: `p${i}`, fromSupplierId: 's1', toSupplierId: 's2' })

describe('plan 536 supplier fields', () => {
  it('accepts a recipe line with and without supplierId', () => {
    const withSupplier = stored(recipeBody({ ingredients: [line({ supplierId: 's1' })] }), { _id: 'r1', userId: 'u1' })
    const without = stored(recipeBody({ ingredients: [line()] }), { _id: 'r2', userId: 'u1' })
    expect(recipeSchema.safeParse(withSupplier).success).toBe(true)
    expect(recipeSchema.safeParse(without).success).toBe(true)
  })

  it('accepts an event with moves, rejects 501 moves and an unknown move key', () => {
    const ev = (supplierMoves) => stored(menuEventBody({ supplierMoves }), { _id: 'e1', userId: 'u1' })
    expect(menuEventSchema.safeParse(ev([move()])).success).toBe(true)
    expect(menuEventSchema.safeParse(ev(Array.from({ length: 500 }, (_, i) => move(i)))).success).toBe(true)
    expect(menuEventSchema.safeParse(ev(Array.from({ length: 501 }, (_, i) => move(i)))).success).toBe(false)
    expect(menuEventSchema.safeParse(ev([{ ...move(), extra: 1 }])).success).toBe(false)
  })
})
