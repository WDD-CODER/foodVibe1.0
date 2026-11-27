/**
 * Plan 764 (C-TEMPLATE): the built-in page textures, drawn in code (CSS gradients and inline SVG noise): no image files.
 * Each texture is a list of see-through CSS `background` layers; the design's page color stays under them.
 */

export interface MenuTexture {
  id: string
  /** Comma-separated layers of the CSS `background` shorthand, without a color. */
  layers: string
}

/** Grey grain from an inline SVG turbulence filter, as one repeating background layer. */
function noise(frequency: number, opacity: number): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='3' stitchTiles='stitch'/>` +
    `<feColorMatrix type='saturate' values='0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(#n)' opacity='${opacity}'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") repeat`
}

export const MENU_TEXTURES = [
  { id: 'paper', layers: noise(0.8, 0.12) },
  {
    id: 'linen',
    layers:
      'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.04) 0 1px, transparent 1px 3px), ' +
      'repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.04) 0 1px, transparent 1px 3px)'
  },
  { id: 'kraft', layers: `${noise(0.65, 0.22)}, linear-gradient(rgba(150, 100, 50, 0.16), rgba(150, 100, 50, 0.16))` },
  { id: 'slate', layers: `${noise(0.35, 0.14)}, linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.16))` },
  {
    id: 'marble',
    layers:
      'linear-gradient(115deg, transparent 42%, rgba(110, 110, 120, 0.12) 43%, transparent 46%), ' +
      'linear-gradient(64deg, transparent 63%, rgba(110, 110, 120, 0.09) 64%, transparent 69%), ' +
      'linear-gradient(160deg, rgba(255, 255, 255, 0.35), rgba(120, 120, 130, 0.08), rgba(255, 255, 255, 0.25))'
  },
  { id: 'dots', layers: 'radial-gradient(rgba(0, 0, 0, 0.12) 1px, transparent 1.5px) 0 0 / 14px 14px repeat' }
] as const satisfies readonly MenuTexture[]

export type MenuTextureId = (typeof MENU_TEXTURES)[number]['id']

export const MENU_TEXTURE_IDS = MENU_TEXTURES.map(texture => texture.id) as [MenuTextureId, ...MenuTextureId[]]
