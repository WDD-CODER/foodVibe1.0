'use strict'
/** Plans 637 and 648 - the pure rules of the stock extract: unit list, the server name match, the kept ratio. */
const {
  STOCK_EXTRACT_SYSTEM_PROMPT, unitList, userPart, cleanStockLines, stockKeptRatio,
} = require('../utils/stock-extract')
const { unitRatesFrom } = require('../generated/schemas/units/to-base')

const rates = unitRatesFrom([])
const flour = { _id: 'flour', nameHebrew: 'קמח', baseUnit: 'kg', purchaseOptions: [] }
const tomato = { _id: 'tomato', nameHebrew: 'עגבניות', baseUnit: 'kg', purchaseOptions: [{ unitSymbol: 'crate', conversionRate: 10 }] }
const products = [flour, tomato]
const units = ['kg', 'liter', 'crate']
const clean = (lines, list = products) => cleanStockLines({ lines }, list, units, rates)
const entry = (spoken, quantity, unit) => ({ spoken, quantity, unit })

describe('unitList and userPart', () => {
  it('lists system units, term keys and pack units once each', () => {
    const list = unitList(products, ['kg', 'box'])
    expect(list.slice(0, 3)).toEqual(['kg', 'liter', 'gram'])
    expect(list.filter(u => u === 'kg')).toHaveLength(1)
    expect(list).toContain('box')
    expect(list).toContain('crate')
    expect(unitList([], Array.from({ length: 500 }, (_, i) => `u${i}`))).toHaveLength(200)
  })

  it('numbers the units from 0, puts the count last and carries no product name', () => {
    const text = userPart(['kg', 'crate'], 'קמח 4')
    expect(text).toBe('UNITS:\n0. "kg"\n1. "crate"\n\nCOUNT:\nקמח 4')
    expect(STOCK_EXTRACT_SYSTEM_PROMPT).not.toContain('קמח 4')
    expect(STOCK_EXTRACT_SYSTEM_PROMPT).not.toContain('PRODUCTS')
  })
})

