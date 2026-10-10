import { KeyedPickerSearch, MenuPickerSearchService, PickerKeydownOptions } from './menu-picker-search.service'

function key(k: string, extra: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: k, cancelable: true, ...extra })
}

describe('KeyedPickerSearch', () => {
  let search: KeyedPickerSearch
  let opts: PickerKeydownOptions & {
    onSelect: jasmine.Spy
    onClose: jasmine.Spy
    onHighlightMove: jasmine.Spy
  }

  beforeEach(() => {
    search = new KeyedPickerSearch()
    opts = {
      optionCount: 3,
      onSelect: jasmine.createSpy('onSelect'),
      onClose: jasmine.createSpy('onClose'),
      onHighlightMove: jasmine.createSpy('onHighlightMove')
    }
  })

  it('defaults to an empty query and highlight 0', () => {
    expect(search.query('0-0')).toBe('')
    expect(search.highlighted('0-0')).toBe(0)
  })

  it('clamps the highlight at both ends (no wrap)', () => {
    search.handleKeydown(0, key('ArrowUp'), opts)
    expect(search.highlighted(0)).toBe(0)
    for (let i = 0; i < 5; i++) search.handleKeydown(0, key('ArrowDown'), opts)
    expect(search.highlighted(0)).toBe(2)
    expect(opts.onHighlightMove).toHaveBeenCalledTimes(6)
  })

  it('keeps the highlight at 0 when there are no options', () => {
    search.handleKeydown(0, key('ArrowDown'), { ...opts, optionCount: 0 })
    expect(search.highlighted(0)).toBe(0)
  })

  it('Enter selects the highlighted option and prevents default', () => {
    search.handleKeydown(0, key('ArrowDown'), opts)
    const e = key('Enter')
    search.handleKeydown(0, e, opts)
    expect(opts.onSelect).toHaveBeenCalledOnceWith(1)
    expect(e.defaultPrevented).toBeTrue()
  })

  it('Enter with no options does nothing and leaves the key alone', () => {
    const e = key('Enter')
    search.handleKeydown(0, e, { ...opts, optionCount: 0 })
    expect(opts.onSelect).not.toHaveBeenCalled()
    expect(e.defaultPrevented).toBeFalse()
  })

  it('Enter clamps a stale highlight to the last option', () => {
    search.setHighlighted(0, 9)
    search.handleKeydown(0, key('Enter'), opts)
    expect(opts.onSelect).toHaveBeenCalledOnceWith(2)
  })

  it('Space selects only when selectOnSpace is set', () => {
    search.handleKeydown(0, key(' '), opts)
    expect(opts.onSelect).not.toHaveBeenCalled()
    search.handleKeydown(0, key(' '), { ...opts, selectOnSpace: true })
    expect(opts.onSelect).toHaveBeenCalledOnceWith(0)
  })

  it('Escape calls onClose', () => {
    const e = key('Escape')
    search.handleKeydown(0, e, opts)
    expect(opts.onClose).toHaveBeenCalledTimes(1)
    expect(e.defaultPrevented).toBeTrue()
  })

  it('Tab is handed to onTab with default prevented, and ignored without onTab', () => {
    const plain = key('Tab')
    search.handleKeydown(0, plain, opts)
    expect(plain.defaultPrevented).toBeFalse()

    const onTab = jasmine.createSpy('onTab')
    const shifted = key('Tab', { shiftKey: true })
    search.handleKeydown(0, shifted, { ...opts, onTab })
    expect(onTab).toHaveBeenCalledOnceWith(shifted)
    expect(shifted.defaultPrevented).toBeTrue()
  })

  it('typing resets the highlight to 0', () => {
    search.setHighlighted('1-2', 2)
    search.onQueryChange('1-2', 'סל')
    expect(search.query('1-2')).toBe('סל')
    expect(search.highlighted('1-2')).toBe(0)
  })

  it('keeps keys independent (no cross-talk between sections)', () => {
    search.onQueryChange('0-0', 'a')
    search.handleKeydown('0-0', key('ArrowDown'), opts)
    expect(search.query('1-0')).toBe('')
    expect(search.highlighted('1-0')).toBe(0)
    expect(search.highlighted('0-0')).toBe(1)
  })
})

describe('MenuPickerSearchService', () => {
  it('keeps dish and section state apart', () => {
    const service = new MenuPickerSearchService()
    service.dish.setQuery(0, 'dish')
    expect(service.section.query(0)).toBe('')
  })
})
