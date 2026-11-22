import type { FloorPlanBody, FloorTable } from '@models/floor-plan.model'
import { joinLabel, joinProblem, newJoin, withJoin, withJoinChange, withoutJoin } from './floor-plan-joins.util'

const table = (key: string, number: string, over: Partial<FloorTable> = {}): FloorTable => ({
  key,
  number,
  areaKey: 'area01',
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

const plan = (tables: FloorTable[], joins: FloorPlanBody['joins'] = []): FloorPlanBody => ({
  grid: { cols: 24, rows: 16 },
  areas: [
    { key: 'area01', name: 'A', order: 0 },
    { key: 'area02', name: 'B', order: 1 }
  ],
  tables,
  joins
})

const FIVE = plan(['t1', 't2', 't3', 't4', 't5'].map((k, i) => table(k, String(i + 1))))

describe('floor-plan-joins.util (plan 666)', () => {
  it('joinProblem: count', () => {
    expect(joinProblem(FIVE, ['t1'])).toBe('fp_join_err_count')
    expect(joinProblem(FIVE, ['t1', 't2', 't3', 't4', 't5'])).toBe('fp_join_err_count')
  })

  it('joinProblem: different areas', () => {
    const p = plan([table('t1', '1'), table('t2', '2', { areaKey: 'area02' })])
    expect(joinProblem(p, ['t1', 't2'])).toBe('fp_join_err_area')
  })

  it('joinProblem: a set that is already a join, in any order', () => {
    const p = plan(
      [table('t1', '1'), table('t2', '2')],
      [{ key: 'j1', tableKeys: ['t1', 't2'], minSeats: 5, maxSeats: 8, online: true }]
    )
    expect(joinProblem(p, ['t2', 't1'])).toBe('fp_join_err_exists')
  })

  it('joinProblem: the join limit', () => {
    const joins = Array.from({ length: 60 }, (_, i) => ({
      key: 'j' + i,
      tableKeys: ['t3', 't4'],
      minSeats: 5,
      maxSeats: 8,
      online: true
    }))
    expect(joinProblem({ ...FIVE, joins }, ['t1', 't2'])).toBe('fp_join_err_limit')
  })

  it('joinProblem: null for two free tables of one area', () => {
    expect(joinProblem(FIVE, ['t1', 't2'])).toBeNull()
  })

  it('newJoin: seats 5–8 for two 2–4 tables', () => {
    const j = newJoin(FIVE, ['t2', 't1'], 'jkey01')
    expect([j.minSeats, j.maxSeats]).toEqual([5, 8])
    expect(j.tableKeys).toEqual(['t1', 't2'])
    expect(j.online).toBeTrue()
  })

  it('newJoin: 9–18 for parties 4, 6 and 8; never above 30; online only when all are', () => {
    const p = plan([
      table('a', '1', { maxSeats: 4 }),
      table('b', '2', { maxSeats: 6, online: false }),
      table('c', '3', { maxSeats: 8 })
    ])
    const j = newJoin(p, ['a', 'b', 'c'])
    expect([j.minSeats, j.maxSeats]).toEqual([9, 18])
    expect(j.online).toBeFalse()
    const big = plan(['a', 'b', 'c', 'd'].map((k, i) => table(k, String(i + 1), { maxSeats: 12 })))
    expect(newJoin(big, ['a', 'b', 'c', 'd']).maxSeats).toBe(30)
  })

  it('joinLabel lists the numbers in order', () => {
    const p = plan([table('a', '8'), table('b', '7')])
    expect(joinLabel(p, { tableKeys: ['a', 'b'] })).toBe('7 + 8')
  })

  it('withJoin, withJoinChange and withoutJoin', () => {
    const j = newJoin(FIVE, ['t1', 't2'], 'jkey01')
    const added = withJoin(FIVE, j)
    expect(added.joins.length).toBe(1)
    const changed = withJoinChange(added, 'jkey01', { maxSeats: 3 })
    expect([changed.joins[0].minSeats, changed.joins[0].maxSeats]).toEqual([3, 3])
    const { plan: gone, removed } = withoutJoin(added, 'jkey01')
    expect(gone.joins.length).toBe(0)
    expect(removed?.key).toBe('jkey01')
  })
})
