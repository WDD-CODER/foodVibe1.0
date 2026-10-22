import { MenuPickerSearchService } from './menu-picker-search.service'

// Keyboard behavior is covered by shared/search-combobox/search-combobox.component.spec.ts.
describe('MenuPickerSearchService', () => {
  it('keeps the search text of each dish row apart', () => {
    const service = new MenuPickerSearchService()
    service.dish.setQuery('0-0', 'dish')
    expect(service.dish.query('0-0')).toBe('dish')
    expect(service.dish.query('0-1')).toBe('')
  })
})
