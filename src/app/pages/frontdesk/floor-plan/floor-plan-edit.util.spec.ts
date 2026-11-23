import type { FloorPlanBody, FloorTable } from '@models/floor-plan.model'
import {
  areaNameError,
  duplicateTable,
  minGrid,
  numberError,
  overlapping,
  restoreDropped,
  withArea,
  withoutTable,
  withTable,
  withTableDropped,
  withZone
} from './floor-plan-edit.util'

const table = (over: Partial<FloorTable>): FloorTable => ({
  key: 'tab001',
  number: '1',
  areaKey: 'areaa1',
  shape: 'square',
  minSeats: 2,
  maxSeats: 4,
  x: 0,
  y: 0,
  w: 3,
  h: 3,
  turned: false,
  active: true,
  online: true,
  ...over
})

const plan = (over: Partial<FloorPlanBody> = {}): FloorPlanBody => ({
  grid: { cols: 12, rows: 10 },
  areas: [
    { key: 'areaa1', name: 'בפנים', order: 0 },
    { key: 'areab2', name: 'בחוץ', order: 1 }
  ],
  tables: [table({}), table({ key: 'tab002', number: '2', x: 5, y: 0 })],
  joins: [{ key: 'join01', tableKeys: ['tab001', 'tab002'], minSeats: 2, maxSeats: 8, online: true }],
  ...over
})

