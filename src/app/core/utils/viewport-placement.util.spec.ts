import { placeInViewport, PlacementInput } from './viewport-placement.util'

describe('placeInViewport', () => {
  const viewport = { width: 400, height: 800 }
  const panel = { width: 200, height: 100 }
  const anchorAt = (top: number, left: number, size = 20): PlacementInput['anchor'] => ({
    top,
    bottom: top + size,
    left,
    width: size
  })

  it('prefers above when it fits', () => {
    const r = placeInViewport({ anchor: anchorAt(400, 190), panel, viewport })
    expect(r.below).toBeFalse()
    expect(r.top).toBe(400 - 8 - 100)
    expect(r.maxHeight).toBeNull()
  })

  it('flips below when above cannot fit and below is roomier', () => {
    const r = placeInViewport({ anchor: anchorAt(40, 190), panel, viewport })
    expect(r.below).toBeTrue()
    expect(r.top).toBe(60 + 8)
  })

  it('stays above when neither side fits but above is roomier', () => {
    const r = placeInViewport({ anchor: anchorAt(700, 190), panel: { width: 200, height: 750 }, viewport })
    expect(r.below).toBeFalse()
  })

  it('honours a below preference and flips above only when below cannot fit', () => {
    expect(placeInViewport({ anchor: anchorAt(100, 190), panel, viewport, prefer: 'below' }).below).toBeTrue()
    expect(placeInViewport({ anchor: anchorAt(740, 190), panel, viewport, prefer: 'below' }).below).toBeFalse()
  })

  it('clamps to the left edge', () => {
    const r = placeInViewport({ anchor: anchorAt(400, 0), panel, viewport })
    expect(r.left).toBe(8)
  })

  it('clamps to the right edge', () => {
    const r = placeInViewport({ anchor: anchorAt(400, 380), panel, viewport })
    expect(r.left).toBe(400 - 8 - 200)
  })

  it('clamps to the top and bottom edges', () => {
    const top = placeInViewport({
      anchor: anchorAt(0, 190),
      panel: { width: 200, height: 100 },
      viewport: { width: 400, height: 120 }
    })
    expect(top.top).toBeGreaterThanOrEqual(8)
    expect(top.top + 80).toBeLessThanOrEqual(120 - 8 + 0.0001)
  })

  it('caps the height of a tall panel to the room it has', () => {
    const r = placeInViewport({ anchor: anchorAt(300, 190), panel: { width: 200, height: 2000 }, viewport })
    expect(r.maxHeight).not.toBeNull()
    expect(r.maxHeight as number).toBeLessThan(2000)
    expect(r.top).toBeGreaterThanOrEqual(8)
    expect(r.top + (r.maxHeight as number)).toBeLessThanOrEqual(800 - 8)
  })

  it('never squeezes below the minimum height', () => {
    const r = placeInViewport({
      anchor: anchorAt(30, 190),
      panel: { width: 200, height: 500 },
      viewport: { width: 400, height: 90 }
    })
    expect(r.maxHeight).toBe(80)
  })

  it('returns the anchor centre, and copes with a zero-size anchor', () => {
    expect(placeInViewport({ anchor: anchorAt(400, 100, 40), panel, viewport }).anchorCenterX).toBe(120)
    const zero = placeInViewport({ anchor: { top: 0, bottom: 0, left: 0, width: 0 }, panel, viewport })
    expect(zero.left).toBe(8)
    expect(zero.anchorCenterX).toBe(0)
    expect(Number.isFinite(zero.top)).toBeTrue()
  })
})
