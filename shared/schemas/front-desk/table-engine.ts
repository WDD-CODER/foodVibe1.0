/**
 * Plan 663 (C-ENGINE): the one table engine. Pure functions, no clock, no database: the server and the browser run this
 * same file and always get the same answer for the same question. Settings come only through `tableServiceOf`.
 */
import type { FloorPlan } from '../entities/floor-plan.schema'
import type { FrontDeskProfile } from '../entities/front-desk-profile.schema'
import { jerusalemDateTime, jerusalemEpoch } from './local-time'
import { openRangesOf } from './qualify'
import { tableServiceOf } from './table-service'
import type { TableServiceSettings } from './table-service'

/** A table held for a time span; `endAt` already includes the buffer (epoch ms). */
export interface Hold {
  tableKey: string
  startAt: number
  endAt: number
}

/** One question: a party, a date and time, an optional area preference, and the caller's clock. */
export interface Ask {
  date: string
  time: string
  partySize: number
  areaKey?: string
  onlineOnly: boolean
  now: number
}

export interface Candidate {
  tableKeys: string[]
  seats: { min: number; max: number }
}

export type AssignReason = 'closed' | 'too_late' | 'too_soon' | 'too_far' | 'too_big' | 'too_small' | 'full' | 'no_plan'
export type Assignment =
  | { ok: true; tableKeys: string[]; startAt: number; endAt: number }
  | { ok: false; reason: AssignReason }

export interface ServiceWindow {
  startAt: number
  endAt: number
}

type EngineProfile = Pick<FrontDeskProfile, 'hours' | 'closedDates' | 'requestKinds'> & {
  tableService?: FrontDeskProfile['tableService']
}

const MIN_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/** The date `n` days after `date` (YYYY-MM-DD), computed in UTC from the string. Pure. */
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** The service windows that touch `date`: its own ranges and the overnight tail of the day before. Pure. */
export function windowsOf(profile: EngineProfile, date: string): ServiceWindow[] {
  const closed = profile.closedDates ?? []
  const out: ServiceWindow[] = []
  if (!closed.includes(date)) {
    for (const r of openRangesOf(profile.hours, date)) {
      out.push({
        startAt: jerusalemEpoch(date, r.open),
        endAt: jerusalemEpoch(r.overnight ? addDays(date, 1) : date, r.close)
      })
    }
  }
  const before = addDays(date, -1)
  if (!closed.includes(before)) {
    for (const r of openRangesOf(profile.hours, before)) {
      if (r.overnight) out.push({ startAt: jerusalemEpoch(before, r.open), endAt: jerusalemEpoch(date, r.close) })
    }
  }
  return out
}

/** Every grid start of a window that falls on `date`, with whether it is still within the last seating. Pure. */
function gridStarts(profile: EngineProfile, date: string, service: TableServiceSettings): Array<{ start: number; late: boolean }> {
  const from = jerusalemEpoch(date, '00:00')
  const to = jerusalemEpoch(addDays(date, 1), '00:00')
  const step = service.slotMinutes * MIN_MS
  const seen = new Map<number, boolean>()
  for (const w of windowsOf(profile, date)) {
    const lastStart = w.endAt - service.lastSeatingBeforeCloseMinutes * MIN_MS
    for (let s = w.startAt; s < w.endAt; s += step) {
      if (s < from || s >= to) continue
      const late = s > lastStart
      seen.set(s, (seen.get(s) ?? true) && late)
    }
  }
  return [...seen.entries()].map(([start, late]) => ({ start, late })).sort((a, b) => a.start - b.start)
}

/** Which lead rule a start breaks, if any (`too_soon` also covers a start before `now`). Pure. */
function leadFailure(profile: EngineProfile, start: number, now: number): 'too_soon' | 'too_far' | null {
  const rules = profile.requestKinds?.table?.rules ?? {}
  const lead = start - now
  if (start < now) return 'too_soon'
  if (rules.minLeadHours !== undefined && lead < rules.minLeadHours * HOUR_MS) return 'too_soon'
  if (rules.maxLeadDays !== undefined && lead > rules.maxLeadDays * DAY_MS) return 'too_far'
  return null
}

