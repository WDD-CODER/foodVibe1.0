import { FormatQuantityPipe } from './format-quantity.pipe'

describe('FormatQuantityPipe', () => {
  let pipe: FormatQuantityPipe

  beforeEach(() => {
    pipe = new FormatQuantityPipe()
  })

  it('returns empty string for null', () => {
    expect(pipe.transform(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('')
  })

  it('returns empty string for NaN', () => {
    expect(pipe.transform(NaN)).toBe('')
  })

  it('renders 0.5 as ½', () => {
    expect(pipe.transform(0.5)).toBe('½')
  })

  it('renders 0.25 as ¼', () => {
    expect(pipe.transform(0.25)).toBe('¼')
  })

  it('renders 0.75 as ¾', () => {
    expect(pipe.transform(0.75)).toBe('¾')
  })

  it('renders 0.333 as ⅓ (within tolerance)', () => {
    expect(pipe.transform(0.333)).toBe('⅓')
  })

  it('renders 1/3 exactly as ⅓', () => {
    expect(pipe.transform(1 / 3)).toBe('⅓')
  })

  it('renders 0.667 as ⅔ (within tolerance)', () => {
    expect(pipe.transform(0.667)).toBe('⅔')
  })

  it('renders 2/3 exactly as ⅔', () => {
    expect(pipe.transform(2 / 3)).toBe('⅔')
  })

  it('renders 1.5 as "1 ½"', () => {
    expect(pipe.transform(1.5)).toBe('1 ½')
  })

  it('renders 10.75 as "10 ¾"', () => {
    expect(pipe.transform(10.75)).toBe('10 ¾')
  })

  it('renders 2.333 as "2 ⅓"', () => {
    expect(pipe.transform(2.333)).toBe('2 ⅓')
  })

  it('renders integer 1.0 without decimals', () => {
    expect(pipe.transform(1.0)).toBe('1')
  })

  it('renders integer 2 without decimals', () => {
    expect(pipe.transform(2)).toBe('2')
  })

  it('renders 0.1 as decimal fallback (not a known fraction)', () => {
    const result = pipe.transform(0.1)
    expect(result).not.toBe('¼')
    expect(result).not.toBe('½')
    expect(result.length).toBeGreaterThan(0)
  })

  it('renders 1.1 as decimal fallback', () => {
    const result = pipe.transform(1.1)
    expect(result).not.toContain('½')
    expect(result).not.toContain('¼')
  })
})
