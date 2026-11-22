import type { FloorPlan, FloorTable } from '@models/floor-plan.model'

type FloorTableShape = FloorTable['shape']

/** Plan 665: pure grid arithmetic of the room. Everything is counted in whole cells; `x` from the inline start. */

/** The live look of a table (plan 671 computes it); here it only sets `data-state`, and `not_active` the text. */
export type FloorTableState = 'free' | 'reserved_soon' | 'seated' | 'over_time' | 'late' | 'not_active'

export type Direction = 'rtl' | 'ltr'
export type GridSize = { cols: number; rows: number }
export type CellBox = { x: number; y: number }

export const MAX_TABLES = 200

export type TablePreset = { id: string; labelKey: string; shape: FloorTableShape; minSeats: number; maxSeats: number }

export const TABLE_PRESETS: readonly TablePreset[] = [
  { id: 'p2', labelKey: 'fp_preset_2', shape: 'round', minSeats: 1, maxSeats: 2 },
  { id: 'p4', labelKey: 'fp_preset_4', shape: 'square', minSeats: 2, maxSeats: 4 },
  { id: 'p6', labelKey: 'fp_preset_6', shape: 'rect', minSeats: 4, maxSeats: 6 },
  { id: 'p8', labelKey: 'fp_preset_8', shape: 'rect', minSeats: 6, maxSeats: 8 },
  { id: 'pbar', labelKey: 'fp_preset_bar', shape: 'round', minSeats: 1, maxSeats: 1 }
]

const clamp = (n: number, min: number, max: number): number => Math.min(Math.max(n, min), max)

/** The stored size (turned = false) of a table of this shape and largest party, 1–8 cells. */
export function sizeFor(shape: FloorTableShape, maxSeats: number): { w: number; h: number } {
  if (maxSeats <= 1) return { w: 1, h: 1 }
  if (shape === 'rect') return { w: clamp(Math.ceil(maxSeats / 2) + 1, 2, 8), h: 2 }
  const side = maxSeats <= 2 ? 2 : maxSeats <= 4 ? 3 : maxSeats <= 6 ? 4 : 5
  return { w: side, h: side }
}

/** The cells a table covers on the grid: its size, with the two numbers swapped when it is turned. */
export function footprintFor(table: Pick<FloorTable, 'shape' | 'maxSeats' | 'turned'>): { w: number; h: number } {
  const { w, h } = sizeFor(table.shape, table.maxSeats)
  return table.turned ? { w: h, h: w } : { w, h }
}

/** The cells a stored table covers (its stored `w` × `h`, swapped when turned) — the same rule the server checks. */
export function coveredBy(table: Pick<FloorTable, 'w' | 'h' | 'turned'>): { w: number; h: number } {
  return table.turned ? { w: table.h, h: table.w } : { w: table.w, h: table.h }
}

/**
 * Where a table lands after a drag of `dx` / `dy` pixels. A move to the right is `−x` in RTL (x counts from the
 * inline start) and `+x` in LTR. The result stays inside the grid for the table's footprint.
 */
export function movedCell(
  from: CellBox,
  footprint: { w: number; h: number },
  deltaPx: { dx: number; dy: number },
  cellPx: number,
  dir: Direction,
  grid: GridSize
): CellBox {
  if (!(cellPx > 0)) return { ...from }
  const cellsX = Math.round(deltaPx.dx / cellPx) * (dir === 'rtl' ? -1 : 1)
  const cellsY = Math.round(deltaPx.dy / cellPx)
  return {
    x: clamp(from.x + cellsX, 0, Math.max(0, grid.cols - footprint.w)),
    y: clamp(from.y + cellsY, 0, Math.max(0, grid.rows - footprint.h))
  }
}

export type StepArrow = 'up' | 'down' | 'left' | 'right'

