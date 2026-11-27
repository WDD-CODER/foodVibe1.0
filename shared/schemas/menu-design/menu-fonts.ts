/** Plan 764 (C-TEMPLATE): the curated font list of menu designs. Every font draws Hebrew; all come from Google Fonts. */

export type MenuFontKind = 'serif' | 'sans' | 'display' | 'hand'

export interface MenuFont {
  id: string
  /** CSS font family name. */
  family: string
  /** The family as the Google Fonts CSS address writes it. */
  googleName: string
  kind: MenuFontKind
  /** Weights to load, ascending. */
  weights: readonly number[]
}

export const MENU_FONTS = [
  { id: 'heebo', family: 'Heebo', googleName: 'Heebo', kind: 'sans', weights: [300, 400, 700] },
  { id: 'rubik', family: 'Rubik', googleName: 'Rubik', kind: 'sans', weights: [300, 400, 700] },
  { id: 'assistant', family: 'Assistant', googleName: 'Assistant', kind: 'sans', weights: [300, 400, 700] },
  { id: 'alef', family: 'Alef', googleName: 'Alef', kind: 'sans', weights: [400, 700] },
  { id: 'varela-round', family: 'Varela Round', googleName: 'Varela+Round', kind: 'sans', weights: [400] },
  { id: 'frank-ruhl-libre', family: 'Frank Ruhl Libre', googleName: 'Frank+Ruhl+Libre', kind: 'serif', weights: [300, 400, 700] },
  { id: 'david-libre', family: 'David Libre', googleName: 'David+Libre', kind: 'serif', weights: [400, 700] },
  { id: 'noto-serif-hebrew', family: 'Noto Serif Hebrew', googleName: 'Noto+Serif+Hebrew', kind: 'serif', weights: [300, 400, 700] },
  { id: 'bellefair', family: 'Bellefair', googleName: 'Bellefair', kind: 'serif', weights: [400] },
  { id: 'secular-one', family: 'Secular One', googleName: 'Secular+One', kind: 'display', weights: [400] },
  { id: 'suez-one', family: 'Suez One', googleName: 'Suez+One', kind: 'display', weights: [400] },
  { id: 'karantina', family: 'Karantina', googleName: 'Karantina', kind: 'display', weights: [300, 400, 700] },
  { id: 'amatic-sc', family: 'Amatic SC', googleName: 'Amatic+SC', kind: 'hand', weights: [400, 700] },
  { id: 'miriam-libre', family: 'Miriam Libre', googleName: 'Miriam+Libre', kind: 'sans', weights: [400, 700] }
] as const satisfies readonly MenuFont[]

export type MenuFontId = (typeof MENU_FONTS)[number]['id']

export const MENU_FONT_IDS = MENU_FONTS.map(font => font.id) as [MenuFontId, ...MenuFontId[]]