describe('cleanStockLines', () => {
  it('matches the spoken name to a product and defaults the unit to the base unit', () => {
    expect(clean([entry('קמח', 4, 'kg'), entry('עגבניות', 3, null)])).toEqual({
      lines: [{ productId: 'flour', quantity: 4, unit: 'kg' }, { productId: 'tomato', quantity: 3, unit: 'kg' }],
      unmatched: [],
    })
  })

  it('matches ignoring case and spaces, then by contained name, then by shared words', () => {
    const list = [
      { _id: 'a', nameHebrew: 'Olive Oil', baseUnit: 'liter', purchaseOptions: [] },
      { _id: 'b', nameHebrew: 'שמן זית מעולה', baseUnit: 'liter', purchaseOptions: [] },
      { _id: 'c', nameHebrew: 'פלפל אדום חריף', baseUnit: 'kg', purchaseOptions: [] },
    ]
    expect(clean([entry('  olive   OIL ', 1, null)], list).lines).toEqual([{ productId: 'a', quantity: 1, unit: 'liter' }])
    expect(clean([entry('שמן זית', 2, null)], list).lines).toEqual([{ productId: 'b', quantity: 2, unit: 'liter' }])
    expect(clean([entry('פלפל חריף', 3, null)], list).lines).toEqual([{ productId: 'c', quantity: 3, unit: 'kg' }])
  })

  it('a name that matches two products is a choice with both as candidates (at most 5)', () => {
    const two = [
      { _id: 'w', nameHebrew: 'קמח לבן', baseUnit: 'kg', purchaseOptions: [] },
      { _id: 'x', nameHebrew: 'קמח מלא', baseUnit: 'kg', purchaseOptions: [] },
    ]
    expect(clean([entry('קמח', 4, 'kg')], two)).toEqual({
      lines: [],
      unmatched: [{ spoken: 'קמח', status: 'choose', quantity: 4, unit: 'kg', candidates: [
        { productId: 'w', nameHebrew: 'קמח לבן' }, { productId: 'x', nameHebrew: 'קמח מלא' },
      ] }],
    })
    const many = Array.from({ length: 9 }, (_, i) => ({ _id: `p${i}`, nameHebrew: `קמח ${i}`, baseUnit: 'kg', purchaseOptions: [] }))
    expect(clean([entry('קמח', 1, null)], many).unmatched[0].candidates).toHaveLength(5)
  })

  it('plan 651: a unit the product cannot convert to is a line with unitNeedsFix and the spoken unit', () => {
    expect(clean([entry('קמח', 2, 'liter')])).toEqual({
      lines: [{ productId: 'flour', quantity: 2, unit: null, unitNeedsFix: true, spokenUnit: 'liter' }],
      unmatched: [],
    })
  })

  it('sends an unknown name and a missing number to unmatched; a unit not on the list is dropped', () => {
    const out = clean([entry('banana', 1, 'kg'), entry('חמוצים', 2, null), entry('קמח', null, 'kg'), entry('banana', 1, 'bucket')])
    expect(out.lines).toEqual([])
    const flourCandidate = [{ productId: 'flour', nameHebrew: 'קמח' }]
    expect(out.unmatched).toEqual([
      { spoken: 'banana', status: 'unmatched', quantity: 1, unit: 'kg' },
      { spoken: 'חמוצים', status: 'unmatched', quantity: 2 },
      { spoken: 'קמח', status: 'unmatched', candidates: flourCandidate },
      { spoken: 'banana', status: 'unmatched', quantity: 1, spokenUnit: 'bucket' },
    ])
  })

  it('never matches an empty name; skips an entry with no spoken words, and cuts spoken at 80 characters', () => {
    const out = clean([entry('  ', 1, null), entry('y'.repeat(100), 1, null)])
    expect(out.lines).toEqual([])
    expect(out.unmatched).toHaveLength(1)
    expect(out.unmatched[0].spoken).toHaveLength(80)
  })

  it('refuses a quantity that is negative or over 1,000,000', () => {
    expect(clean([entry('קמח', -1, 'kg'), entry('עגבניות', 1_000_001, 'kg')]).unmatched.map(u => u.spoken)).toEqual(['קמח', 'עגבניות'])
    expect(clean([entry('קמח', 0, 'kg')]).lines).toEqual([{ productId: 'flour', quantity: 0, unit: 'kg' }])
  })

  it('sums the same product in the same unit; another unit goes to unmatched', () => {
    const out = clean([entry('קמח', 1.1, 'kg'), entry('קמח', 2.2, 'kg'), entry('עגבניות', 1, 'crate'), entry('עגבניות', 5, 'kg')])
    expect(out.lines).toEqual([{ productId: 'flour', quantity: 3.3, unit: 'kg' }, { productId: 'tomato', quantity: 1, unit: 'crate' }])
    expect(out.unmatched).toHaveLength(1)
    expect(out.unmatched[0]).toMatchObject({ spoken: 'עגבניות', quantity: 5, unit: 'kg' })
  })

  describe('plan 650 — the best match, a choice, the nearest', () => {
    const p = (id, nameHebrew, extra = {}) => ({ _id: id, nameHebrew, baseUnit: 'kg', purchaseOptions: [], ...extra })

    it('(a) a plural matches the singular product as the single best match', () => {
      const out = clean([entry('עגבניות', 3, null)], [p('t', 'עגבניה'), p('o', 'בצל')])
      expect(out.lines).toEqual([{ productId: 't', quantity: 3, unit: 'kg' }])
      expect(out.unmatched).toEqual([])
      expect(clean([entry('עגבניה', 1, null)], [p('t', 'עגבניות')]).lines).toHaveLength(1)
      expect(clean([entry('תפוחים', 1, null)], [p('a', 'תפוח')]).lines).toHaveLength(1)
    })

    it('(b) a name that fits several products is a choice, best first, with all of them', () => {
      const out = clean([entry('בצל', 2, 'kg')], [p('p', 'בצל סגול'), p('y', 'בצל צהוב'), p('c', 'כרוב')])
      expect(out.lines).toEqual([])
      expect(out.unmatched).toHaveLength(1)
      expect(out.unmatched[0]).toMatchObject({ spoken: 'בצל', status: 'choose', quantity: 2, unit: 'kg' })
      expect(out.unmatched[0].candidates.map(c => c.productId).sort()).toEqual(['p', 'y'])
    })

    it('(c) a name with one product that starts with it is matched', () => {
      const out = clean([entry('בצל', 2, 'kg')], [p('d', 'בצל יבש'), p('c', 'כרוב')])
      expect(out.lines).toEqual([{ productId: 'd', quantity: 2, unit: 'kg' }])
    })

    it('plan 651: an exact name with longer names that start with it is still a choice, the exact one first', () => {
      const out = clean([entry('בצל', 1, null)], [p('d', 'בצל יבש'), p('o', 'בצל')])
      expect(out.lines).toEqual([])
      expect(out.unmatched[0].status).toBe('choose')
      expect(out.unmatched[0].candidates.map(c => c.productId)).toEqual(['o', 'd'])
    })

    it('plan 651 (a) «עגבניות» with three tomato products asks, the closest first', () => {
      const out = clean([entry('עגבניות', 3, null)], [p('s', 'עגבניות שרי'), p('t', 'עגבניה'), p('m', 'עגבניה תמר')])
      expect(out.lines).toEqual([])
      expect(out.unmatched[0].status).toBe('choose')
      expect(out.unmatched[0].candidates.map(c => c.productId)).toEqual(['t', 's', 'm'])
    })

    it('plan 651 (b) one avocado product is matched', () => {
      const out = clean([entry('אבוקדו', 2, null)], [p('a', 'אבוקדו'), p('t', 'עגבניה')])
      expect(out.lines).toEqual([{ productId: 'a', quantity: 2, unit: 'kg' }])
    })

    it('plan 651 (c) the spoken unit maps to a unit the product has, else it is flagged', () => {
      const crate = p('c', 'עגבניה', { baseUnit: 'gram', purchaseOptions: [{ unitSymbol: 'ארגז', conversionRate: 10000 }] })
      expect(clean([entry('עגבניה', 3, 'ארגזים')], [crate]).lines).toEqual([{ productId: 'c', quantity: 3, unit: 'ארגז' }])
      const plain = p('d', 'עגבניה', { baseUnit: 'gram' })
      expect(clean([entry('עגבניה', 3, 'ארגזים')], [plain])).toEqual({
        lines: [{ productId: 'd', quantity: 3, unit: null, unitNeedsFix: true, spokenUnit: 'ארגזים' }],
        unmatched: [],
      })
    })

    it('plan 651 (d) «קילו» on a product with kg is kg', () => {
      expect(clean([entry('קמח', 2, 'קילו')]).lines).toEqual([{ productId: 'flour', quantity: 2, unit: 'kg' }])
    })

    it('(d) no reasonable match is unmatched with up to 5 nearest products', () => {
      const list = Array.from({ length: 7 }, (_, i) => p(`n${i}`, `עגבנייתי${i}`))
      const out = clean([entry('עגבנית', 1, null)], [...list, p('z', 'שמן')])
      expect(out.lines).toEqual([])
      expect(out.unmatched[0].status).toBe('unmatched')
      expect(out.unmatched[0].candidates).toHaveLength(5)
      const none = clean([entry('xyz', 1, null)], [p('z', 'שמן')])
      expect(none.unmatched[0]).toEqual({ spoken: 'xyz', status: 'unmatched', quantity: 1 })
    })

    it('(e) a product counted before, or with a minimum, ranks above an equal-scoring one', () => {
      const list = [p('a', 'בצל אדום'), p('b', 'בצל לבן'), p('c', 'בצל ירוק', { minStockLevel: 3 })]
      const ids = out => out.unmatched[0].candidates.map(c => c.productId)
      expect(ids(clean([entry('בצל', 1, null)], list))).toEqual(['c', 'a', 'b'])
      const counted = cleanStockLines({ lines: [entry('בצל', 1, null)] }, list, units, rates, new Set(['b']))
      expect(ids(counted)).toEqual(['b', 'c', 'a'])
    })
  })

  it('returns null for an answer that is not { lines: [...] } and reads only the first 800 entries', () => {
    expect(cleanStockLines({ nope: 1 }, products, units, rates)).toBeNull()
    expect(cleanStockLines(null, products, units, rates)).toBeNull()
    const many = Array.from({ length: 900 }, () => entry('zzz', null, null))
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
