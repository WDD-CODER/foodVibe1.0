import { MenuPickerSearchService } from './menu-picker-search.service'

// Keyboard behavior is covered by core/utils/keyed-picker-search.util.spec.ts.
describe('MenuPickerSearchService', () => {
  it('keeps dish, section and event-type state apart', () => {
    const service = new MenuPickerSearchService()
    service.dish.setQuery(0, 'dish')
    service.eventType.setHighlighted(0, 3)
    expect(service.section.query(0)).toBe('')
    expect(service.dish.highlighted(0)).toBe(0)
    expect(service.eventType.highlighted(0)).toBe(3)
  })
})
