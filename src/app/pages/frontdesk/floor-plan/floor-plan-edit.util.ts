import type { FloorArea, FloorJoin, FloorTable, FloorPlanBody } from '@models/floor-plan.model'
import {
  coveredBy,
  firstFreeCell,
  MAX_TABLES,
  newKey,
  nextTableNumber,
  sizeFor
} from 'src/app/shared/floor-map/floor-geometry.util'
import {
  colorOf,
  MIN_ZONE_SIDE,
  rectInGrid,
  rectsOverlap,
  tableCentreIn,
  ZONE_COLOR_COUNT,
  type ZoneRect
} from 'src/app/shared/floor-map/floor-zones.util'

/** Plan 684: the editing rules of the room draft. Pure: every function returns a new plan and never changes its input. */

export const MIN_GRID = 10
export const MAX_GRID = 80
export const MAX_AREAS = 10
export const MAX_SEATS = 30
export const NUMBER_MAX_LENGTH = 6
const AREA_NAME_MAX = 200

/** What a panel may change on a table. Size (`w`, `h`) and place follow from these, never typed. */
export type TablePatch = Partial<
  Pick<FloorTable, 'number' | 'shape' | 'minSeats' | 'maxSeats' | 'areaKey' | 'turned' | 'active' | 'online'>
>

export type AreaOp =
  | { type: 'add'; key: string; name: string }
  | { type: 'rename'; key: string; name: string }
  | { type: 'color'; key: string; color: number }
  | { type: 'move'; key: string; dir: 'up' | 'down' }
  | { type: 'remove'; key: string }

const clamp = (n: number, min: number, max: number): number => Math.min(Math.max(n, min), max)

/** The table moved back inside the room when its covered cells stick out. */
function pulledBack(table: FloorTable, grid: FloorPlanBody['grid']): FloorTable {
  const { w, h } = coveredBy(table)
  return {
    ...table,
    x: clamp(table.x, 0, Math.max(0, grid.cols - w)),
    y: clamp(table.y, 0, Math.max(0, grid.rows - h))
  }
}

/** One table changed. Size follows shape and seats; the seats stay in order; a join across areas is dropped. */
export function withTable(
  plan: FloorPlanBody,
  key: string,
  patch: TablePatch
): { plan: FloorPlanBody; droppedJoins: FloorJoin[] } {
  const current = plan.tables.find((t) => t.key === key)
  if (!current) return { plan, droppedJoins: [] }
  let next: FloorTable = { ...current, ...patch }
  if (patch.maxSeats !== undefined) {
    next.maxSeats = clamp(Math.round(patch.maxSeats), 1, MAX_SEATS)
    if (next.maxSeats < next.minSeats) next.minSeats = next.maxSeats
  }
  if (patch.minSeats !== undefined) {
    next.minSeats = clamp(Math.round(patch.minSeats), 1, next.maxSeats)
  }
  if (!next.active) next.online = false
  if (patch.shape !== undefined || patch.maxSeats !== undefined) {
    next = { ...next, ...sizeFor(next.shape, next.maxSeats) }
  }
  next = pulledBack(next, plan.grid)
  const tables = plan.tables.map((t) => (t.key === key ? next : t))
  let joins = plan.joins
  let droppedJoins: FloorJoin[] = []
  if (patch.areaKey !== undefined && patch.areaKey !== current.areaKey) {
    droppedJoins = plan.joins.filter((j) => j.tableKeys.includes(key))
    joins = plan.joins.filter((j) => !j.tableKeys.includes(key))
  }
  return { plan: { ...plan, tables, joins }, droppedJoins }
}

/** An error key when `text` cannot be the number of table `key`, else null. */
export function numberError(plan: FloorPlanBody, key: string, text: string): string | null {
  const value = text.trim()
  if (!value) return 'fp_err_number_required'
  if (plan.tables.some((t) => t.key !== key && t.number.trim() === value)) return 'fp_err_number_taken'
  return null
}

/** A copy of the table: new key, next number, first free cell. Null at the table limit or for an unknown key. */
export function duplicateTable(plan: FloorPlanBody, key: string): { plan: FloorPlanBody; key: string } | null {
  const source = plan.tables.find((t) => t.key === key)
  if (!source || plan.tables.length >= MAX_TABLES) return null
  const { x, y } = firstFreeCell(plan, coveredBy(source))
  const copy: FloorTable = { ...source, key: newKey(), number: nextTableNumber(plan), x, y }
  return { plan: { ...plan, tables: [...plan.tables, copy] }, key: copy.key }
}

