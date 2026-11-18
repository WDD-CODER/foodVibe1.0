'use strict'
const { weekStart, buildLearningStats } = require('../utils/learning-stats')

const jer = ms => new Date(ms + 2 * 3600000).toISOString().slice(0, 10) // fixed UTC+2 stand-in for Asia/Jerusalem
const T = Date.parse('2026-11-10T10:00:00Z')
const d = over => ({ feature: 'invoice_read', model: 'm1', status: 'confirmed', keptRatio: 1, at: T, ...over })

describe('weekStart', () => {
  it('returns the Sunday of the week', () => {
    expect(weekStart('2026-11-15')).toBe('2026-11-15')
    expect(weekStart('2026-11-14')).toBe('2026-11-08')
    expect(weekStart('2026-11-10')).toBe('2026-11-08')
  })
})

describe('buildLearningStats', () => {
  it('averages confirmed scored drafts', () => {
    const [row] = buildLearningStats([d({ keptRatio: 0.5 }), d({ keptRatio: 1 })], { dayOf: jer })
    expect(row).toMatchObject({ drafts: 2, confirmed: 2, avgKeptRatio: 0.75 })
  })
  it('counts a pending draft in drafts only', () => {
    const [row] = buildLearningStats([d({ status: 'pending', keptRatio: undefined }), d({ keptRatio: 0.5 })], { dayOf: jer })
    expect(row).toMatchObject({ drafts: 2, confirmed: 1, avgKeptRatio: 0.5 })
  })
  it('counts an unscored confirmed draft in confirmed but not in the average', () => {
    const [row] = buildLearningStats([d({ keptRatio: undefined }), d({ keptRatio: 0.5 })], { dayOf: jer })
    expect(row).toMatchObject({ confirmed: 2, avgKeptRatio: 0.5 })
  })
  it('gives a null average when nothing is scored', () => {
    const [row] = buildLearningStats([d({ keptRatio: undefined })], { dayOf: jer })
    expect(row.avgKeptRatio).toBeNull()
  })
  it('makes one row per model, a missing model is the null row, last', () => {
    const rows = buildLearningStats([d({ model: 'm2' }), d({ model: undefined }), d({ model: 'm1' })], { dayOf: jer })
    expect(rows.map(r => r.model)).toEqual(['m1', 'm2', null])
  })
  it('sorts by feature and puts weeks ascending across the Saturday/Sunday border', () => {
    const sun = Date.parse('2026-11-14T22:30:00Z') // Sunday 00:30 Jerusalem
    const sat = Date.parse('2026-11-14T21:30:00Z') // Saturday 23:30 Jerusalem
    const [row] = buildLearningStats([d({ at: sun }), d({ at: sat })], { dayOf: jer })
    expect(row.weeks.map(w => w.week)).toEqual(['2026-11-08', '2026-11-15'])
    const rows = buildLearningStats([d({ feature: 'z' }), d({ feature: 'a' })], { dayOf: jer })
    expect(rows.map(r => r.feature)).toEqual(['a', 'z'])
  })
})
