/**
 * Plan 664 (C-FLOOR): the pure cross-field checks of a floor plan, shared by the server route and the editor, plus the
 * plan an editor starts from. No zod import at run time: the stored shape is the schema's (plan 662).
 */
import type { FloorPlan } from '../entities/floor-plan.schema'

export const FLOOR_PLAN_ISSUE_CODES = [
  'duplicate_area',
  'duplicate_key',
  'duplicate_number',
  'area_missing',
  'outside_grid',
  'duplicate_join',
  'join_table_missing',
  'join_repeated_table',
  'join_mixed_areas'
] as const
export type FloorPlanIssueCode = (typeof FLOOR_PLAN_ISSUE_CODES)[number]

/** `key` is the key of the area, table or join at fault. */
export interface FloorPlanIssue {
  code: FloorPlanIssueCode
  key: string
}

export type FloorPlanParts = Pick<FloorPlan, 'grid' | 'areas' | 'tables' | 'joins'>

/** Every issue found (not only the first), in the order areas, tables, joins. */
export function checkFloorPlan(plan: FloorPlanParts): FloorPlanIssue[] {
  const issues: FloorPlanIssue[] = []
  const add = (code: FloorPlanIssueCode, key: string) => issues.push({ code, key })

  const areaKeys = new Set<string>()
  for (const a of plan.areas) {
    if (areaKeys.has(a.key)) add('duplicate_area', a.key)
    areaKeys.add(a.key)
  }

  const tableArea = new Map<string, string>()
  const numbers = new Set<string>()
  for (const t of plan.tables) {
    if (tableArea.has(t.key)) add('duplicate_key', t.key)
    else tableArea.set(t.key, t.areaKey)
    const number = t.number.trim()
    if (numbers.has(number)) add('duplicate_number', t.key)
    numbers.add(number)
    if (!areaKeys.has(t.areaKey)) add('area_missing', t.key)
    const width = t.turned ? t.h : t.w
    const height = t.turned ? t.w : t.h
    if (t.x < 0 || t.y < 0 || t.x + width > plan.grid.cols || t.y + height > plan.grid.rows) add('outside_grid', t.key)
  }

  const joinKeys = new Set<string>()
  for (const j of plan.joins) {
    if (joinKeys.has(j.key)) add('duplicate_join', j.key)
    joinKeys.add(j.key)
    if (j.tableKeys.some((k) => !tableArea.has(k))) add('join_table_missing', j.key)
    if (new Set(j.tableKeys).size !== j.tableKeys.length) add('join_repeated_table', j.key)
    const areas = new Set(j.tableKeys.filter((k) => tableArea.has(k)).map((k) => tableArea.get(k)))
    if (areas.size > 1) add('join_mixed_areas', j.key)
  }
  return issues
}

const KEY_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const randomKey = (): string =>
  Array.from({ length: 8 }, () => KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)]).join('')

/** The plan an editor starts from: one area per usable name (trimmed, repeats dropped, at most 10), no tables. */
export function emptyFloorPlan(areaNames: readonly string[], makeKey: () => string = randomKey): FloorPlanParts {
  const names: string[] = []
  for (const raw of areaNames) {
    const name = raw.trim()
    if (name && !names.includes(name) && names.length < 10) names.push(name)
  }
  return {
    grid: { cols: 24, rows: 16 },
    areas: names.map((name, order) => ({ key: makeKey(), name, order })),
    tables: [],
    joins: []
  }
}
