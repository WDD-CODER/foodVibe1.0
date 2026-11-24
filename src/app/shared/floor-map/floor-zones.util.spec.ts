import {
  cellAtPoint,
  colorOf,
  deltaCells,
  movedRect,
  rectFromCells,
  rectInGrid,
  rectsOverlap,
  resizedRect,
  tableCentreIn,
  ZONE_COLOR_COUNT
} from './floor-zones.util'

const grid = { cols: 24, rows: 16 }
const box = { left: 100, top: 50, width: 240, height: 160 }

describe('floor-zones.util (plan 699)', () => {
  it('colorOf: the stored colour, else order % 8', () => {
    expect(ZONE_COLOR_COUNT).toBe(8)
    expect(colorOf({ order: 9 })).toBe(1)
    expect(colorOf({ order: 2 })).toBe(2)
    expect(colorOf({ order: 9, color: 5 })).toBe(5)
    expect(colorOf({ order: 3, color: 0 })).toBe(0)
  })

  it('rectFromCells spans both cells in any order', () => {
    expect(rectFromCells({ x: 5, y: 2 }, { x: 1, y: 6 })).toEqual({ x: 1, y: 2, w: 5, h: 5 })
    expect(rectFromCells({ x: 3, y: 3 }, { x: 3, y: 3 })).toEqual({ x: 3, y: 3, w: 1, h: 1 })
  })

  it('cellAtPoint mirrors the column in RTL and clamps to the grid', () => {
    expect(cellAtPoint({ x: 340, y: 50 }, box, grid, 'rtl')).toEqual({ x: 0, y: 0 })
    expect(cellAtPoint({ x: 340, y: 50 }, box, grid, 'ltr')).toEqual({ x: 23, y: 0 })
    expect(cellAtPoint({ x: 105, y: 65 }, box, grid, 'rtl')).toEqual({ x: 23, y: 1 })
    expect(cellAtPoint({ x: 105, y: 65 }, box, grid, 'ltr')).toEqual({ x: 0, y: 1 })
    expect(cellAtPoint({ x: 0, y: 9999 }, box, grid, 'ltr')).toEqual({ x: 0, y: 15 })
    expect(cellAtPoint({ x: 9999, y: -10 }, box, grid, 'rtl')).toEqual({ x: 0, y: 0 })
  })

  it('deltaCells rounds pixels to cells, with x mirrored in RTL', () => {
    expect(deltaCells({ dx: 21, dy: -9 }, 10, 'ltr')).toEqual({ dx: 2, dy: -1 })
    expect(deltaCells({ dx: 21, dy: 0 }, 10, 'rtl')).toEqual({ dx: -2, dy: 0 })
    expect(deltaCells({ dx: 21, dy: 0 }, 0, 'rtl')).toEqual({ dx: 0, dy: 0 })
  })

  it('resizedRect: start-start +2,+1 shrinks and moves, never under 2 × 2', () => {
    const rect = { x: 2, y: 2, w: 6, h: 4 }
    expect(resizedRect(rect, 'start-start', { dx: 2, dy: 1 }, grid)).toEqual({ x: 4, y: 3, w: 4, h: 3 })
    expect(resizedRect(rect, 'start-start', { dx: 10, dy: 10 }, grid)).toEqual({ x: 6, y: 4, w: 2, h: 2 })
    expect(resizedRect(rect, 'start-start', { dx: -5, dy: -5 }, grid)).toEqual({ x: 0, y: 0, w: 8, h: 6 })
  })

  it('resizedRect: end corners grow and shrink inside the grid', () => {
    const rect = { x: 2, y: 2, w: 6, h: 4 }
    expect(resizedRect(rect, 'end-end', { dx: 3, dy: 2 }, grid)).toEqual({ x: 2, y: 2, w: 9, h: 6 })
    expect(resizedRect(rect, 'end-end', { dx: 99, dy: 99 }, grid)).toEqual({ x: 2, y: 2, w: 22, h: 14 })
    expect(resizedRect(rect, 'end-end', { dx: -99, dy: -99 }, grid)).toEqual({ x: 2, y: 2, w: 2, h: 2 })
    expect(resizedRect(rect, 'start-end', { dx: 1, dy: 1 }, grid)).toEqual({ x: 2, y: 3, w: 7, h: 3 })
    expect(resizedRect(rect, 'end-start', { dx: 1, dy: 1 }, grid)).toEqual({ x: 3, y: 2, w: 5, h: 5 })
  })

  it('movedRect keeps the rect inside the grid', () => {
    const rect = { x: 2, y: 2, w: 6, h: 4 }
    expect(movedRect(rect, { dx: 3, dy: -1 }, grid)).toEqual({ x: 5, y: 1, w: 6, h: 4 })
    expect(movedRect(rect, { dx: 99, dy: 99 }, grid)).toEqual({ x: 18, y: 12, w: 6, h: 4 })
    expect(movedRect(rect, { dx: -99, dy: -99 }, grid)).toEqual({ x: 0, y: 0, w: 6, h: 4 })
  })

  it('rectsOverlap: a shared cell yes, touching edges no', () => {
    const a = { x: 0, y: 0, w: 4, h: 4 }
    expect(rectsOverlap(a, { x: 3, y: 3, w: 2, h: 2 })).toBeTrue()
    expect(rectsOverlap(a, { x: 4, y: 0, w: 2, h: 2 })).toBeFalse()
    expect(rectsOverlap(a, { x: 0, y: 4, w: 2, h: 2 })).toBeFalse()
  })

  it('rectInGrid', () => {
    expect(rectInGrid({ x: 18, y: 12, w: 6, h: 4 }, grid)).toBeTrue()
    expect(rectInGrid({ x: 20, y: 0, w: 6, h: 4 }, grid)).toBeFalse()
    expect(rectInGrid({ x: -1, y: 0, w: 2, h: 2 }, grid)).toBeFalse()
  })

  it('tableCentreIn uses the turned footprint', () => {
    const rect = { x: 0, y: 0, w: 4, h: 4 }
    // 1 × 6 at (3, 0): centre (3.5, 3) inside; turned it covers 6 × 1, centre (6, 0.5) outside.
    expect(tableCentreIn({ x: 3, y: 0, w: 1, h: 6, turned: false }, rect)).toBeTrue()
    expect(tableCentreIn({ x: 3, y: 0, w: 1, h: 6, turned: true }, rect)).toBeFalse()
    expect(tableCentreIn({ x: 4, y: 0, w: 2, h: 2, turned: false }, rect)).toBeFalse()
  })
})
