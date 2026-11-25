import { ListColumn, fitColumns } from './list-columns.util'

const COLS: ListColumn[] = [
  { id: 'name', track: '2fr', min: '12rem', phoneMin: '8rem' },
  { id: 'a', track: '1fr', min: '7rem', fall: 4 },
  { id: 'b', track: '1fr', min: '7rem', fall: 3 },
  { id: 'c', track: '1fr', min: '8rem', fall: 2 },
  { id: 'd', track: 'minmax(48px, 0.8fr)', min: '4rem', fall: 1 },
  { id: 'price', track: '0.8fr', min: '5.5rem', phoneTrack: '4.75rem', phoneMin: '4.75rem' },
  { id: 'actions', track: '80px', min: '80px', phoneTrack: '40px', phoneMin: '40px' },
  { id: 'select', track: 'auto', min: '1.75rem', phoneTrack: '28px', phoneMin: '28px', hideOnTouchPhone: true }
]

const base = { rem: 16, gap: 0, phone: false, touchPhone: false }
// 12+7+7+8+4+5.5 rem = 43.5rem = 696px, + 80 + 28 = 804
const FULL = 804

describe('fitColumns (plan 745)', () => {
  it('everything fits → nothing collapsed, template is all tracks', () => {
    const r = fitColumns(COLS, { ...base, available: FULL })
    expect(r.collapsed).toEqual([])
    expect(r.template).toBe('2fr 1fr 1fr 1fr minmax(48px, 0.8fr) 0.8fr 80px auto')
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

  it('very narrow → every fallable collapsed, fixed columns kept', () => {
    const r = fitColumns(COLS, { ...base, available: 10 })
    expect(r.collapsed).toEqual(['d', 'c', 'b', 'a'])
    expect(r.template).toBe('2fr minmax(7rem, 1.6fr) 0.8fr 80px auto')
  })

  it('ties fall from the end', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: '1fr', min: '10rem' },
      { id: 'x', track: '1fr', min: '5rem', fall: 1 },
      { id: 'y', track: '1fr', min: '5rem', fall: 1 },
      { id: 'z', track: '1fr', min: '5rem', fall: 1 }
    ]
    expect(fitColumns(cols, { ...base, available: 10 }).collapsed).toEqual(['z', 'y', 'x'])
  })

  it('one fallable column never collapses', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: '1fr', min: '10rem' },
      { id: 'x', track: '1fr', min: '5rem', fall: 1 }
    ]
    const r = fitColumns(cols, { ...base, available: 10 })
    expect(r.collapsed).toEqual([])
    expect(r.template).toBe('1fr 1fr')
  })

  it('reads px and rem mins', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: '1fr', min: '100px' },
      { id: 'x', track: '1fr', min: '5rem', fall: 1 },
      { id: 'y', track: '1fr', min: '80px', fall: 2 }
    ]
    expect(fitColumns(cols, { ...base, available: 260 }).collapsed).toEqual([])
    expect(fitColumns(cols, { ...base, available: 259 }).collapsed.length).toBe(2)
  })

  it('counts the gap between shown columns', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: '1fr', min: '100px' },
      { id: 'x', track: '1fr', min: '100px', fall: 1 },
      { id: 'y', track: '1fr', min: '100px', fall: 2 }
    ]
    expect(fitColumns(cols, { ...base, gap: 10, available: 320 }).collapsed).toEqual([])
    expect(fitColumns(cols, { ...base, gap: 10, available: 319 }).collapsed).toEqual(['x', 'y'])
  })

  it('phone uses the phone tracks', () => {
    const r = fitColumns(COLS, { ...base, phone: true, available: 10 })
    expect(r.template).toBe('2fr minmax(7rem, 1.6fr) 4.75rem 40px 28px')
  })

  it('touchPhone drops the checkbox column', () => {
    const r = fitColumns(COLS, { ...base, phone: true, touchPhone: true, available: 1000 })
    expect(r.template).toBe('2fr 1fr 1fr 1fr minmax(48px, 0.8fr) 4.75rem 40px')
  })

  it('the carousel track sits where the first collapsed column was', () => {
    const cols: ListColumn[] = [
      { id: 'n', track: 'N', min: '10rem' },
      { id: 'x', track: 'X', min: '5rem', fall: 1 },
      { id: 'k', track: 'K', min: '5rem' },
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
