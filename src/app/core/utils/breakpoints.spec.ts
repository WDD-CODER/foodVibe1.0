import {
  DESKTOP_QUERY,
  PHONE_MAX,
  PHONE_NARROW_MAX,
  PHONE_NARROW_QUERY,
  PHONE_QUERY,
  TABLET_DOWN_QUERY,
  TABLET_MAX
} from './breakpoints'

/** A breakpoint from src/styles.scss, which the test build loads: it exposes its Sass names as `--bp-*` on :root. */
function stylesPx(name: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--bp-${name}`).trim()
  const match = /^(\d+)px$/.exec(raw)
  if (!match) throw new Error(`--bp-${name} is not set by src/styles.scss (got "${raw}")`)
  return Number(match[1])
}

describe('breakpoints (plan 656)', () => {
  it('holds the one set: phone 767, tablet 1023, desktop 1024', () => {
    expect(PHONE_MAX).toBe(767)
    expect(TABLET_MAX).toBe(1023)
    expect(window.matchMedia(DESKTOP_QUERY).media).toContain('1024px')
  })

  it('equals the values read from src/styles.scss', () => {
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

  it('holds the narrow phone step, equal to src/styles.scss (plan 763)', () => {
    const narrowMax = stylesPx('phone-narrow-max')
    expect(narrowMax).toBe(419)
    expect(PHONE_NARROW_MAX).toBe(narrowMax)
    expect(PHONE_NARROW_QUERY).toBe(`(max-width: ${narrowMax}px)`)
  })
})
