import type { FloorTable } from '@models/floor-plan.model'
import {
  chairsFor,
  firstFreeCell,
  footprintFor,
  isTinyDrag,
  movedCell,
  newKey,
  nextTableNumber,
  canStep,
  stepCell
} from './floor-geometry.util'

const table = (over: Partial<FloorTable>): FloorTable => ({
  key: 'abcdef',
  number: '1',
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

describe('floor-geometry.util (plan 665)', () => {
  describe('footprintFor', () => {
    it('sizes by shape and largest party', () => {
      expect(footprintFor({ shape: 'round', maxSeats: 1, turned: false })).toEqual({ w: 1, h: 1 })
      expect(footprintFor({ shape: 'round', maxSeats: 2, turned: false })).toEqual({ w: 2, h: 2 })
      expect(footprintFor({ shape: 'square', maxSeats: 4, turned: false })).toEqual({ w: 3, h: 3 })
      expect(footprintFor({ shape: 'rect', maxSeats: 6, turned: false })).toEqual({ w: 4, h: 2 })
      expect(footprintFor({ shape: 'rect', maxSeats: 8, turned: false })).toEqual({ w: 5, h: 2 })
    })

    it('swaps the two numbers when turned', () => {
      expect(footprintFor({ shape: 'rect', maxSeats: 8, turned: true })).toEqual({ w: 2, h: 5 })
    })
  })

  describe('movedCell', () => {
    const grid = { cols: 24, rows: 16 }
    const fp = { w: 3, h: 3 }

    it('moves x by -2 in RTL and +2 in LTR for +50px on a 25px cell', () => {
      expect(movedCell({ x: 10, y: 5 }, fp, { dx: 50, dy: 0 }, 25, 'rtl', grid)).toEqual({ x: 8, y: 5 })
      expect(movedCell({ x: 10, y: 5 }, fp, { dx: 50, dy: 0 }, 25, 'ltr', grid)).toEqual({ x: 12, y: 5 })
    })

    it('moves y the same way in both directions', () => {
      expect(movedCell({ x: 1, y: 5 }, fp, { dx: 0, dy: 50 }, 25, 'rtl', grid)).toEqual({ x: 1, y: 7 })
    })

    it('never leaves the grid', () => {
      expect(movedCell({ x: 1, y: 1 }, fp, { dx: 500, dy: -500 }, 25, 'rtl', grid)).toEqual({ x: 0, y: 0 })
      expect(movedCell({ x: 20, y: 12 }, fp, { dx: 500, dy: 500 }, 25, 'ltr', grid)).toEqual({ x: 21, y: 13 })
    })

    it('treats a drag under half a cell as a tap', () => {
      expect(isTinyDrag({ dx: 10, dy: -5 }, 25)).toBeTrue()
      expect(isTinyDrag({ dx: 13, dy: 0 }, 25)).toBeFalse()
    })
  })

  describe('firstFreeCell', () => {
    const grid = { cols: 24, rows: 16 }

    it('returns 0,0 on an empty plan', () => {
      expect(firstFreeCell({ grid, tables: [] }, { w: 3, h: 3 })).toEqual({ x: 0, y: 0 })
    })

    it('returns the first cell that overlaps nothing', () => {
      const tables = [table({ x: 0, y: 0, w: 3, h: 3 })]
      expect(firstFreeCell({ grid, tables }, { w: 2, h: 2 })).toEqual({ x: 3, y: 0 })
    })

    it('falls back to 0,0 when the room is full', () => {
      const tables = [table({ x: 0, y: 0, w: 8, h: 8 })]
      expect(firstFreeCell({ grid: { cols: 10, rows: 10 }, tables }, { w: 10, h: 10 })).toEqual({ x: 0, y: 0 })
    })
  })

  describe('nextTableNumber', () => {
    it('starts at 1 and follows the highest number', () => {
      expect(nextTableNumber({ tables: [] })).toBe('1')
      expect(
        nextTableNumber({ tables: [table({ number: '3' }), table({ number: '7' }), table({ number: 'A' })] })
      ).toBe('8')
    })
  })

  it('newKey matches the key pattern', () => {
    for (let i = 0; i < 20; i++) expect(newKey()).toMatch(/^[a-z0-9]{6,12}$/)
  })

  it('chairsFor gives maxSeats chairs, at most 12', () => {
    const sum = (c: ReturnType<typeof chairsFor>) => c.top + c.end + c.bottom + c.start
    expect(sum(chairsFor({ shape: 'square', maxSeats: 4 }))).toBe(4)
    expect(chairsFor({ shape: 'rect', maxSeats: 6 })).toEqual({ top: 2, end: 1, bottom: 2, start: 1 })
    expect(chairsFor({ shape: 'rect', maxSeats: 4 })).toEqual({ top: 2, end: 0, bottom: 2, start: 0 })
    expect(sum(chairsFor({ shape: 'round', maxSeats: 30 }))).toBe(12)
  })
})

describe('stepCell / canStep (plan 666)', () => {
  const grid = { cols: 10, rows: 10 }
  const fp = { w: 2, h: 2 }

  it('moves the left arrow by +1 in RTL and −1 in LTR', () => {
    expect(stepCell({ x: 3, y: 3 }, fp, 'left', 'rtl', grid)).toEqual({ x: 4, y: 3 })
    expect(stepCell({ x: 3, y: 3 }, fp, 'left', 'ltr', grid)).toEqual({ x: 2, y: 3 })
    expect(stepCell({ x: 3, y: 3 }, fp, 'right', 'rtl', grid)).toEqual({ x: 2, y: 3 })
  })

  it('moves up by −1 and down by +1 in both directions', () => {
    expect(stepCell({ x: 3, y: 3 }, fp, 'up', 'rtl', grid)).toEqual({ x: 3, y: 2 })
    expect(stepCell({ x: 3, y: 3 }, fp, 'down', 'ltr', grid)).toEqual({ x: 3, y: 4 })
  })

  it('returns the same cell when the step would leave the room, and canStep is false there', () => {
    expect(stepCell({ x: 0, y: 0 }, fp, 'up', 'rtl', grid)).toEqual({ x: 0, y: 0 })
    expect(canStep({ x: 0, y: 0 }, fp, 'up', 'rtl', grid)).toBeFalse()
    expect(canStep({ x: 8, y: 0 }, fp, 'left', 'rtl', grid)).toBeFalse()
    expect(canStep({ x: 8, y: 0 }, fp, 'left', 'ltr', grid)).toBeTrue()
  })
})