/** The table and every join that lists it are gone; `removed` is what an undo puts back. */
export function withoutTable(
  plan: FloorPlanBody,
  key: string
): { plan: FloorPlanBody; removed: { tables: FloorTable[]; joins: FloorJoin[] } } {
  const table = plan.tables.find((t) => t.key === key)
  if (!table) return { plan, removed: { tables: [], joins: [] } }
  return {
    plan: {
      ...plan,
      tables: plan.tables.filter((t) => t.key !== key),
      joins: plan.joins.filter((j) => !j.tableKeys.includes(key))
    },
    removed: { tables: [table], joins: plan.joins.filter((j) => j.tableKeys.includes(key)) }
  }
}

/**
 * Puts tables and joins back (undo, or "restore" after a refused save) with their saved values. A table whose key is
 * already there is skipped; a number taken meanwhile is replaced by the next free one; a gone area falls to the first.
 */
export function restoreDropped(plan: FloorPlanBody, tables: FloorTable[], joins: FloorJoin[]): FloorPlanBody {
  let result: FloorPlanBody = plan
  for (const table of tables) {
    if (result.tables.some((t) => t.key === table.key)) continue
    const areaKey = result.areas.some((a) => a.key === table.areaKey)
      ? table.areaKey
      : (result.areas[0]?.key ?? table.areaKey)
    const number = result.tables.some((t) => t.number.trim() === table.number.trim())
      ? nextTableNumber(result)
      : table.number
    result = { ...result, tables: [...result.tables, pulledBack({ ...table, areaKey, number }, result.grid)] }
  }
  const have = new Set(result.tables.map((t) => t.key))
  const addable = joins.filter(
    (j) => !result.joins.some((o) => o.key === j.key) && j.tableKeys.every((k) => have.has(k))
  )
  return addable.length ? { ...result, joins: [...result.joins, ...addable] } : result
}

/** Keys of the tables whose drawn cells share a cell with another table (tables that only touch do not count). */
export function overlapping(plan: Pick<FloorPlanBody, 'tables'>): string[] {
  const boxes = plan.tables.map((t) => ({ key: t.key, x: t.x, y: t.y, ...coveredBy(t) }))
  const hit = new Set<string>()
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
        hit.add(a.key)
        hit.add(b.key)
      }
    }
  }
  return plan.tables.filter((t) => hit.has(t.key)).map((t) => t.key)
}

/** The smallest room that still holds every table and (plan 699) every zone (never under 10 × 10). */
export function minGrid(plan: Pick<FloorPlanBody, 'tables' | 'areas'>): { cols: number; rows: number } {
  let cols = MIN_GRID
  let rows = MIN_GRID
  for (const t of plan.tables) {
    const { w, h } = coveredBy(t)
    cols = Math.max(cols, t.x + w)
    rows = Math.max(rows, t.y + h)
  }
  for (const a of plan.areas) {
    if (!a.zone) continue
    cols = Math.max(cols, a.zone.x + a.zone.w)
    rows = Math.max(rows, a.zone.y + a.zone.h)
  }
  return { cols, rows }
}

/** Plan 699: why a zone was not stored (a dictionary key). */
export type ZoneRefusal = 'fp_zone_overlap' | 'fp_zone_small' | 'fp_zone_outside'
export type ZoneResult =
  { plan: FloorPlanBody; movedKeys: string[]; droppedJoins: FloorJoin[] } | { refused: ZoneRefusal }

/**
 * Plan 699: an area's zone set (a rect) or cleared (null). A rect under 2 × 2, outside the room or sharing a cell with
 * another area's zone is refused and nothing changes. A stored rect takes into its area every table of another area
 * whose centre lies in it (a join across areas drops, as with `withTable`). Clearing moves no table.
 */
export function withZone(plan: FloorPlanBody, areaKey: string, rect: ZoneRect | null): ZoneResult {
  const area = plan.areas.find((a) => a.key === areaKey)
  if (!area) return { plan, movedKeys: [], droppedJoins: [] }
  if (rect === null) {
    if (!area.zone) return { plan, movedKeys: [], droppedJoins: [] }
    const areas = plan.areas.map((a) => {
      if (a.key !== areaKey) return a
      const { zone: _gone, ...rest } = a
      return rest
    })
    return { plan: { ...plan, areas }, movedKeys: [], droppedJoins: [] }
  }
  if (rect.w < MIN_ZONE_SIDE || rect.h < MIN_ZONE_SIDE) return { refused: 'fp_zone_small' }
  if (!rectInGrid(rect, plan.grid)) return { refused: 'fp_zone_outside' }
  if (plan.areas.some((a) => a.key !== areaKey && a.zone && rectsOverlap(a.zone, rect))) {
    return { refused: 'fp_zone_overlap' }
  }
  const zone = { x: rect.x, y: rect.y, w: rect.w, h: rect.h }
  let next: FloorPlanBody = { ...plan, areas: plan.areas.map((a) => (a.key === areaKey ? { ...a, zone } : a)) }
  const movedKeys: string[] = []
  const droppedJoins: FloorJoin[] = []
  for (const t of plan.tables) {
    if (t.areaKey === areaKey || !tableCentreIn(t, zone)) continue
    const result = withTable(next, t.key, { areaKey })
    next = result.plan
    movedKeys.push(t.key)
    for (const j of result.droppedJoins) if (!droppedJoins.some((d) => d.key === j.key)) droppedJoins.push(j)
  }
  return { plan: next, movedKeys, droppedJoins }
}

