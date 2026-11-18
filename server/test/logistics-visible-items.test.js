'use strict'
/** Plan 622 (C-LOGX) - visibleLogisticsItems: the plan 579 date rule as one pure function. */

const { visibleLogisticsItems } = require('../generated/schemas/logistics/visible-items')

const term = (key, phase = 'site_visit', environments, extra = {}) => ({
  key, phase, environments, createdBy: '__master__', createdAt: 1, ...extra,
})
const own = (key, createdAt, extra = {}) => term(key, 'site_visit', undefined, { createdBy: 'u1', createdAt, ...extra })
const keysOf = (terms, at, extra = {}) =>
  visibleLogisticsItems({ terms, hiddenLogisticsKeys: [], eventCreatedAt: at, phase: 'site_visit', ...extra }).map(t => t.key)

describe('visibleLogisticsItems', () => {
  it('a seed term shows on an event older than it', () => {
    expect(keysOf([term('seed', 'site_visit', undefined, { createdAt: 9000 })], 5)).toEqual(['seed'])
  })

  it('an own term created after the event does not show; one created before does', () => {
    expect(keysOf([own('mine', 100)], 50)).toEqual([])
    expect(keysOf([own('mine', 100)], 150)).toEqual(['mine'])
  })

  it('a promoted key (new master + folded own) shows on the business old event', () => {
    const terms = [term('p', 'site_visit', undefined, { createdBy: 'admin', createdAt: 900 }), own('p', 100, { foldedAt: 905 })]
    expect(keysOf(terms, 150)).toEqual(['p'])
    expect(keysOf(terms, 50)).toEqual([])
  })

  it('a removed term shows before the removal, not after', () => {
    const terms = [term('r', 'site_visit', undefined, { removedAt: 500 })]
    expect(keysOf(terms, 400)).toEqual(['r'])
    expect(keysOf(terms, 600)).toEqual([])
  })

  it('removedAt 0 counts as live', () => {
    expect(keysOf([term('z', 'site_visit', undefined, { removedAt: 0 })], 600)).toEqual(['z'])
  })

  it('a business-hidden key shows only before the hide', () => {
    const run = at => visibleLogisticsItems({
      terms: [term('h')], hiddenLogisticsKeys: [{ key: 'h', at: 500 }], eventCreatedAt: at, phase: 'site_visit',
    }).map(t => t.key)
    expect(run(400)).toEqual(['h'])
    expect(run(600)).toEqual([])
  })

  it('returns only the phase asked for', () => {
    const terms = [term('a', 'site_visit'), term('c', 'intake')]
    expect(keysOf(terms, 5)).toEqual(['a'])
    expect(keysOf(terms, 5, { phase: 'intake' })).toEqual(['c'])
  })

  it('an environments term shows for a matching or no environment, not for another', () => {
    const terms = [term('a'), term('b', 'site_visit', ['outdoor_field'])]
    expect(keysOf(terms, 5, { environment: 'outdoor_field' })).toEqual(['a', 'b'])
    expect(keysOf(terms, 5, { environment: 'professional_kitchen' })).toEqual(['a'])
    expect(keysOf(terms, 5, { environment: undefined })).toEqual(['a', 'b'])
  })

  it('eventHiddenKeys removes a key and leaves the others', () => {
    const terms = [term('a'), term('b'), term('c')]
    expect(keysOf(terms, 5, { eventHiddenKeys: ['b'] })).toEqual(['a', 'c'])
    expect(keysOf(terms, 5, { eventHiddenKeys: [] })).toEqual(['a', 'b', 'c'])
  })

  it('keeps the order of terms when the first term is filtered out', () => {
    const terms = [term('x', 'intake'), term('b'), term('a')]
    expect(keysOf(terms, 5)).toEqual(['b', 'a'])
  })

  it('no eventCreatedAt behaves as now', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1000)
      const terms = [own('later', 2000), own('earlier', 500)]
      expect(visibleLogisticsItems({ terms, hiddenLogisticsKeys: [], phase: 'site_visit' }).map(t => t.key)).toEqual(['earlier'])
      vi.setSystemTime(3000)
      expect(visibleLogisticsItems({ terms, hiddenLogisticsKeys: [], phase: 'site_visit' }).map(t => t.key)).toEqual(['later', 'earlier'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('two removed terms of one key end at the earlier removedAt', () => {
    const terms = [term('r', 'site_visit', undefined, { removedAt: 800 }), own('r', 1, { removedAt: 300 })]
    expect(keysOf(terms, 200)).toEqual(['r'])
    expect(keysOf(terms, 400)).toEqual([])
  })
})
