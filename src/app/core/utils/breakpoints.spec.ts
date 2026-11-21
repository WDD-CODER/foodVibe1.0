import { DESKTOP_QUERY, PHONE_MAX, PHONE_QUERY, TABLET_DOWN_QUERY, TABLET_MAX } from './breakpoints'

/** A breakpoint value from src/styles.scss (it exposes the Sass names as `--bp-*` on :root). */
function stylesPx(name: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--bp-${name}`).trim()
  const m = /^(\d+)px$/.exec(raw)
  if (!m) throw new Error(`--bp-${name} not found in src/styles.scss (got "${raw}")`)
  return Number(m[1])
}

describe('breakpoints', () => {
  it('the constants and queries equal the values read from src/styles.scss', () => {
    const phoneMax = stylesPx('phone-max')
    const tabletMin = stylesPx('tablet-min')
    const tabletMax = stylesPx('tablet-max')
    const desktopMin = stylesPx('desktop-min')
    expect(PHONE_MAX).toBe(phoneMax)
    expect(TABLET_MAX).toBe(tabletMax)
    expect(tabletMin).toBe(phoneMax + 1)
    expect(desktopMin).toBe(tabletMax + 1)
    expect(PHONE_QUERY).toBe(`(max-width: ${phoneMax}px)`)
    expect(TABLET_DOWN_QUERY).toBe(`(max-width: ${tabletMax}px)`)
    expect(DESKTOP_QUERY).toBe(`(min-width: ${desktopMin}px)`)
  })
})
