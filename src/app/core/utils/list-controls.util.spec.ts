import { signal } from '@angular/core'
import { matchesSearch, useListControls } from './list-controls.util'

type Field = 'name' | 'date'

function setup(withSort = true) {
  const search = signal('')
  const sortBy = signal<Field | null>(null)
  const sortOrder = signal<'asc' | 'desc'>('asc')
  const controls = useListControls<Field>(withSort ? { search, sortBy, sortOrder } : { search })
  return { search, sortBy, sortOrder, controls }
}

describe('useListControls', () => {
  it('setSort starts a new column ascending', () => {
    const { sortBy, sortOrder, controls } = setup()
    sortOrder.set('desc')
    controls.setSort('name')
    expect(sortBy()).toBe('name')
    expect(sortOrder()).toBe('asc')
  })

  it('setSort on the active column toggles the order, and a new column resets it', () => {
    const { sortBy, sortOrder, controls } = setup()
    controls.setSort('name')
    controls.setSort('name')
    expect(sortOrder()).toBe('desc')
    controls.setSort('name')
    expect(sortOrder()).toBe('asc')
    controls.setSort('name')
    controls.setSort('date')
    expect(sortBy()).toBe('date')
    expect(sortOrder()).toBe('asc')
  })

  it('setSort does nothing for a page without sort signals', () => {
    const { controls } = setup(false)
    expect(() => controls.setSort('name')).not.toThrow()
  })

  it('onClearSearch empties the query and keeps focus in the field', () => {
    const { search, controls } = setup()
    search.set('abc')
    const input = document.createElement('input')
    const focus = spyOn(input, 'focus')
    controls.onClearSearch(input)
    expect(search()).toBe('')
    expect(focus).toHaveBeenCalled()
  })

  it('onSearchEscape clears a non-empty search and stops the event', () => {
    const { search, controls } = setup()
    search.set('abc')
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    const stop = spyOn(event, 'stopPropagation')
    controls.onSearchEscape(event, document.createElement('input'))
    expect(search()).toBe('')
    expect(event.defaultPrevented).toBeTrue()
    expect(stop).toHaveBeenCalled()
  })

  it('onSearchEscape leaves an empty search and the event alone', () => {
    const { controls } = setup()
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    const input = document.createElement('input')
    const focus = spyOn(input, 'focus')
    controls.onSearchEscape(event, input)
    expect(event.defaultPrevented).toBeFalse()
    expect(focus).not.toHaveBeenCalled()
  })

  it('clearAll runs every resetter', () => {
    const { controls } = setup()
    const a = jasmine.createSpy('a')
    const b = jasmine.createSpy('b')
    controls.clearAll(a, b)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })
})

describe('matchesSearch', () => {
  it('matches everything on an empty or blank query', () => {
    expect(matchesSearch('', 'abc')).toBeTrue()
    expect(matchesSearch('   ', undefined)).toBeTrue()
  })

  it('is case-insensitive and checks every text', () => {
    expect(matchesSearch('SAL', 'x', 'Salt')).toBeTrue()
    expect(matchesSearch('zzz', 'x', 'Salt')).toBeFalse()
  })

  it('ignores niqqud on either side', () => {
    expect(matchesSearch('שלום', 'שָׁלוֹם')).toBeTrue()
    expect(matchesSearch('שָׁלוֹם', 'שלום עולם')).toBeTrue()
  })

  it('ignores punctuation and null texts', () => {
    expect(matchesSearch('בר-ביקיו', 'בר ביקיו', null)).toBeTrue()
    expect(matchesSearch('a', null, undefined)).toBeFalse()
  })
})
