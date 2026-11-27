/** Plan 765: the Google Fonts address that loads the curated menu fonts, so the app itself can show each font. */
import { MENU_FONTS, type MenuFont, type MenuFontId } from '@schemas/menu-design/menu-fonts'

const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com/css2'

const FALLBACK: Record<MenuFont['kind'], string> = {
  serif: 'serif',
  sans: 'sans-serif',
  display: 'sans-serif',
  hand: 'cursive'
}

/** One stylesheet address for the given fonts, each once; `''` when there is none to load. */
export function menuFontsHref(ids: readonly MenuFontId[]): string {
  const families = [...new Set(ids)].flatMap((id) => {
    const font = MENU_FONTS.find((entry) => entry.id === id)
    return font ? [`family=${font.googleName}:wght@${font.weights.join(';')}`] : []
  })
  return families.length ? `${GOOGLE_FONTS_CSS}?${families.join('&')}&display=swap` : ''
}

/** The CSS `font-family` value that draws a text in one curated font. */
export function menuFontFamily(font: MenuFont): string {
  return `"${font.family}", ${FALLBACK[font.kind]}`
}
