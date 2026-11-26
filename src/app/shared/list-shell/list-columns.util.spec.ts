import { ListColumn, fitColumns } from './list-columns.util'

const COLS: ListColumn[] = [
  { id: 'name', track: '2fr', min: '12rem', phoneMin: '8rem', stay: true },
  { id: 'a', track: '1fr', min: '7rem', fall: 4 },
  { id: 'b', track: '1fr', min: '7rem', fall: 3 },
  { id: 'c', track: '1fr', min: '8rem', fall: 2 },
  { id: 'd', track: 'minmax(48px, 0.8fr)', min: '4rem', fall: 1 },
  { id: 'price', track: '0.8fr', min: '5.5rem', phoneTrack: '4.75rem', phoneMin: '4.75rem' },
  { id: 'actions', track: '80px', min: '80px', phoneTrack: '40px', phoneMin: '40px', stay: true },
  { id: 'select', track: 'auto', min: '1.75rem', phoneTrack: '28px', phoneMin: '28px', hideOnTouchPhone: true }
]

const base = { rem: 16, gap: 0, phone: false, touchPhone: false }
// 12+7+7+8+4+5.5 rem = 43.5rem = 696px, + 80 + 28 = 804
const FULL = 804

describe('fitColumns (plans 745, 747)', () => {
  it('everything fits → nothing collapsed, each fr track is floored by its min', () => {
    const r = fitColumns(COLS, { ...base, available: FULL })
    expect(r.collapsed).toEqual([])
    expect(r.dropped).toEqual([])
    expect(r.template).toBe(
      'minmax(12rem, 2fr) minmax(7rem, 1fr) minmax(7rem, 1fr) minmax(8rem, 1fr) minmax(48px, 0.8fr) minmax(5.5rem, 0.8fr) 80px auto'
    )
  })

  it('a little too narrow → the two lowest fall values collapse together', () => {
    const r = fitColumns(COLS, { ...base, available: FULL - 1 })
    expect(r.collapsed).toEqual(['d', 'c'])
  })

  it('narrower → a third falls', () => {
    // need after d,c: 804 - 64 - 128 + 112 = 724
    expect(fitColumns(COLS, { ...base, available: 724 }).collapsed).toEqual(['d', 'c'])
    expect(fitColumns(COLS, { ...base, available: 723 }).collapsed).toEqual(['d', 'c', 'b'])
  })

  it('very narrow → ranked ones, then un-ranked from the end; the checkbox is dropped; stay columns kept', () => {
    const r = fitColumns(COLS, { ...base, available: 10 })
    expect(r.collapsed).toEqual(['d', 'c', 'b', 'a', 'price'])
    expect(r.dropped).toEqual(['select'])
    expect(r.template).toBe('minmax(12rem, 2fr) minmax(7rem, 1.6fr) 80px')
  })

  it('dropping the checkbox is a step of its own: the next column stays when that alone makes room', () => {
    // after d, c, b, a: name 192 + switching 112 + price 88 + actions 80 + select 28 = 500
    const r = fitColumns(COLS, { ...base, available: 499 })
    expect(r.dropped).toEqual(['select'])
    expect(r.collapsed).toEqual(['d', 'c', 'b', 'a'])
    expect(fitColumns(COLS, { ...base, available: 471 }).collapsed).toEqual(['d', 'c', 'b', 'a', 'price'])
  })

  it('a stay column is never collapsed, however narrow', () => {
    const r = fitColumns(COLS, { ...base, available: 1 })
    expect(r.collapsed).not.toContain('name')
    expect(r.collapsed).not.toContain('actions')
  })

  it('un-ranked columns collapse after ranked ones, from the end of the list', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: '1fr', min: '10rem', stay: true },
      { id: 'u1', track: '1fr', min: '5rem' },
      { id: 'r', track: '1fr', min: '5rem', fall: 1 },
      { id: 'u2', track: '1fr', min: '5rem' },
      { id: 'act', track: '40px', min: '40px', stay: true }
    ]
    expect(fitColumns(cols, { ...base, available: 10 }).collapsed).toEqual(['r', 'u2', 'u1'])
    // one short of everything: the ranked one and the last un-ranked one start the carousel
    expect(fitColumns(cols, { ...base, available: 399 }).collapsed).toEqual(['r', 'u2'])
  })

  it('phone: a product-like list keeps the name, one switching track and the actions only', () => {
    const r = fitColumns(COLS, { ...base, phone: true, available: 375 - 32 })
    expect(r.collapsed).toEqual(['d', 'c', 'b', 'a', 'price'])
    expect(r.template).toBe('minmax(8rem, 2fr) minmax(7rem, 1.6fr) 40px')
  })

  it('phone width alone never collapses: a list whose columns all fit keeps every column', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: '1fr', min: '6rem', stay: true },
      { id: 'x', track: '1fr', min: '3rem', fall: 1 },
      { id: 'y', track: '1fr', min: '3rem', fall: 2 },
      { id: 'act', track: '40px', min: '40px', stay: true }
    ]
    const r = fitColumns(cols, { ...base, phone: true, available: 343 })
    expect(r.collapsed).toEqual([])
    expect(r.template).toBe('minmax(6rem, 1fr) minmax(3rem, 1fr) minmax(3rem, 1fr) 40px')
  })

  it('ties fall from the end', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: '1fr', min: '10rem', stay: true },
      { id: 'x', track: '1fr', min: '5rem', fall: 1 },
      { id: 'y', track: '1fr', min: '5rem', fall: 1 },
      { id: 'z', track: '1fr', min: '5rem', fall: 1 }
    ]
    expect(fitColumns(cols, { ...base, available: 10 }).collapsed).toEqual(['z', 'y', 'x'])
  })

  it('one collapsible column never collapses', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: '1fr', min: '10rem', stay: true },
      { id: 'x', track: '1fr', min: '5rem', fall: 1 }
    ]
    const r = fitColumns(cols, { ...base, available: 10 })
    expect(r.collapsed).toEqual([])
    expect(r.template).toBe('minmax(10rem, 1fr) minmax(5rem, 1fr)')
  })

  it('reads px and rem mins', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: '1fr', min: '100px', stay: true },
      { id: 'x', track: '1fr', min: '5rem', fall: 1 },
      { id: 'y', track: '1fr', min: '80px', fall: 2 }
    ]
    expect(fitColumns(cols, { ...base, available: 260 }).collapsed).toEqual([])
    expect(fitColumns(cols, { ...base, available: 259 }).collapsed.length).toBe(2)
  })

  it('counts the gap between shown columns', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: '1fr', min: '100px', stay: true },
      { id: 'x', track: '1fr', min: '100px', fall: 1 },
      { id: 'y', track: '1fr', min: '100px', fall: 2 }
    ]
    expect(fitColumns(cols, { ...base, gap: 10, available: 320 }).collapsed).toEqual([])
    expect(fitColumns(cols, { ...base, gap: 10, available: 319 }).collapsed).toEqual(['x', 'y'])
  })

  it('a track is never narrower than its min: a fr track becomes minmax(min, fr); fixed and auto are left', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: '2fr', min: '12rem', stay: true },
      { id: 'r', track: '1fr', min: '8.5rem' },
      { id: 'fixed', track: '80px', min: '80px', stay: true },
      { id: 'auto', track: 'auto', min: '2rem', stay: true }
    ]
    expect(fitColumns(cols, { ...base, available: 5000 }).template).toBe(
      'minmax(12rem, 2fr) minmax(8.5rem, 1fr) 80px auto'
    )
  })

  it('phone uses the phone tracks and mins', () => {
    const r = fitColumns(COLS, { ...base, phone: true, available: 1000 })
    expect(r.template).toBe(
      'minmax(8rem, 2fr) minmax(7rem, 1fr) minmax(7rem, 1fr) minmax(8rem, 1fr) minmax(48px, 0.8fr) 4.75rem 40px 28px'
    )
  })

  it('touchPhone drops the checkbox column', () => {
    const r = fitColumns(COLS, { ...base, phone: true, touchPhone: true, available: 1000 })
    expect(r.template).toBe(
      'minmax(8rem, 2fr) minmax(7rem, 1fr) minmax(7rem, 1fr) minmax(8rem, 1fr) minmax(48px, 0.8fr) 4.75rem 40px'
    )
  })

  it('the carousel track sits where the first collapsed column was', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: 'N', min: '10rem', stay: true },
      { id: 'x', track: 'X', min: '5rem', fall: 1 },
      { id: 'k', track: 'K', min: '5rem', stay: true },
      { id: 'y', track: 'Y', min: '5rem', fall: 2 },
      { id: 'z', track: 'Z', min: '5rem', fall: 3 }
    ]
    const r = fitColumns(cols, { ...base, available: 10, carouselTrack: 'C' })
    expect(r.collapsed).toEqual(['x', 'y', 'z'])
    expect(r.template).toBe('N C K')
  })

  it('widening by one pixel past a threshold brings a column back', () => {
    expect(fitColumns(COLS, { ...base, available: 723 }).collapsed.length).toBe(3)
    expect(fitColumns(COLS, { ...base, available: 724 }).collapsed.length).toBe(2)
  })
})
