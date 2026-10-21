'use strict'
/** Plan 432 - the pure cleaning rules for an AI-read supplier price list. No database, no AI call. */

const { normalizePriceListRows, normalizeProductName, toBaseUnit, MAX_IMPORT_ROWS } = require('../utils/price-list-import')

const row = overrides => ({ name: 'עגבנייה', unit: 'kg', price: 5, pricePer: 'unit', ...overrides })
const clean = rows => normalizePriceListRows({ rows })

describe('normalizeProductName', () => {
  it('trims, collapses spaces and lower-cases Latin', () => {
    expect(normalizeProductName('  שמנת   32% ')).toBe('שמנת 32%')
    expect(normalizeProductName(' Olive  OIL ')).toBe('olive oil')
  })
})

describe('normalizePriceListRows', () => {
  it('drops a row without a name', () => {
    expect(clean([row({ name: '' }), row({ name: '   ' }), row({ name: undefined }), row({ name: 'מלפפון' })]).rows.map(r => r.name)).toEqual(['מלפפון'])
  })

  it('cuts a name longer than 200 characters to 200', () => {
    expect(clean([row({ name: 'א'.repeat(250) })]).rows[0].name).toHaveLength(200)
  })

  it('a missing or unknown unit becomes unit and needs review', () => {
    const [missing, unknown] = clean([row({ name: 'א', unit: null }), row({ name: 'ב', unit: 'ארגזון' })]).rows
    expect(missing).toMatchObject({ baseUnit: 'unit', needsReview: true })
    expect(unknown).toMatchObject({ baseUnit: 'unit', needsReview: true })
  })

  it('a known unit does not need review', () => {
    expect(clean([row()]).rows[0]).toMatchObject({ baseUnit: 'kg', needsReview: false, duplicate: false })
  })

  it.each([
    ['ק"ג', 'kg'], ['קילו', 'kg'], ['לק"ג', 'kg'], ['קג', 'kg'], ['kg', 'kg'],
    ['גרם', 'gram'], ['ליטר', 'liter'], ['מ"ל', 'ml'],
    ["יח'", 'unit'], ['יחידה', 'unit'],
  ])('maps the unit word %s to %s', (word, key) => {
    expect(toBaseUnit(word)).toBe(key)
    expect(clean([row({ unit: word })]).rows[0].baseUnit).toBe(key)
  })

  it('a price of 0, a negative price, NaN or text becomes null', () => {
    const prices = [0, -3, NaN, 'abc', null, undefined].map(price => clean([row({ price })]).rows[0].price)
    expect(prices).toEqual([null, null, null, null, null, null])
  })

  it('a numeric string price is read', () => {
    expect(clean([row({ price: '5.9' })]).rows[0].price).toBe(5.9)
  })

  it('a price per purchase unit is turned into a price per base unit', () => {
    const [result] = clean([row({ pricePer: 'purchaseUnit', purchaseQty: 10, purchaseUnit: 'ארגז', price: 50 })]).rows
    expect(result).toMatchObject({ price: 5, purchaseUnit: 'ארגז', purchaseQty: 10 })
  })

  it('a price per purchase unit without a quantity has no price and needs review', () => {
    expect(clean([row({ pricePer: 'purchaseUnit', price: 50 })]).rows[0]).toMatchObject({ price: null, needsReview: true })
  })

  it('a purchase unit without a quantity is dropped', () => {
    expect(clean([row({ purchaseUnit: 'ארגז' })]).rows[0]).toMatchObject({ purchaseUnit: null, purchaseQty: null })
  })

  it('two rows with the same name become one: the last, marked duplicate', () => {
    const { rows } = clean([row({ price: 5 }), row({ name: 'מלפפון', price: 4 }), row({ name: ' עגבנייה ', price: 7 })])
    expect(rows.map(r => [r.name, r.price, r.duplicate])).toEqual([['מלפפון', 4, false], ['עגבנייה', 7, true]])
  })

  it('201 rows become 200 and the result is truncated', () => {
    const rows = Array.from({ length: 201 }, (_, i) => row({ name: `מוצר ${i}` }))
    const result = clean(rows)
    expect(result.rows).toHaveLength(MAX_IMPORT_ROWS)
    expect(result.truncated).toBe(true)
    expect(clean(rows.slice(0, 200)).truncated).toBe(false)
  })

  it('anything that is not a list gives no rows', () => {
    expect(normalizePriceListRows(null)).toEqual({ rows: [], truncated: false })
    expect(normalizePriceListRows({ rows: 'x' })).toEqual({ rows: [], truncated: false })
    expect(clean([null, 5, 'x']).rows).toEqual([])
  })
})