/** The one-cell change of a table for an arrow, as it points on the screen: `left` is `x + 1` in RTL, `x − 1` in LTR. */
function stepDelta(arrow: StepArrow, dir: Direction): { dx: number; dy: number } {
  const sign = dir === 'rtl' ? -1 : 1
  if (arrow === 'up') return { dx: 0, dy: -1 }
  if (arrow === 'down') return { dx: 0, dy: 1 }
  return { dx: (arrow === 'right' ? 1 : -1) * sign, dy: 0 }
}

/** The cell after one arrow step; the same cell when the step would leave the room. */
export function stepCell(
  from: CellBox,
  footprint: { w: number; h: number },
  arrow: StepArrow,
  dir: Direction,
  grid: GridSize
): CellBox {
  const { dx, dy } = stepDelta(arrow, dir)
  const x = from.x + dx
  const y = from.y + dy
  if (x < 0 || y < 0 || x + footprint.w > grid.cols || y + footprint.h > grid.rows) return { ...from }
  return { x, y }
}

/** False when an arrow step would leave the room. */
export function canStep(
  from: CellBox,
  footprint: { w: number; h: number },
  arrow: StepArrow,
  dir: Direction,
  grid: GridSize
): boolean {
  const to = stepCell(from, footprint, arrow, dir, grid)
  return to.x !== from.x || to.y !== from.y
}

/** True when a drag is shorter than half a cell on both axes: the press was a tap. */
export function isTinyDrag(deltaPx: { dx: number; dy: number }, cellPx: number): boolean {
  return Math.abs(deltaPx.dx) < cellPx / 2 && Math.abs(deltaPx.dy) < cellPx / 2
}

type Box = CellBox & { w: number; h: number }
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** First cell (rows from the top, each row from the inline start) where a `w` × `h` table overlaps nothing; 0,0 when none. */
export function firstFreeCell(plan: Pick<FloorPlan, 'grid' | 'tables'>, size: { w: number; h: number }): CellBox {
  const boxes: Box[] = plan.tables.map((t) => ({ x: t.x, y: t.y, ...coveredBy(t) }))
  for (let y = 0; y + size.h <= plan.grid.rows; y++) {
    for (let x = 0; x + size.w <= plan.grid.cols; x++) {
      if (!boxes.some((b) => overlaps({ x, y, ...size }, b))) return { x, y }
    }
  }
  return { x: 0, y: 0 }
}

/** The highest whole number in use + 1, as text; '1' on an empty plan. */
export function nextTableNumber(plan: Pick<FloorPlan, 'tables'>): string {
  let highest = 0
  for (const t of plan.tables) {
    const n = /^\d+$/.test(t.number.trim()) ? Number(t.number) : 0
    if (n > highest) highest = n
  }
  return String(highest + 1)
}

const KEY_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** A key for an area, table or join: 8 characters of `[a-z0-9]`. */
export function newKey(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => KEY_CHARS[b % KEY_CHARS.length]).join('')
}

export type ChairsPerSide = { top: number; end: number; bottom: number; start: number }
const MAX_CHAIRS = 12

/** How many chairs sit on each side: `maxSeats` of them, at most 12 drawn. Round / square spread from the top; rect on the long sides. */
export function chairsFor(table: Pick<FloorTable, 'shape' | 'maxSeats'>): ChairsPerSide {
  const total = Math.min(Math.max(table.maxSeats, 0), MAX_CHAIRS)
  const sides: ChairsPerSide = { top: 0, end: 0, bottom: 0, start: 0 }
  if (table.shape === 'rect') {
    let rest = total
    if (total >= 6) {
      sides.end = 1
      sides.start = 1
      rest -= 2
    }
    sides.top = Math.ceil(rest / 2)
    sides.bottom = Math.floor(rest / 2)
    return sides
  }
  const order: (keyof ChairsPerSide)[] = ['top', 'bottom', 'end', 'start']
  for (let i = 0; i < total; i++) sides[order[i % 4]]++
  return sides
}
