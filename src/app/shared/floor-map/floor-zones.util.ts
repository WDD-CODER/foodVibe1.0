import type { FloorTable } from '@models/floor-plan.model'
import { coveredBy, type CellBox, type Direction, type GridSize } from './floor-geometry.util'

/**
 * Plan 699: pure cell arithmetic of an area's zone (one rectangle per area). Everything is counted in whole cells,
 * `x` from the inline start, as tables are (`floor-geometry.util.ts`).
 */

/** How many zone colours the palette has (`--color-zone-0` … `--color-zone-7`). */
export const ZONE_COLOR_COUNT = 8
/** The smallest zone side, in cells. */
export const MIN_ZONE_SIDE = 2

export type ZoneRect = { x: number; y: number; w: number; h: number }
/** A handle of a selected zone: block side (start = top) then inline side (start = the right in Hebrew). */
export type ZoneCorner = 'start-start' | 'start-end' | 'end-start' | 'end-end'
export const ZONE_CORNERS: readonly ZoneCorner[] = ['start-start', 'start-end', 'end-start', 'end-end']

const clamp = (n: number, min: number, max: number): number => Math.min(Math.max(n, min), max)

/** The palette index of an area: its stored colour, else `order % 8`. */
export function colorOf(area: { order: number; color?: number }): number {
  if (area.color !== undefined) return area.color
  return ((area.order % ZONE_COLOR_COUNT) + ZONE_COLOR_COUNT) % ZONE_COLOR_COUNT
}

/** The rectangle that spans two cells, both included, whichever order they come in. */
export function rectFromCells(a: CellBox, b: CellBox): ZoneRect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, w: Math.abs(a.x - b.x) + 1, h: Math.abs(a.y - b.y) + 1 }
}

/**
 * The cell under a client point inside a grid's bounding box. In RTL column 0 is at the right edge. A point outside the
 * box gives the nearest cell on the grid.
 */
export function cellAtPoint(
  point: { x: number; y: number },
  box: { left: number; top: number; width: number; height: number },
  grid: GridSize,
  dir: Direction
): CellBox {
  const fromLeft = box.width > 0 ? Math.floor(((point.x - box.left) / box.width) * grid.cols) : 0
  const fromTop = box.height > 0 ? Math.floor(((point.y - box.top) / box.height) * grid.rows) : 0
  const col = clamp(fromLeft, 0, grid.cols - 1)
  return { x: dir === 'rtl' ? grid.cols - 1 - col : col, y: clamp(fromTop, 0, grid.rows - 1) }
}

/** A drag of `dx` / `dy` pixels as whole cells along `x` (from the inline start) and `y`. */
export function deltaCells(
  deltaPx: { dx: number; dy: number },
  cellPx: number,
  dir: Direction
): { dx: number; dy: number } {
  if (!(cellPx > 0)) return { dx: 0, dy: 0 }
  const dx = Math.round(deltaPx.dx / cellPx) * (dir === 'rtl' ? -1 : 1)
  return { dx: dx === 0 ? 0 : dx, dy: Math.round(deltaPx.dy / cellPx) || 0 }
}

/**
 * The rectangle after one corner moved by `dCells` (along `x` from the inline start, `y` down). The other corner stays
 * where it is; the rect never goes under 2 × 2 and never leaves the grid.
 */
export function resizedRect(
  rect: ZoneRect,
  corner: ZoneCorner,
  dCells: { dx: number; dy: number },
  grid: GridSize
): ZoneRect {
  const [block, inline] = corner.split('-') as ['start' | 'end', 'start' | 'end']
  let { x, y, w, h } = rect
  if (inline === 'start') {
    const right = x + w
    x = clamp(x + dCells.dx, 0, right - MIN_ZONE_SIDE)
    w = right - x
  } else {
    w = clamp(w + dCells.dx, MIN_ZONE_SIDE, grid.cols - x)
  }
  if (block === 'start') {
    const bottom = y + h
    y = clamp(y + dCells.dy, 0, bottom - MIN_ZONE_SIDE)
    h = bottom - y
  } else {
    h = clamp(h + dCells.dy, MIN_ZONE_SIDE, grid.rows - y)
  }
  return { x, y, w, h }
}

/** The rectangle moved by `dCells`, kept inside the grid. */
export function movedRect(rect: ZoneRect, dCells: { dx: number; dy: number }, grid: GridSize): ZoneRect {
  return {
    ...rect,
    x: clamp(rect.x + dCells.dx, 0, Math.max(0, grid.cols - rect.w)),
    y: clamp(rect.y + dCells.dy, 0, Math.max(0, grid.rows - rect.h))
  }
}

/** True when two rectangles share a cell; touching edges do not count. */
export function rectsOverlap(a: ZoneRect, b: ZoneRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/** True when the rectangle lies fully inside the grid. */
export function rectInGrid(rect: ZoneRect, grid: GridSize): boolean {
  return rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= grid.cols && rect.y + rect.h <= grid.rows
}

/**
 * True when the centre of the cells a table covers (turned = width and height swapped) lies in the rectangle. The
 * rectangle's start edges count, its end edges do not, so a table centred on the line between two touching zones
 * belongs to exactly one.
 */
export function tableCentreIn(table: Pick<FloorTable, 'x' | 'y' | 'w' | 'h' | 'turned'>, rect: ZoneRect): boolean {
  const { w, h } = coveredBy(table)
  const cx = table.x + w / 2
  const cy = table.y + h / 2
  return cx >= rect.x && cx < rect.x + rect.w && cy >= rect.y && cy < rect.y + rect.h
}