describe('floor-plan-edit.util (plan 684)', () => {
  describe('withTable', () => {
    it('makes the footprint follow the largest party', () => {
      const { plan: next } = withTable(plan(), 'tab001', { maxSeats: 6 })
      const t = next.tables[0]
      expect([t.w, t.h]).toEqual([4, 4])
    })

    it('pulls a table that would stick out back inside the room', () => {
      const p = plan({ tables: [table({ x: 9, y: 7 })], joins: [] })
      const { plan: next } = withTable(p, 'tab001', { maxSeats: 8 })
      const t = next.tables[0]
      expect([t.w, t.h]).toEqual([5, 5])
      expect(t.x + t.w).toBeLessThanOrEqual(12)
      expect(t.y + t.h).toBeLessThanOrEqual(10)
    })

    it('lowers the smallest party when the largest goes under it', () => {
      const { plan: next } = withTable(plan(), 'tab001', { maxSeats: 1 })
      expect([next.tables[0].minSeats, next.tables[0].maxSeats]).toEqual([1, 1])
    })

    it('swaps the drawn size on turn and pulls back', () => {
      const p = plan({ tables: [table({ shape: 'rect', maxSeats: 8, w: 5, h: 2, x: 7, y: 8 })], joins: [] })
      const { plan: next } = withTable(p, 'tab001', { turned: true })
      expect(next.tables[0].y + 5).toBeLessThanOrEqual(10)
      expect(next.tables[0].x + 2).toBeLessThanOrEqual(12)
    })

    it('removes the join of a table moved to another area', () => {
      const { plan: next, droppedJoins } = withTable(plan(), 'tab001', { areaKey: 'areab2' })
      expect(next.joins).toEqual([])
      expect(droppedJoins.map((j) => j.key)).toEqual(['join01'])
      expect(next.tables[0].areaKey).toBe('areab2')
    })

    it('turns online off while the table is not active', () => {
      const { plan: next } = withTable(plan(), 'tab001', { active: false })
      expect(next.tables[0].online).toBeFalse()
    })
  })

  describe('numberError', () => {
    it('returns the required, taken and null cases', () => {
      expect(numberError(plan(), 'tab001', '  ')).toBe('fp_err_number_required')
      expect(numberError(plan(), 'tab001', '2')).toBe('fp_err_number_taken')
      expect(numberError(plan(), 'tab001', '1')).toBeNull()
      expect(numberError(plan(), 'tab001', '12A')).toBeNull()
    })
  })

  it('duplicateTable returns a copy with a new key, the next number and a free cell', () => {
    const result = duplicateTable(plan(), 'tab001')!
    const copy = result.plan.tables.find((t) => t.key === result.key)!
    expect(result.key).not.toBe('tab001')
    expect(copy.number).toBe('3')
    expect(copy.shape).toBe('square')
    expect(overlapping(result.plan)).toEqual([])
  })

  it('withoutTable removes the table and the joins that list it, and restoreDropped puts them back', () => {
    const { plan: next, removed } = withoutTable(plan(), 'tab001')
    expect(next.tables.map((t) => t.key)).toEqual(['tab002'])
    expect(next.joins).toEqual([])
    const back = restoreDropped(next, removed.tables, removed.joins)
    expect(back.tables.map((t) => t.key).sort()).toEqual(['tab001', 'tab002'])
    expect(back.joins.map((j) => j.key)).toEqual(['join01'])
  })

  describe('overlapping', () => {
    it('returns tables sharing a cell and nothing for tables that only touch', () => {
      expect(overlapping({ tables: [table({}), table({ key: 'tab002', number: '2', x: 2, y: 0 })] })).toEqual([
        'tab001',
        'tab002'
      ])
      expect(overlapping({ tables: [table({}), table({ key: 'tab002', number: '2', x: 3, y: 0 })] })).toEqual([])
    })
  })

  it('minGrid is the smallest room that holds every table, never under 10', () => {
    expect(minGrid({ tables: [], areas: [] })).toEqual({ cols: 10, rows: 10 })
    expect(minGrid({ tables: [table({ x: 9, y: 2 })], areas: [] })).toEqual({ cols: 12, rows: 10 })
  })

  it('minGrid also holds every zone (plan 699)', () => {
    const areas = [{ key: 'areaa1', name: 'בפנים', order: 0, zone: { x: 10, y: 9, w: 4, h: 3 } }]
    expect(minGrid({ tables: [table({ x: 9, y: 2 })], areas })).toEqual({ cols: 14, rows: 12 })
  })

  describe('zones (plan 699)', () => {
    // 24 × 16 room; tab001 (3 × 3 at 0,0, centre 1.5,1.5) and tab002 (3 × 3 at 5,0, centre 6.5,1.5) are joined, area a1.
    const roomy = (over: Partial<FloorPlanBody> = {}): FloorPlanBody => plan({ grid: { cols: 24, rows: 16 }, ...over })

    it('withZone stores the rect and moves into the area every table whose centre is in it', () => {
      const result = withZone(roomy(), 'areab2', { x: 4, y: 0, w: 6, h: 4 })
      if ('refused' in result) return fail('refused')
      expect(result.plan.areas.find((a) => a.key === 'areab2')?.zone).toEqual({ x: 4, y: 0, w: 6, h: 4 })
      expect(result.movedKeys).toEqual(['tab002'])
      expect(result.plan.tables.find((t) => t.key === 'tab002')?.areaKey).toBe('areab2')
      expect(result.plan.tables.find((t) => t.key === 'tab001')?.areaKey).toBe('areaa1')
      expect(result.droppedJoins.map((j) => j.key)).toEqual(['join01'])
      expect(result.plan.joins).toEqual([])
    })

    it('withZone moves no table of the same area and drops no join', () => {
      const result = withZone(roomy(), 'areaa1', { x: 0, y: 0, w: 10, h: 4 })
      if ('refused' in result) return fail('refused')
      expect(result.movedKeys).toEqual([])
      expect(result.droppedJoins).toEqual([])
      expect(result.plan.joins.length).toBe(1)
    })

    it('withZone refuses an overlap, a rect under 2 × 2 and a rect outside the room', () => {
      const base = roomy({
        areas: [
          { key: 'areaa1', name: 'בפנים', order: 0, zone: { x: 0, y: 0, w: 4, h: 4 } },
          { key: 'areab2', name: 'בחוץ', order: 1 }
        ]
      })
      expect(withZone(base, 'areab2', { x: 3, y: 3, w: 4, h: 4 })).toEqual({ refused: 'fp_zone_overlap' })
      expect(withZone(base, 'areab2', { x: 8, y: 8, w: 1, h: 4 })).toEqual({ refused: 'fp_zone_small' })
      expect(withZone(base, 'areab2', { x: 22, y: 0, w: 4, h: 4 })).toEqual({ refused: 'fp_zone_outside' })
      // Touching is fine; the area's own old zone never blocks it.
      expect('refused' in withZone(base, 'areab2', { x: 4, y: 0, w: 4, h: 4 })).toBeFalse()
      expect('refused' in withZone(base, 'areaa1', { x: 1, y: 1, w: 4, h: 4 })).toBeFalse()
    })

    it('withZone(plan, key, null) clears the shape and moves no table', () => {
      const base = roomy({
        areas: [
          { key: 'areaa1', name: 'בפנים', order: 0 },
          { key: 'areab2', name: 'בחוץ', order: 1, color: 4, zone: { x: 4, y: 0, w: 6, h: 4 } }
        ]
      })
      const result = withZone(base, 'areab2', null)
      if ('refused' in result) return fail('refused')
      expect(result.plan.areas[1]).toEqual({ key: 'areab2', name: 'בחוץ', order: 1, color: 4 })
      expect(result.movedKeys).toEqual([])
      expect(result.plan.tables).toEqual(base.tables)
    })

    it('withTableDropped moves a table into the zone that holds its centre, dropping a join across areas', () => {
      const base = roomy({
        areas: [
          { key: 'areaa1', name: 'בפנים', order: 0 },
          { key: 'areab2', name: 'בחוץ', order: 1, zone: { x: 12, y: 8, w: 8, h: 6 } }
        ]
      })
      const { plan: next, droppedJoins } = withTableDropped(base, 'tab002', 13, 9)
      const t = next.tables.find((x) => x.key === 'tab002')
      expect([t?.x, t?.y, t?.areaKey]).toEqual([13, 9, 'areab2'])
      expect(droppedJoins.map((j) => j.key)).toEqual(['join01'])
      expect(next.joins).toEqual([])
    })

    it('withTableDropped keeps the area when the centre is in no zone', () => {
      const base = roomy({
        areas: [
          { key: 'areaa1', name: 'בפנים', order: 0, zone: { x: 0, y: 0, w: 4, h: 4 } },
          { key: 'areab2', name: 'בחוץ', order: 1, zone: { x: 12, y: 8, w: 8, h: 6 } }
        ]
      })
      const { plan: next, droppedJoins } = withTableDropped(base, 'tab002', 6, 6)
      const t = next.tables.find((x) => x.key === 'tab002')
      expect([t?.x, t?.y, t?.areaKey]).toEqual([6, 6, 'areaa1'])
      expect(droppedJoins).toEqual([])
      expect(next.joins.length).toBe(1)
    })

    it('withArea add takes the first free palette colour, or order % 8 when all are taken', () => {
      const taken = roomy({
        areas: [
          { key: 'areaa1', name: 'בפנים', order: 0, color: 0 },
          { key: 'areab2', name: 'בחוץ', order: 1, color: 2 }
        ]
      })
      expect(withArea(taken, { type: 'add', key: 'areac3', name: 'בר' })!.areas.at(-1)?.color).toBe(1)
      const full = roomy({
        areas: Array.from({ length: 8 }, (_, i) => ({ key: `area0${i}x`, name: `א${i}`, order: i, color: i })),
        tables: [],
        joins: []
      })
      expect(withArea(full, { type: 'add', key: 'areac9', name: 'בר' })!.areas.at(-1)?.color).toBe(0)
    })
  })

  describe('withArea', () => {
    it('refuses to remove an area that has tables and the last area', () => {
      expect(withArea(plan(), { type: 'remove', key: 'areaa1' })).toBeNull()
      const one = plan({ areas: [{ key: 'areaa1', name: 'בפנים', order: 0 }], tables: [], joins: [] })
      expect(withArea(one, { type: 'remove', key: 'areaa1' })).toBeNull()
      expect(withArea(plan(), { type: 'remove', key: 'areab2' })!.areas.length).toBe(1)
    })

    it('adds, renames and orders areas; refuses a repeated name', () => {
      const added = withArea(plan(), { type: 'add', key: 'areac3', name: ' גינה ' })!
      expect(added.areas.at(-1)).toEqual({ key: 'areac3', name: 'גינה', order: 2, color: 2 })
      expect(withArea(plan(), { type: 'add', key: 'areac3', name: 'בפנים' })).toBeNull()
      expect(areaNameError(plan(), 'areab2', 'בפנים')).toBe('fp_err_area_name')
      expect(withArea(plan(), { type: 'rename', key: 'areab2', name: '' })).toBeNull()
      const moved = withArea(plan(), { type: 'move', key: 'areab2', dir: 'up' })!
      expect(moved.areas.map((a) => [a.key, a.order])).toEqual([
        ['areaa1', 1],
        ['areab2', 0]
      ])
      expect(withArea(plan(), { type: 'move', key: 'areaa1', dir: 'up' })).toBeNull()
    })
  })
})
