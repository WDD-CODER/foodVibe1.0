'use strict'
/** Plan 637 - the pure rules of the stock extract: numbered lists, cleaning of the model's answer, the kept ratio. */
const {
  STOCK_EXTRACT_SYSTEM_PROMPT, unitList, userPart, cleanStockLines, stockKeptRatio,
} = require('../utils/stock-extract')
const { unitRatesFrom } = require('../generated/schemas/units/to-base')

const rates = unitRatesFrom([])
const flour = { _id: 'flour', nameHebrew: 'קמח', baseUnit: 'kg', purchaseOptions: [] }
const tomato = { _id: 'tomato', nameHebrew: 'עגבניות', baseUnit: 'kg', purchaseOptions: [{ unitSymbol: 'crate', conversionRate: 10 }] }
const products = [flour, tomato]
const units = ['kg', 'liter', 'crate']
const clean = lines => cleanStockLines({ lines }, products, units, rates)
const entry = (p, quantity, u, spoken = 'x') => ({ p, spoken, quantity, u })

describe('unitList and userPart', () => {
  it('lists system units, term keys and pack units once each', () => {
    const list = unitList(products, ['kg', 'box'])
    expect(list.slice(0, 3)).toEqual(['kg', 'liter', 'gram'])
    expect(list.filter(u => u === 'kg')).toHaveLength(1)
    expect(list).toContain('box')
    expect(list).toContain('crate')
    expect(unitList([], Array.from({ length: 500 }, (_, i) => `u${i}`))).toHaveLength(200)
  })

  it('numbers both lists from 0 and puts the count last', () => {
    const text = userPart(products, ['kg', 'crate'], 'קמח 4')
    expect(text).toBe('PRODUCTS:\n0. "קמח" [kg]\n1. "עגבניות" [kg]\n\nUNITS:\n0. "kg"\n1. "crate"\n\nCOUNT:\nקמח 4')
    expect(STOCK_EXTRACT_SYSTEM_PROMPT).not.toContain('קמח 4')
  })
})

describe('cleanStockLines', () => {
  it('keeps a good line and defaults the unit to the base unit', () => {
    expect(clean([entry(0, 4, 0), entry(1, 3, null)])).toEqual({
      lines: [{ productId: 'flour', quantity: 4, unit: 'kg' }, { productId: 'tomato', quantity: 3, unit: 'kg' }],
      unmatched: [],
    })
  })

  it('sends a unit the product cannot convert to unmatched', () => {
    expect(clean([entry(0, 2, 1, 'קמח')])).toEqual({ lines: [], unmatched: [{ spoken: 'קמח', quantity: 2, unit: 'liter' }] })
  })

  it('sends a bad position, a null position and a missing number to unmatched', () => {
    const out = clean([entry(99, 1, 0, 'a'), entry(null, 2, null, 'b'), entry(0, null, 0, 'c'), entry(-1, 1, 7, 'd')])
    expect(out.lines).toEqual([])
    expect(out.unmatched).toEqual([
      { spoken: 'a', quantity: 1, unit: 'kg' }, { spoken: 'b', quantity: 2 }, { spoken: 'c' }, { spoken: 'd', quantity: 1 },
    ])
  })

  it('skips an unmatched entry with no spoken words, and cuts spoken at 80 characters', () => {
    const out = clean([entry(null, 1, null, '  '), entry(null, 1, null, 'y'.repeat(100))])
    expect(out.unmatched).toHaveLength(1)
    expect(out.unmatched[0].spoken).toHaveLength(80)
  })

  it('refuses a quantity that is negative or over 1,000,000', () => {
    expect(clean([entry(0, -1, 0, 'a'), entry(1, 1_000_001, 0, 'b')]).unmatched).toEqual([{ spoken: 'a' }, { spoken: 'b' }])
    expect(clean([entry(0, 0, 0)]).lines).toEqual([{ productId: 'flour', quantity: 0, unit: 'kg' }])
  })

  it('sums the same product in the same unit; another unit goes to unmatched', () => {
    const out = clean([entry(0, 1.1, 0), entry(0, 2.2, 0), entry(1, 1, 2, 'c1'), entry(1, 5, 0, 'c2')])
    expect(out.lines).toEqual([{ productId: 'flour', quantity: 3.3, unit: 'kg' }, { productId: 'tomato', quantity: 1, unit: 'crate' }])
    expect(out.unmatched).toEqual([{ spoken: 'c2', quantity: 5, unit: 'kg' }])
  })

  it('returns null for an answer that is not { lines: [...] } and reads only the first 800 entries', () => {
    expect(cleanStockLines({ nope: 1 }, products, units, rates)).toBeNull()
    expect(cleanStockLines(null, products, units, rates)).toBeNull()
    const many = Array.from({ length: 900 }, () => entry(null, null, null, 'z'))
    expect(clean(many).unmatched).toHaveLength(200)
    expect(clean([{}]).unmatched).toEqual([])
  })
})

describe('stockKeptRatio', () => {
  const line = (productId, quantity, unit = 'kg') => ({ productId, quantity, unit })
  const draft = { lines: [line('flour', 4), line('tomato', 3)], unmatched: [{ spoken: 'z' }] }

  it('is 0.5 when one of two suggestions was saved unchanged, 1 when both, 0 when none', () => {
    expect(stockKeptRatio(draft, { lines: [line('flour', 4), line('tomato', 5)] })).toBe(0.5)
    expect(stockKeptRatio(draft, { lines: [line('flour', 4), line('tomato', 3)] })).toBe(1)
    expect(stockKeptRatio(draft, { lines: [line('flour', 4, 'gram')] })).toBe(0)
    expect(stockKeptRatio({ lines: [], unmatched: [] }, { lines: [line('flour', 4)] })).toBe(0)
  })

  it('ignores lines added by hand and rounds to 4 decimals', () => {
    expect(stockKeptRatio(draft, { lines: [line('flour', 4), line('tomato', 3), line('rice', 1)] })).toBe(1)
    const third = { lines: [line('a', 1), line('b', 1), line('c', 1)] }
    expect(stockKeptRatio(third, { lines: [line('a', 1)] })).toBe(0.3333)
  })
})