/** The bookable start times ('HH:mm') of `date`, ascending, without repeats. Pure. */
export function slotsFor(profile: EngineProfile, date: string, now: number): string[] {
  const service = tableServiceOf(profile)
  const times: string[] = []
  for (const { start, late } of gridStarts(profile, date, service)) {
    if (late || leadFailure(profile, start, now)) continue
    const time = jerusalemDateTime(start).time
    if (!times.includes(time)) times.push(time)
  }
  return times
}

/** The turn length in minutes for a party: the first ladder step that holds it, else the last step. Pure. */
export function turnFor(service: TableServiceSettings, partySize: number): number {
  const ladder = service.turnMinutes
  const step = ladder.find((s) => s.maxParty >= partySize) ?? ladder[ladder.length - 1]
  return step.minutes
}

const WHOLE = /^\d+$/

/** Compares two table numbers: as numbers when both are whole numbers, else as plain strings. */
function compareNumbers(a: string, b: string): number {
  if (WHOLE.test(a) && WHOLE.test(b)) return Number(a) - Number(b)
  return a < b ? -1 : a > b ? 1 : 0
}

interface Usable extends Candidate {
  first: string
  areaKeys: string[]
  single: boolean
}

/** Every table and declared join that is usable for the caller, whatever the party. */
function usable(plan: FloorPlan, onlineOnly: boolean): Usable[] {
  const byKey = new Map(plan.tables.map((t) => [t.key, t]))
  const out: Usable[] = []
  for (const t of plan.tables) {
    if (!t.active || (onlineOnly && !t.online)) continue
    out.push({ tableKeys: [t.key], seats: { min: t.minSeats, max: t.maxSeats }, first: t.number, areaKeys: [t.areaKey], single: true })
  }
  for (const j of plan.joins) {
    const tables = j.tableKeys.map((k) => byKey.get(k))
    if (tables.some((t) => !t || !t.active) || (onlineOnly && !j.online)) continue
    const sorted = (tables as NonNullable<(typeof tables)[number]>[]).slice().sort((a, b) => compareNumbers(a.number, b.number) || (a.key < b.key ? -1 : 1))
    out.push({
      tableKeys: sorted.map((t) => t.key),
      seats: { min: j.minSeats, max: j.maxSeats },
      first: sorted[0].number,
      areaKeys: sorted.map((t) => t.areaKey),
      single: false
    })
  }
  return out
}

/** The tables and joins that can seat the party, best first (fewest wasted seats, area, singles, number). Pure. */
export function candidates(plan: FloorPlan | null, partySize: number, areaKey: string | undefined, onlineOnly: boolean): Candidate[] {
  if (!plan) return []
  const preferred = (c: Usable): number => (areaKey !== undefined && c.areaKeys.every((a) => a === areaKey) ? 0 : 1)
  return usable(plan, onlineOnly)
    .filter((c) => c.seats.min <= partySize && partySize <= c.seats.max)
    .sort(
      (a, b) =>
        a.seats.max - partySize - (b.seats.max - partySize) ||
        preferred(a) - preferred(b) ||
        Number(b.single) - Number(a.single) ||
        compareNumbers(a.first, b.first) ||
        (a.tableKeys[0] < b.tableKeys[0] ? -1 : a.tableKeys[0] > b.tableKeys[0] ? 1 : 0)
    )
    .map((c) => ({ tableKeys: c.tableKeys, seats: c.seats }))
}

/** Is any hold of the candidate's tables overlapping `[startAt, endAt + buffer)`? Pure. */
function busy(c: Candidate, holds: Hold[], startAt: number, endAt: number, bufferMs: number): boolean {
  return holds.some((h) => c.tableKeys.includes(h.tableKey) && h.startAt < endAt + bufferMs && h.endAt > startAt)
}

