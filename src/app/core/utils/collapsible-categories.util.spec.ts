import { TestBed } from '@angular/core/testing'
import { COLLAPSIBLE_MOBILE_QUERY, CollapsibleCategories, useCollapsibleCategories } from './collapsible-categories.util'

type ChangeListener = (e: MediaQueryListEvent) => void

function mockMatchMedia(matches: boolean): { fire: (m: boolean) => void } {
  const listeners: ChangeListener[] = []
  const mql = {
    matches,
    media: COLLAPSIBLE_MOBILE_QUERY,
    addEventListener: (_: string, l: ChangeListener) => listeners.push(l),
    removeEventListener: () => undefined
  } as unknown as MediaQueryList
  spyOn(window, 'matchMedia').and.returnValue(mql)
  return { fire: (m: boolean) => listeners.forEach((l) => l({ matches: m } as MediaQueryListEvent)) }
}

function create(opts?: { desktopCollapsed?: string[] }): CollapsibleCategories {
  return TestBed.runInInjectionContext(() => useCollapsibleCategories(opts))
}

describe('useCollapsibleCategories', () => {
  it('starts every category collapsed on mobile', () => {
    mockMatchMedia(true)
    const c = create({ desktopCollapsed: ['Date'] })
    expect(c.isExpanded('Category')).toBeFalse()
    expect(c.isExpanded('Date')).toBeFalse()
  })

  it('toggles a category on mobile', () => {
    mockMatchMedia(true)
    const c = create()
    c.toggle('Category')
    expect(c.isExpanded('Category')).toBeTrue()
    c.toggle('Category')
    expect(c.isExpanded('Category')).toBeFalse()
  })

  it('seeds desktop from desktopCollapsed; others start expanded', () => {
    mockMatchMedia(false)
    const c = create({ desktopCollapsed: ['Date'] })
    expect(c.isExpanded('Date')).toBeFalse()
    expect(c.isExpanded('Category')).toBeTrue()
    c.toggle('Category')
    expect(c.isExpanded('Category')).toBeFalse()
  })

  it('expands a category with an active selection (mobile and desktop)', () => {
    const mm = mockMatchMedia(true)
    const c = create({ desktopCollapsed: ['Date'] })
    c.expandIfActive('Date', false)
    expect(c.isExpanded('Date')).toBeFalse()
    c.expandIfActive('Date', true)
    expect(c.isExpanded('Date')).toBeTrue()
    mm.fire(false)
    expect(c.isExpanded('Date')).toBeTrue()
  })

  it('follows the viewport across the breakpoint', () => {
    const mm = mockMatchMedia(false)
    const c = create()
    expect(c.isExpanded('Category')).toBeTrue()
    mm.fire(true)
    expect(c.isExpanded('Category')).toBeFalse()
    mm.fire(false)
    expect(c.isExpanded('Category')).toBeTrue()
  })
})
