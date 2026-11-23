import type { Booking } from '@models/booking.model'
import type { FloorMapPlan } from 'src/app/shared/floor-map/floor-map.component'
import type { FloorTableState } from 'src/app/shared/floor-map/floor-geometry.util'

/** Plan 671: the live look of one table at one moment. */
export type TableState = FloorTableState
export interface TableLook {
  state: TableState
  name?: string
  time?: string
  bookingId?: string
}

const MINUTE_MS = 60000
/** A confirmed booking that starts within this many minutes of the moment marks its table "reserved soon". */
export const RESERVED_SOON_MINUTES = 90

type Held = Pick<Booking, '_id' | 'kind' | 'status' | 'startAt' | 'endAt' | 'tableKeys' | 'guestName' | 'time'>

/**
 * Plan 671: one state per table of the plan, first match wins: not active, over time (live), seated, late (live),
 * reserved soon, free. Only table bookings with `tableKeys` count; finished, cancelled and no-show hold nothing.
 * `name` is the booking's guest name, or `walkInName` when it is empty.
 */
export function tableStatesAt(
  plan: Pick<FloorMapPlan, 'tables'>,
  bookings: readonly Held[],
  moment: number,
  opts: { live: boolean; holdMinutes: number; walkInName?: string }
): Record<string, TableLook> {
  const byTable = new Map<string, Held[]>()
  for (const b of bookings) {
    if (b.kind !== 'table' || !b.tableKeys?.length) continue
    if (b.status !== 'confirmed' && b.status !== 'seated') continue
    for (const key of b.tableKeys) byTable.set(key, [...(byTable.get(key) ?? []), b])
  }
  const result: Record<string, TableLook> = {}
  for (const table of plan.tables) {
    if (!table.active) {
      result[table.key] = { state: 'not_active' }
      continue
    }
    const mine = (byTable.get(table.key) ?? []).sort((a, b) => a.startAt - b.startAt)
    const look = (state: TableState, b?: Held): TableLook =>
      b ? { state, name: b.guestName || opts.walkInName, time: b.time, bookingId: b._id } : { state }
    const seated = mine.filter((b) => b.status === 'seated')
    const confirmed = mine.filter((b) => b.status === 'confirmed')
    const over = opts.live ? seated.find((b) => moment > b.endAt) : undefined
    const sitting = opts.live ? seated[0] : seated.find((b) => b.startAt <= moment && moment < b.endAt)
    const late = opts.live ? confirmed.find((b) => moment > b.startAt + opts.holdMinutes * MINUTE_MS) : undefined
    const soon = confirmed.find((b) => b.startAt - RESERVED_SOON_MINUTES * MINUTE_MS <= moment && moment < b.endAt)
    if (over) result[table.key] = look('over_time', over)
    else if (sitting) result[table.key] = look('seated', sitting)
    else if (late) result[table.key] = look('late', late)
    else if (soon) result[table.key] = look('reserved_soon', soon)
    else result[table.key] = look('free')
  }
  return result
}

export interface StripTime {
  time: string
  /** True for a time after midnight of a range that opens the evening before. */
  nextDay: boolean
}

const toMinutes = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const toHhmm = (minutes: number): string => {
  const m = minutes % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** The times of a day's opening ranges in `stepMinutes` steps, from each opening up to (not including) its close. */
export function stripTimes(
  ranges: readonly { open: string; close: string; overnight: boolean }[],
  stepMinutes: number
): StripTime[] {
  const seen = new Set<string>()
  const out: StripTime[] = []
  for (const r of ranges) {
    const start = toMinutes(r.open)
    const end = r.overnight ? toMinutes(r.close) + 1440 : toMinutes(r.close)
    for (let t = start; t < end; t += stepMinutes) {
      const time = toHhmm(t)
      if (seen.has(time)) continue
      seen.add(time)
      out.push({ time, nextDay: t >= 1440 })
    }
  }
  return out
}
