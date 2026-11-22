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
  withTable
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
    expect(minGrid({ tables: [] })).toEqual({ cols: 10, rows: 10 })
    expect(minGrid({ tables: [table({ x: 9, y: 2 })] })).toEqual({ cols: 12, rows: 10 })
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
      expect(added.areas.at(-1)).toEqual({ key: 'areac3', name: 'גינה', order: 2 })
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
