'use strict'
/** Plan 664 - checkFloorPlan (nine issue codes) and emptyFloorPlan. */

const { checkFloorPlan, emptyFloorPlan, FLOOR_PLAN_ISSUE_CODES } = require('../generated/schemas/front-desk/floor-plan-check')

const table = (key, extra = {}) => ({
  key, number: key.slice(-2), areaKey: 'areaaa01', shape: 'square', minSeats: 2, maxSeats: 4,
  x: 0, y: 0, w: 2, h: 2, turned: false, active: true, online: true, ...extra,
})
const plan = (over = {}) => ({
  grid: { cols: 10, rows: 10 },
  areas: [{ key: 'areaaa01', name: 'A', order: 0 }, { key: 'areaaa02', name: 'B', order: 1 }],
  tables: [table('tblaaa01', { number: '1' }), table('tblaaa02', { number: '2', x: 3 }), table('tblbbb03', { number: '3', areaKey: 'areaaa02', x: 6 })],
  joins: [{ key: 'joinaa01', tableKeys: ['tblaaa01', 'tblaaa02'], minSeats: 2, maxSeats: 8, online: false }],
  ...over,
})

describe('checkFloorPlan', () => {
  it('returns no issue for a sound plan, overlap allowed', () => {
    expect(checkFloorPlan(plan())).toEqual([])
    expect(checkFloorPlan(plan({ tables: [table('tblaaa01', { number: '1' }), table('tblaaa02', { number: '2' })], joins: [] }))).toEqual([])
  })

  const t = (...tables) => plan({ tables, joins: [] })
  it.each([
    ['duplicate_area', plan({ areas: [{ key: 'areaaa01', name: 'A', order: 0 }, { key: 'areaaa01', name: 'B', order: 1 }], tables: [], joins: [] }), 'areaaa01'],
    ['duplicate_key', t(table('tblaaa01', { number: '1' }), table('tblaaa01', { number: '2' })), 'tblaaa01'],
    ['duplicate_number', t(table('tblaaa01', { number: '1' }), table('tblaaa02', { number: ' 1 ' })), 'tblaaa02'],
    ['area_missing', t(table('tblaaa01', { number: '1', areaKey: 'nonearea' })), 'tblaaa01'],
    ['outside_grid', t(table('tblaaa01', { number: '1', x: 9, w: 2 })), 'tblaaa01'],
    ['duplicate_join', plan({ joins: [plan().joins[0], plan().joins[0]] }), 'joinaa01'],
    ['join_table_missing', plan({ joins: [{ ...plan().joins[0], tableKeys: ['tblaaa01', 'tblnone1'] }] }), 'joinaa01'],
    ['join_repeated_table', plan({ joins: [{ ...plan().joins[0], tableKeys: ['tblaaa01', 'tblaaa01'] }] }), 'joinaa01'],
    ['join_mixed_areas', plan({ joins: [{ ...plan().joins[0], tableKeys: ['tblaaa01', 'tblbbb03'] }] }), 'joinaa01'],
  ])('%s', (code, p, key) => {
    expect(checkFloorPlan(p)).toEqual([{ code, key }])
  })

  it('covers all eleven codes and honours a turned table', () => {
    expect(FLOOR_PLAN_ISSUE_CODES).toHaveLength(11)
    expect(checkFloorPlan(t(table('tblaaa01', { number: '1', x: 8, y: 0, w: 1, h: 3, turned: true })))).toEqual([{ code: 'outside_grid', key: 'tblaaa01' }])
    expect(checkFloorPlan(t(table('tblaaa01', { number: '1', x: 7, y: 0, w: 1, h: 3, turned: true })))).toEqual([])
    expect(checkFloorPlan(t(table('tblaaa01', { number: '1', x: -1 })))).toHaveLength(1)
  })
})

describe('checkFloorPlan zones (plan 699)', () => {
  const zoned = (zones, grid = { cols: 24, rows: 16 }) => ({
    grid,
    areas: zones.map((zone, i) => ({ key: 'areaaa0' + (i + 1), name: 'A' + i, order: i, color: i, ...(zone ? { zone } : {}) })),
    tables: [],
    joins: [],
  })
  it('reports a zone that sticks out of the grid', () => {
    expect(checkFloorPlan(zoned([{ x: 20, y: 0, w: 6, h: 4 }]))).toEqual([{ code: 'zone_outside_grid', key: 'areaaa01' }])
    expect(checkFloorPlan(zoned([{ x: 18, y: 12, w: 6, h: 4 }]))).toEqual([])
  })
  it('reports two zones that share a cell, with the later area key', () => {
    expect(checkFloorPlan(zoned([{ x: 0, y: 0, w: 4, h: 4 }, { x: 3, y: 3, w: 4, h: 4 }]))).toEqual([{ code: 'zone_overlap', key: 'areaaa02' }])
  })
  it('accepts zones that only touch', () => {
    expect(checkFloorPlan(zoned([{ x: 0, y: 0, w: 4, h: 4 }, { x: 4, y: 0, w: 4, h: 4 }, { x: 0, y: 4, w: 4, h: 2 }]))).toEqual([])
  })
  it('accepts a plan saved before zones (no color, no zone)', () => {
    expect(checkFloorPlan(plan())).toEqual([])
    expect(checkFloorPlan(zoned([null, null]))).toEqual([])
  })
  it('does not cross-check a table against its area zone', () => {
    const p = zoned([{ x: 10, y: 10, w: 2, h: 2 }])
    p.tables = [table('tblaaa01', { number: '1', areaKey: 'areaaa01', x: 0, y: 0 })]
    expect(checkFloorPlan(p)).toEqual([])
  })
})

describe('emptyFloorPlan', () => {
  it('gives the starting areas colours 0, 1, 2 and no zone', () => {
    const p = emptyFloorPlan(['a', 'b', 'c'])
    expect(p.areas.map(a => a.color)).toEqual([0, 1, 2])
    for (const a of p.areas) expect(a.zone).toBeUndefined()
  })
  it('makes one area per name', () => {
    const p = emptyFloorPlan(['בפנים', 'בחוץ'])
    expect(p.areas.map(a => a.name)).toEqual(['בפנים', 'בחוץ'])
    expect(p.areas.map(a => a.order)).toEqual([0, 1])
    for (const a of p.areas) expect(a.key).toMatch(/^[a-z0-9]{6,12}$/)
    expect(p.tables).toEqual([])
    expect(p.joins).toEqual([])
    expect(p.grid).toEqual({ cols: 24, rows: 16 })
  })
  it('has no area without a name, drops blanks and repeats, takes a key maker', () => {
    expect(emptyFloorPlan([]).areas).toEqual([])
    expect(emptyFloorPlan([' ', 'a', ' a ']).areas).toHaveLength(1)
    let n = 0
    expect(emptyFloorPlan(['x', 'y'], () => 'key' + ++n + 'aaa').areas.map(a => a.key)).toEqual(['key1aaa', 'key2aaa'])
    expect(emptyFloorPlan(Array.from({ length: 12 }, (_, i) => 'n' + i)).areas).toHaveLength(10)
  })
})