/** Can this party sit at `ask.date` + `ask.time`, and where? The first failing rule gives the reason. Pure. */
export function assign(plan: FloorPlan | null, profile: EngineProfile, holds: Hold[], ask: Ask): Assignment {
  if (!plan || !plan.tables.some((t) => t.active)) return { ok: false, reason: 'no_plan' }
  const service = tableServiceOf(profile)
  const startAt = jerusalemEpoch(ask.date, ask.time)
  const grid = gridStarts(profile, ask.date, service).find((g) => g.start === startAt)
  if (!grid) return { ok: false, reason: 'closed' }
  if (grid.late) return { ok: false, reason: 'too_late' }
  const lead = leadFailure(profile, startAt, ask.now)
  if (lead) return { ok: false, reason: lead }

  const rules = profile.requestKinds?.table?.rules ?? {}
  const pool = usable(plan, ask.onlineOnly)
  const maxSeats = Math.max(0, ...pool.map((c) => c.seats.max))
  const minSeats = pool.length ? Math.min(...pool.map((c) => c.seats.min)) : 0
  if ((rules.maxPartySize !== undefined && ask.partySize > rules.maxPartySize) || ask.partySize > maxSeats) {
    return { ok: false, reason: 'too_big' }
  }
  if ((rules.minPartySize !== undefined && ask.partySize < rules.minPartySize) || ask.partySize < minSeats) {
    return { ok: false, reason: 'too_small' }
  }

  const endAt = startAt + turnFor(service, ask.partySize) * MIN_MS
  const found = candidates(plan, ask.partySize, ask.areaKey, ask.onlineOnly)
  if (!found.length) return { ok: false, reason: 'full' }
  const free = found.find((c) => !busy(c, holds, startAt, endAt, service.bufferMinutes * MIN_MS))
  if (!free) return { ok: false, reason: 'full' }
  return { ok: true, tableKeys: free.tableKeys, startAt, endAt }
}

/** Up to three other times for the same party: ±90 minutes on the day, then the next two open days. Pure. */
export function alternatives(
  plan: FloorPlan | null,
  profile: EngineProfile,
  holdsByDate: Record<string, Hold[]>,
  ask: Ask
): Array<{ date: string; time: string }> {
  const accepts = (date: string, time: string): boolean =>
    assign(plan, profile, holdsByDate[date] ?? [], { ...ask, date, time }).ok
  const asked = jerusalemEpoch(ask.date, ask.time)
  const out: Array<{ date: string; time: string }> = []

  const near = slotsFor(profile, ask.date, ask.now)
    .map((time) => ({ time, diff: jerusalemEpoch(ask.date, time) - asked }))
    .filter((s) => s.diff !== 0 && Math.abs(s.diff) <= 90 * MIN_MS)
    .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff) || a.diff - b.diff)
  for (const s of near) {
    if (out.length >= 3) break
    if (accepts(ask.date, s.time)) out.push({ date: ask.date, time: s.time })
  }

  let days = 0
  for (let i = 1; i <= 14 && out.length < 3 && days < 2; i++) {
    const date = addDays(ask.date, i)
    if (accepts(date, ask.time)) {
      out.push({ date, time: ask.time })
      days++
    }
  }
  return out
}

/** Every slot of `date` with whether the party can be seated at it. Pure. */
export function dayAvailability(
  plan: FloorPlan | null,
  profile: EngineProfile,
  holds: Hold[],
  q: { date: string; partySize: number; areaKey?: string; onlineOnly: boolean; now: number }
): Array<{ time: string; available: boolean }> {
  return slotsFor(profile, q.date, q.now).map((time) => ({
    time,
    available: assign(plan, profile, holds, { ...q, time }).ok
  }))
}
