import { MENU_FONTS, MENU_FONT_IDS } from '@schemas/menu-design/menu-fonts'
import { menuFontFamily, menuFontsHref } from './menu-fonts-link.util'

describe('menuFontsHref', () => {
  it('builds one Google Fonts stylesheet address with each family and its weights', () => {
    expect(menuFontsHref(['heebo', 'varela-round'])).toBe(
      'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700&family=Varela+Round:wght@400&display=swap'
    )
  })

  it('loads every curated font in one address', () => {
    const url = new URL(menuFontsHref(MENU_FONT_IDS))
    expect(url.origin).toBe('https://fonts.googleapis.com')
    expect(url.searchParams.getAll('family').length).toBe(MENU_FONTS.length)
    for (const font of MENU_FONTS) expect(url.href).toContain(`family=${font.googleName}:wght@`)
  })

  it('names a repeated font once', () => {
    expect(menuFontsHref(['alef', 'alef']).match(/family=/g)?.length).toBe(1)
  })

  it('answers an empty string for no fonts', () => {
    expect(menuFontsHref([])).toBe('')
  })

  it('menuFontFamily quotes the family and adds a fallback of the same kind', () => {
    const david = MENU_FONTS.find((font) => font.id === 'david-libre')!
    expect(menuFontFamily(david)).toBe('"David Libre", serif')
  })
})
