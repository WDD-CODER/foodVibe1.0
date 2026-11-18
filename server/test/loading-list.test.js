'use strict'
/** Plan 624 (C-LOAD) - buildLoadingList: the pure rule of the loading list. */
const { buildLoadingList } = require('../generated/schemas/logistics/loading-list')

const eq = (id, rule, extra = {}) => ({ _id: id, nameHebrew: 'צ' + id, ownedQuantity: 3, ...(rule && { scalingRule: rule }), ...extra })
const RULE = { perGuests: 50, minQuantity: 2, maxQuantity: 4 }
const build = (equipment, guestCount, answers = []) => buildLoadingList({ equipment, guestCount, answers })
const ans = (itemKey, extra = {}) => ({ itemKey, section: 's1', status: 'needed', payer: 'ours', ...extra })

describe('buildLoadingList - equipment rows', () => {
  it('150 guests: quantity 3, no shortage; 220 guests: quantity 4 (max), shortage 1', () => {
    expect(build([eq('a', RULE)], 150)[0]).toEqual({ key: 'eq:a', label: 'צa', source: 'equipment', quantity: 3, owned: 3, shortage: 0 })
    const r = build([eq('a', RULE)], 220)[0]
    expect(r.quantity).toBe(4)
    expect(r.shortage).toBe(1)
  })
  it('minQuantity holds at 10 guests; no max gives 10 at 500 guests', () => {
    expect(build([eq('a', RULE)], 10)[0].quantity).toBe(2)
    expect(build([eq('a', { perGuests: 50, minQuantity: 2 })], 500)[0].quantity).toBe(10)
  })
  it('no rule, perGuests 0, deleted record: no row', () => {
    expect(build([eq('a'), eq('b', { perGuests: 0, minQuantity: 0 }), eq('c', RULE, { deletedAt: 5 })], 100)).toEqual([])
  })
  it('a computed quantity of 0 gives no row; a bad guest count counts as 0', () => {
    expect(build([eq('a', { perGuests: 10, minQuantity: 0 })], NaN)).toEqual([])
    expect(build([eq('a', RULE)], -5)[0].quantity).toBe(2)
  })
  it('keeps the order given', () => {
    expect(build([eq('b', RULE), eq('a', RULE)], 100).map(r => r.key)).toEqual(['eq:b', 'eq:a'])
  })
})

describe('buildLoadingList - logistics rows', () => {
  it('ours and chef give a row; client, quoted, not_needed, unchecked give none', () => {
    const rows = build([], 10, [
      ans('o'), ans('c', { payer: 'chef' }), ans('cl', { payer: 'client' }), ans('q', { payer: 'quoted' }),
      ans('n', { status: 'not_needed' }), ans('u', { status: 'unchecked' }), ans('np', { payer: undefined }),
    ])
    expect(rows.map(r => r.key)).toEqual(['o', 'c'])
    expect(rows[0]).toEqual({ key: 'o', label: 'o', source: 'logistics', quantity: 1, section: 's1' })
  })
  it('quantity is the answer quantity when above 0, else 1; ad-hoc label is used', () => {
    const rows = build([], 10, [ans('a', { quantity: 4 }), ans('b', { quantity: 0 }), ans('adhoc:1', { label: 'מנגל פחמים' })])
    expect(rows.map(r => r.quantity)).toEqual([4, 1, 1])
    expect(rows[2].label).toBe('מנגל פחמים')
  })
  it('equipment rows come before logistics rows', () => {
    expect(build([eq('a', RULE)], 100, [ans('x')]).map(r => r.source)).toEqual(['equipment', 'logistics'])
  })
})
