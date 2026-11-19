'use strict'
/** Plan 633 — the margin report and the price movement, on the compiled shared files. */
const { buildMarginReport } = require('../generated/schemas/diag/margin-report')
const { priceVolatility } = require('../generated/schemas/diag/volatility')
const { menuKeptRatio, menuPricesReplySchema } = require('../generated/schemas/diag/menu-draft')

const base = { volatility: [], settings: { profitTargetPct: 70 }, pricesIncludeVat: true, vatPct: 18 }

describe('buildMarginReport', () => {
  it('takes VAT off, computes the margin and the price to charge', () => {
    const r = buildMarginReport({ ...base, menu: [{ name: 'a', sellPrice: 118, dishId: 'd1' }], costByDishId: { d1: 30 } })
    expect(r.dishes[0]).toMatchObject({ netPrice: 100, marginPct: 70, suggestedPrice: 118, cost: 30, underTarget: false })
  })
  it('without VAT the net price is the printed price and the suggestion has no VAT', () => {
    const r = buildMarginReport({ ...base, pricesIncludeVat: false, menu: [{ name: 'a', sellPrice: 118, dishId: 'd1' }], costByDishId: { d1: 30 } })
    expect(r.dishes[0].netPrice).toBe(118)
    expect(r.dishes[0].suggestedPrice).toBe(100)
  })
  it('underTarget only below the target', () => {
    const r = buildMarginReport({ ...base, menu: [{ name: 'a', sellPrice: 118, dishId: 'd1' }, { name: 'b', sellPrice: 118, dishId: 'd2' }], costByDishId: { d1: 30, d2: 31 } })
    expect(r.dishes.map(d => d.underTarget)).toEqual([false, true])
  })
  it('a row without a dish or a cost has no margin and no suggestion', () => {
    const r = buildMarginReport({ ...base, menu: [{ name: 'a', sellPrice: 50 }, { name: 'b', sellPrice: 50, dishId: 'd9' }, { name: 'c', sellPrice: 50, dishId: 'd1' }], costByDishId: { d1: 0 } })
    for (const d of r.dishes) {
      expect(d.marginPct).toBeUndefined()
      expect(d.suggestedPrice).toBeUndefined()
      expect(d.underTarget).toBe(false)
    }
  })
  it('a target of 100 gives no suggested price', () => {
    const r = buildMarginReport({ ...base, settings: { profitTargetPct: 100 }, menu: [{ name: 'a', sellPrice: 118, dishId: 'd1' }], costByDishId: { d1: 30 } })
    expect(r.dishes[0].suggestedPrice).toBeUndefined()
    expect(r.dishes[0].marginPct).toBe(70)
  })
  it('the three findings carry their evidence', () => {
    const r = buildMarginReport({
      ...base,
      menu: [{ name: 'a', sellPrice: 118, dishId: 'd1' }, { name: 'b', sellPrice: 118, dishId: 'd2' }, { name: 'c', sellPrice: 10 }],
      costByDishId: { d1: 30, d2: 60 },
      volatility: [{ productId: 'p1', supplierId: 's1', movePct: 12.5, points: 4 }],
    })
    expect(r.findings).toEqual([
      { key: 'dishes_under_target', value: 1, evidenceCount: 2 },
      { key: 'dishes_without_cost', value: 1, evidenceCount: 3 },
      { key: 'top_price_move', value: { productId: 'p1', supplierId: 's1', movePct: 12.5 }, evidenceCount: 4 },
    ])
  })
  it('top_price_move needs the alert threshold (default 5)', () => {
    const v = [{ productId: 'p1', supplierId: '', movePct: 4, points: 2 }]
    expect(buildMarginReport({ ...base, menu: [], costByDishId: {}, volatility: v }).findings).toEqual([])
    expect(buildMarginReport({ ...base, settings: { profitTargetPct: 70, priceRiseAlertPct: 3 }, menu: [], costByDishId: {}, volatility: v }).findings).toHaveLength(1)
  })
})

describe('priceVolatility', () => {
  it('groups by product and supplier, skips one point and a zero minimum, orders by movePct, two decimals', () => {
    const rows = [
      { productId: 'a', supplierId: 's', price: 10 }, { productId: 'a', supplierId: 's', price: 15 }, { productId: 'a', supplierId: 's', price: 12 },
      { productId: 'a', supplierId: 't', price: 3 }, { productId: 'a', supplierId: 't', price: 4 },
      { productId: 'b', supplierId: 's', price: 7 },
      { productId: 'c', supplierId: 's', price: 0 }, { productId: 'c', supplierId: 's', price: 5 },
    ]
    expect(priceVolatility(rows)).toEqual([
      { productId: 'a', supplierId: 't', min: 3, max: 4, movePct: 33.33, points: 2 },
      { productId: 'a', supplierId: 's', min: 10, max: 15, movePct: 50, points: 3 },
    ].sort((x, y) => y.movePct - x.movePct))
    expect(priceVolatility(rows, 1)).toHaveLength(1)
  })
})

describe('menu draft helpers', () => {
  it('menuKeptRatio counts items kept by name and price', () => {
    const draft = { items: [{ name: 'a', sellPrice: 1 }, { name: 'b', sellPrice: null }] }
    expect(menuKeptRatio(draft, { items: [{ name: 'a', sellPrice: 1 }, { name: 'b', sellPrice: 5 }] })).toBe(0.5)
    expect(menuKeptRatio({ items: [] }, { items: [] })).toBe(0)
  })
  it('the reply schema refuses an extra field', () => {
    expect(menuPricesReplySchema.safeParse({ items: [{ name: 'a', sellPrice: 1, extra: 1 }] }).success).toBe(false)
    expect(menuPricesReplySchema.safeParse({ items: [{ name: 'a', sellPrice: null }] }).success).toBe(true)
  })
})