/**
 * Plan 699: a table dropped at `x`, `y`. When its centre then lies in another area's zone it joins that area (a join
 * across areas drops); a centre in no zone keeps the table's area.
 */
export function withTableDropped(
  plan: FloorPlanBody,
  key: string,
  x: number,
  y: number
): { plan: FloorPlanBody; droppedJoins: FloorJoin[] } {
  const current = plan.tables.find((t) => t.key === key)
  if (!current) return { plan, droppedJoins: [] }
  const moved = { ...current, x, y }
  const next: FloorPlanBody = { ...plan, tables: plan.tables.map((t) => (t.key === key ? moved : t)) }
  const home = plan.areas.find((a) => a.zone && tableCentreIn(moved, a.zone))
  if (!home || home.key === current.areaKey) return { plan: next, droppedJoins: [] }
  return withTable(next, key, { areaKey: home.key })
}

/** Plan 699: the lowest palette colour no area has; `order % 8` when all eight are taken. */
function freeColor(areas: readonly FloorArea[], order: number): number {
  const used = new Set(areas.map((a) => colorOf(a)))
  for (let i = 0; i < ZONE_COLOR_COUNT; i++) if (!used.has(i)) return i
  return order % ZONE_COLOR_COUNT
}

/** An error key when `name` cannot be the name of area `key`, else null. */
export function areaNameError(plan: Pick<FloorPlanBody, 'areas'>, key: string, name: string): string | null {
  const value = name.trim()
  if (!value || value.length > AREA_NAME_MAX) return 'fp_err_area_name'
  if (plan.areas.some((a) => a.key !== key && a.name.trim() === value)) return 'fp_err_area_name'
  return null
}

/** The first free name: `base`, then `base 2`, `base 3` … (`base` is the text of `fp_area_new`). */
export function newAreaName(plan: Pick<FloorPlanBody, 'areas'>, base = 'אזור חדש'): string {
  const taken = new Set(plan.areas.map((a) => a.name.trim()))
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) if (!taken.has(`${base} ${n}`)) return `${base} ${n}`
}

const inOrder = (areas: FloorArea[]): FloorArea[] => [...areas].sort((a, b) => a.order - b.order)

/** One change of the areas, or null when it is refused (a bad name, ten areas, tables in the area, the last area). */
export function withArea(plan: FloorPlanBody, op: AreaOp): FloorPlanBody | null {
  switch (op.type) {
    case 'add': {
      if (plan.areas.length >= MAX_AREAS || areaNameError(plan, op.key, op.name)) return null
      const order = plan.areas.reduce((m, a) => Math.max(m, a.order), -1) + 1
      const color = freeColor(plan.areas, order)
      return { ...plan, areas: [...plan.areas, { key: op.key, name: op.name.trim(), order, color }] }
    }
    case 'rename': {
      if (areaNameError(plan, op.key, op.name) || !plan.areas.some((a) => a.key === op.key)) return null
      return { ...plan, areas: plan.areas.map((a) => (a.key === op.key ? { ...a, name: op.name.trim() } : a)) }
    }
    case 'color': {
      const color = op.color
      if (!plan.areas.some((a) => a.key === op.key)) return null
      if (!Number.isInteger(color) || color < 0 || color >= ZONE_COLOR_COUNT) return null
      return { ...plan, areas: plan.areas.map((a) => (a.key === op.key ? { ...a, color } : a)) }
    }
    case 'move': {
      const sorted = inOrder(plan.areas)
      const i = sorted.findIndex((a) => a.key === op.key)
      const j = op.dir === 'up' ? i - 1 : i + 1
      if (i < 0 || j < 0 || j >= sorted.length) return null
      const orders = new Map(sorted.map((a, idx) => [a.key, idx]))
      orders.set(sorted[i].key, j)
      orders.set(sorted[j].key, i)
      return { ...plan, areas: plan.areas.map((a) => ({ ...a, order: orders.get(a.key) ?? a.order })) }
    }
    case 'remove': {
      if (plan.areas.length <= 1 || plan.tables.some((t) => t.areaKey === op.key)) return null
      return { ...plan, areas: plan.areas.filter((a) => a.key !== op.key) }
    }
  }
}
