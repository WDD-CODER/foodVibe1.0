/**
 * Plan 663: the room, the profile and the hours the table engine is tested on. Read by `server/test/table-engine.test.js`
 * and `src/app/core/utils/table-engine.spec.ts`, so the server and the browser answer the same questions.
 * The test parses `ROOM` and `profileWith()` with the real schemas, so a fixture that drifts from them fails.
 */
import type { OperatingHoursRow } from '../entities/common.schema'
import type { FloorPlan, FloorTable } from '../entities/floor-plan.schema'
import type { FrontDeskProfile, RequestKindConfig } from '../entities/front-desk-profile.schema'
import { templateFor } from '../front-desk-templates'

export const AREA_INSIDE = 'inside'
export const AREA_OUTSIDE = 'outside'
export const AREA_BAR = 'bararea'

/** The key of the table with this `number` (`'7'` → `'table07'`). */
export const tableKeyOf = (n: number | string): string => `table${String(n).padStart(2, '0')}`

const table = (
  n: number,
  areaKey: string,
  minSeats: number,
  maxSeats: number,
  extra: Partial<Pick<FloorTable, 'active' | 'online'>> = {}
): FloorTable => ({
  key: tableKeyOf(n),
  number: String(n),
  areaKey,
  shape: maxSeats <= 2 ? 'round' : 'square',
  minSeats,
  maxSeats,
  x: ((n - 1) % 7) * 3,
  y: Math.floor((n - 1) / 7) * 3,
  w: 2,
  h: 2,
  turned: false,
  active: extra.active ?? true,
  online: extra.online ?? true
})

/** 14 tables in three areas, one inactive (5), two not online (8, 12), no single table seats 9, two joins. */
export const ROOM: FloorPlan = {
  _id: 'floorplan1',
  schemaVersion: 2,
  businessId: 'biz1',
  createdBy: 'user1',
  createdAt: 1,
  updatedAt: 1,
  grid: { cols: 20, rows: 20 },
  areas: [
    { key: AREA_INSIDE, name: 'Inside', order: 0 },
    { key: AREA_OUTSIDE, name: 'Outside', order: 1 },
    { key: AREA_BAR, name: 'Bar', order: 2 }
  ],
  tables: [
    table(1, AREA_INSIDE, 2, 2),
    table(2, AREA_INSIDE, 2, 4),
    table(3, AREA_INSIDE, 2, 4),
    table(4, AREA_INSIDE, 4, 6),
    table(5, AREA_INSIDE, 2, 4, { active: false }),
    table(6, AREA_INSIDE, 6, 8),
    table(7, AREA_OUTSIDE, 2, 4),
    table(8, AREA_OUTSIDE, 2, 4, { online: false }),
    table(9, AREA_OUTSIDE, 4, 6),
    table(10, AREA_INSIDE, 2, 4),
    table(11, AREA_BAR, 2, 2),
    table(12, AREA_BAR, 2, 2, { online: false }),
    table(13, AREA_OUTSIDE, 6, 8),
    table(14, AREA_INSIDE, 4, 6)
  ],
  joins: [
    { key: 'joininside', tableKeys: [tableKeyOf(2), tableKeyOf(3)], minSeats: 7, maxSeats: 10, online: true },
    { key: 'joinoutside', tableKeys: [tableKeyOf(8), tableKeyOf(9)], minSeats: 6, maxSeats: 8, online: false }
  ]
}

export const ALL_WEEK_HOURS: OperatingHoursRow[] = [
  { days: 'א-ש', time: '12:00-23:00', dayIndexes: [0, 1, 2, 3, 4, 5, 6], open: '12:00', close: '23:00' }
]
/** Friday (5) only 12:00–15:00. */
export const FRIDAY_SHORT: OperatingHoursRow[] = [
  { days: 'ו', time: '12:00-15:00', dayIndexes: [5], open: '12:00', close: '15:00' }
]
/** Thursday (4) 18:00–02:00 (runs into Friday morning). */
export const THURSDAY_OVERNIGHT: OperatingHoursRow[] = [
  { days: 'ה', time: '18:00-02:00', dayIndexes: [4], open: '18:00', close: '02:00' }
]
/** A row no code can check. */
export const FREE_TEXT_HOURS: OperatingHoursRow[] = [{ days: 'א-ה', time: 'בערב' }]

export const LADDER = [
  { maxParty: 2, minutes: 90 },
  { maxParty: 6, minutes: 120 },
  { maxParty: 30, minutes: 150 }
]

/** The restaurant template's `table` kind, its rules overridden by `rules`. */
export function tableKind(rules: Partial<RequestKindConfig['rules']> = {}): RequestKindConfig {
  const kind = templateFor('restaurant').requestKinds['table'] as RequestKindConfig
  return { ...kind, rules: { ...kind.rules, ...rules } }
}

/** A valid profile open all week 12:00–23:00 with the restaurant's `table` kind; `overrides` replace whole fields. */
export function profileWith(overrides: Partial<FrontDeskProfile> = {}): FrontDeskProfile {
  return {
    _id: 'profile1',
    schemaVersion: 2,
    businessId: 'biz1',
    createdBy: 'user1',
    createdAt: 1,
    updatedAt: 1,
    businessType: 'restaurant',
    slug: 'test-place',
    displayName: 'Test place',
    hours: ALL_WEEK_HOURS,
    requestKinds: { table: tableKind() },
    assistant: { level: 0, tone: 'warm' },
    status: 'draft',
    ...overrides
  }
}
