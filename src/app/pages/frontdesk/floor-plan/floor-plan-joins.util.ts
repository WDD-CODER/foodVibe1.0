import type { FloorJoin, FloorPlanBody, FloorTable } from '@models/floor-plan.model'
import { newKey } from 'src/app/shared/floor-map/floor-geometry.util'

/** Plan 666: the rules of a join of tables in the room draft. Pure: every function returns a new value. */

export const MIN_JOIN_TABLES = 2
export const MAX_JOIN_TABLES = 4
export const MAX_JOINS = 60
const MAX_JOIN_SEATS = 30

export type JoinProblem = 'fp_join_err_count' | 'fp_join_err_area' | 'fp_join_err_exists' | 'fp_join_err_limit'

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((k) => b.includes(k))

/** Why these tables cannot be joined now (a dictionary key), or null when they can. */
export function joinProblem(plan: FloorPlanBody, keys: readonly string[]): JoinProblem | null {
  if (keys.length < MIN_JOIN_TABLES || keys.length > MAX_JOIN_TABLES) return 'fp_join_err_count'
  const tables = keys.map((k) => plan.tables.find((t) => t.key === k))
  if (tables.some((t) => !t)) return 'fp_join_err_count'
  const areas = new Set((tables as FloorTable[]).map((t) => t.areaKey))
  if (areas.size > 1) return 'fp_join_err_area'
  if (plan.joins.some((j) => sameSet(j.tableKeys, keys))) return 'fp_join_err_exists'
  if (plan.joins.length >= MAX_JOINS) return 'fp_join_err_limit'
  return null
}

const byNumber = (a: FloorTable, b: FloorTable): number =>
  a.number.localeCompare(b.number, undefined, { numeric: true }) || a.key.localeCompare(b.key)

/** The tables of a join in the order of their numbers. */
function ordered(plan: Pick<FloorPlanBody, 'tables'>, keys: readonly string[]): FloorTable[] {
  return plan.tables.filter((t) => keys.includes(t.key)).sort(byNumber)
}

/** A join of these tables: seats from the largest single table's party + 1 up to the sum (at most 30). */
export function newJoin(plan: FloorPlanBody, keys: readonly string[], key: string = newKey()): FloorJoin {
  const tables = ordered(plan, keys)
  const sum = tables.reduce((n, t) => n + t.maxSeats, 0)
  const largest = tables.reduce((n, t) => Math.max(n, t.maxSeats), 0)
  const maxSeats = Math.min(sum, MAX_JOIN_SEATS)
  return {
    key,
    tableKeys: tables.map((t) => t.key),
    minSeats: Math.min(largest + 1, maxSeats),
    maxSeats,
    online: tables.length > 0 && tables.every((t) => t.online)
  }
}

/** The numbers of the join's tables, "7 + 8". */
export function joinLabel(plan: Pick<FloorPlanBody, 'tables'>, join: Pick<FloorJoin, 'tableKeys'>): string {
  return ordered(plan, join.tableKeys)
    .map((t) => t.number)
    .join(' + ')
}

export function withJoin(plan: FloorPlanBody, join: FloorJoin): FloorPlanBody {
  return { ...plan, joins: [...plan.joins, join] }
}

export function withoutJoin(plan: FloorPlanBody, key: string): { plan: FloorPlanBody; removed: FloorJoin | null } {
  const removed = plan.joins.find((j) => j.key === key) ?? null
  return { plan: { ...plan, joins: plan.joins.filter((j) => j.key !== key) }, removed }
}

/** One change of a join's seats or online flag; the seats stay in order and inside 1–30. */
export function withJoinChange(
  plan: FloorPlanBody,
  key: string,
  patch: Partial<Pick<FloorJoin, 'minSeats' | 'maxSeats' | 'online'>>
): FloorPlanBody {
  return {
    ...plan,
    joins: plan.joins.map((j) => {
      if (j.key !== key) return j
      const next = { ...j, ...patch }
      if (patch.maxSeats !== undefined) {
        next.maxSeats = Math.min(Math.max(Math.round(patch.maxSeats), 1), MAX_JOIN_SEATS)
        if (next.maxSeats < next.minSeats) next.minSeats = next.maxSeats
      }
      if (patch.minSeats !== undefined) {
        next.minSeats = Math.min(Math.max(Math.round(patch.minSeats), 1), next.maxSeats)
      }
      return next
    })
  }
}
