/**
 * Plan 764 (C-TEMPLATE, ADR 0034): the one menu template. A pure design + menu doc -> one standalone HTML document the
 * browser previews and the server prints. Its output goes into a headless browser, so every text is escaped, there is
 * no script, images come only from Cloudinary and every design value is checked again here before it reaches the CSS.
 */
import type { MenuDesignDraft } from '../entities/menu-design.schema'
import { baseDesign } from './menu-base-templates'
import type { MenuDoc, MenuDocSection } from './menu-doc'
import { MENU_FONTS, type MenuFont, type MenuFontKind } from './menu-fonts'
import { MENU_TEXTURES } from './menu-textures'

export interface MenuRenderOptions {
  /** Print the "Powered by FoodVibe" line (D15). */
  poweredBy: boolean
  /** `link`: the document loads its fonts from Google Fonts. `embedded`: no font link, the renderer supplies them. */
  fonts: 'link' | 'embedded'
}

const IMAGE_PREFIX = 'https://res.cloudinary.com/'
const HEX = /^#[0-9a-f]{6}$/i

const FALLBACK_STACK: Record<MenuFontKind, string> = { serif: 'serif', sans: 'sans-serif', display: 'sans-serif', hand: 'cursive' }
const TITLE_SIZE = { s: '24pt', m: '30pt', l: '38pt' }
const SECTION_SIZE = { s: '14pt', m: '17pt', l: '21pt' }
const DISH_SIZE = { s: '11pt', m: '13pt', l: '15pt' }
const GAP = { compact: '3mm', normal: '5mm', airy: '6.5mm' }
const FRAME_INSET_MM = { narrow: 6, normal: 10, wide: 15 }
const FRAME_STYLES = ['none', 'line', 'double', 'rounded', 'ornament']
const DIVIDERS = ['line', 'dots', 'ornament']
const LOGO_SIZES = ['s', 'm', 'l']
/** Space between the frame and the words. */
const CONTENT_PADDING_MM = 8

function pick<T>(table: Record<string, T>, key: string, fallback: T): T {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : fallback
}

function fontOf(id: string): MenuFont {
  return MENU_FONTS.find(font => font.id === id) ?? MENU_FONTS[0]
}

function fontStack(id: string): string {
  const font = fontOf(id)
  return `"${font.family}", ${FALLBACK_STACK[font.kind]}`
}

/** The address when it is a Cloudinary one, with every character that could leave a CSS or HTML string encoded. */
function safeImageUrl(url: string | undefined): string | null {
  if (typeof url !== 'string' || !url.startsWith(IMAGE_PREFIX)) return null
  return url.replace(/["'()<>\\\s\u0000-\u001f\u007f]/g, char => {
    const code = char.charCodeAt(0)
    return code < 128 ? `%${code.toString(16).padStart(2, '0').toUpperCase()}` : encodeURIComponent(char)
  })
}

function rgba(hex: string, alpha: number): string {
  const [red, green, blue] = [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16))
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

/** The CSS `background` value of the page: the layers on top, the page color last. */
function pageBackground(background: MenuDesignDraft['background'], page: string): string {
  if (background.kind === 'texture') {
    const texture = MENU_TEXTURES.find(entry => entry.id === background.textureId)
    return texture ? `${texture.layers}, ${page}` : page
  }
  const url = background.kind === 'image' ? safeImageUrl(background.imageUrl) : null
  if (!url) return page
  const layers: string[] = []
  const veil = Math.min(Math.max(Number(background.veil) || 0, 0), 0.8)
  if (veil > 0) layers.push(`linear-gradient(${rgba(page, veil)}, ${rgba(page, veil)})`)
  layers.push(background.imageFit === 'tile' ? `url("${url}") repeat` : `url("${url}") center / cover no-repeat`)
  return [...layers, page].join(', ')
}

/** The design as CSS custom properties: the designer, the editor's paper sheet and the document read the same ones. */
export function designCssVars(design: MenuDesignDraft): Record<string, string> {
  const fallback = baseDesign('classic').colors
  const color = (key: keyof MenuDesignDraft['colors']): string =>
    HEX.test(design.colors[key]) ? design.colors[key] : fallback[key]
  const page = color('page')
  const width = Math.min(Math.max(Math.round(Number(design.frame.width) || 0), 0), 6)
  return {
    '--md-page': page,
    '--md-text': color('text'),
    '--md-title': color('title'),
    '--md-section': color('section'),
    '--md-accent': color('accent'),
    '--md-border': color('border'),
    '--md-font-title': fontStack(design.fonts.title),
    '--md-font-section': fontStack(design.fonts.section),
    '--md-font-dish': fontStack(design.fonts.dish),
    '--md-title-size': pick(TITLE_SIZE, design.layout.titleSize, TITLE_SIZE.m),
    '--md-section-size': pick(SECTION_SIZE, design.layout.sectionSize, SECTION_SIZE.m),
    '--md-dish-size': pick(DISH_SIZE, design.layout.dishSize, DISH_SIZE.m),
    '--md-gap': pick(GAP, design.layout.density, GAP.normal),
    '--md-frame-width': `${width}px`,
    '--md-bg': pageBackground(design.background, page)
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** One text of the menu in its element; the span lets each line find its own direction (D17). No text, no element. */
function textElement(tag: string, className: string, text: string | undefined): string {
  return text ? `<${tag} class="${className}"><span dir="auto">${escapeHtml(text)}</span></${tag}>` : ''
}

function fontLink(design: MenuDesignDraft): string {
  const fonts = [...new Set([design.fonts.title, design.fonts.section, design.fonts.dish].map(fontOf))]
  const families = fonts.map(font => `family=${font.googleName}:wght@${font.weights.join(';')}`).join('&amp;')
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families}&amp;display=swap">`
}

function styles(design: MenuDesignDraft): string {
  const vars = Object.entries(designCssVars(design)).map(([name, value]) => `${name}: ${value};`).join('\n  ')
  const inset = pick(FRAME_INSET_MM, design.frame.inset, FRAME_INSET_MM.normal)
  const centered = design.layout.align !== 'start'
  return `:root {
  ${vars}
}
@page { size: A4 portrait; margin: 0; }
html, body { margin: 0; padding: 0; }
html { background: var(--md-page); }
body { color: var(--md-text); font-family: var(--md-font-dish); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.md-page { position: relative; isolation: isolate; width: 210mm; min-height: 297mm; margin-inline: auto; }
.md-bg { position: absolute; inset: 0; z-index: -1; background: var(--md-bg); }
.md-frame { position: absolute; inset: ${inset}mm; pointer-events: none; border: var(--md-frame-width) solid var(--md-border); }
.md-frame--none { border: 0; }
.md-frame--double { border-style: double; border-width: calc(var(--md-frame-width) * 3); }
.md-frame--rounded { border-radius: 8mm; }
.md-frame--ornament { outline: 1px solid var(--md-border); outline-offset: -2mm; }
.md-frame--ornament::before, .md-frame--ornament::after { content: "\\2726"; position: absolute; inset-inline: 0; text-align: center; color: var(--md-accent); background: transparent; }
.md-frame--ornament::before { inset-block-start: 3mm; }
.md-frame--ornament::after { inset-block-end: 3mm; }
.md-content { box-sizing: border-box; padding: ${inset + CONTENT_PADDING_MM}mm; text-align: ${centered ? 'center' : 'start'}; -webkit-box-decoration-break: clone; box-decoration-break: clone; overflow-wrap: anywhere; }
.md-content h1, .md-content h2, .md-content p, .md-content ul { margin: 0; padding: 0; }
.md-logo { display: block; max-width: 80%; margin-inline: ${centered ? 'auto' : '0 auto'}; margin-block-end: var(--md-gap); object-fit: contain; }
.md-logo--s { max-height: 18mm; }
.md-logo--m { max-height: 28mm; }
.md-logo--l { max-height: 40mm; }
.md-header { margin-block-end: var(--md-gap); }
.md-business { color: var(--md-accent); font-family: var(--md-font-section); font-size: var(--md-section-size); }
.md-title { color: var(--md-title); font-family: var(--md-font-title); font-size: var(--md-title-size); line-height: 1.2; }
.md-subtitle { font-size: var(--md-dish-size); margin-block-start: calc(var(--md-gap) / 2); }
.md-divider { margin-block: var(--md-gap); color: var(--md-accent); line-height: 1; }
.md-divider--line { width: 35%; margin-inline: ${centered ? 'auto' : '0 auto'}; border-block-start: 1px solid var(--md-accent); }
.md-divider--dots::before { content: "\\2022 \\2022 \\2022"; letter-spacing: 0.3em; }
.md-divider--ornament::before { content: "\\2726"; }
.md-section { break-inside: avoid; page-break-inside: avoid; margin-block-end: var(--md-gap); }
.md-section-title { color: var(--md-section); font-family: var(--md-font-section); font-size: var(--md-section-size); break-after: avoid; margin-block-end: calc(var(--md-gap) / 2); }
.md-dishes { list-style: none; }
.md-dish { font-size: var(--md-dish-size); line-height: 1.5; padding-block: calc(var(--md-gap) / 6); break-inside: avoid; }
.md-footer { margin-block-start: var(--md-gap); font-size: var(--md-dish-size); }
.md-note { white-space: pre-line; }
.md-note span { unicode-bidi: plaintext; }
.md-contact { color: var(--md-section); margin-block-start: calc(var(--md-gap) / 2); }
.md-powered { font-family: sans-serif; font-size: 8pt; opacity: 0.6; margin-block-start: var(--md-gap); }
@media print {
  .md-page { position: static; isolation: auto; width: auto; min-height: 0; }
  .md-bg, .md-frame { position: fixed; }
}`
}

function sectionElement(section: MenuDocSection): string {
  const dishes = section.dishes.map(dish => textElement('li', 'md-dish', dish.name)).join('')
  return `<section class="md-section">${textElement('h2', 'md-section-title', section.title)}<ul class="md-dishes">${dishes}</ul></section>`
}

/** A complete HTML document (A4 portrait) of one menu in one design. */
export function renderMenuDocument(design: MenuDesignDraft, doc: MenuDoc, options: MenuRenderOptions): string {
  const { businessName, contactLine } = design.fixedTexts
  const logoUrl = design.logo.placement === 'top' ? safeImageUrl(design.logo.url) : null
  const logoSize = LOGO_SIZES.includes(design.logo.size) ? design.logo.size : 'm'
  const frame = FRAME_STYLES.includes(design.frame.style) ? design.frame.style : 'none'
  const divider = DIVIDERS.includes(design.divider) ? `<div class="md-divider md-divider--${design.divider}" aria-hidden="true"></div>` : ''
  const header = [
    logoUrl ? `<img class="md-logo md-logo--${logoSize}" src="${logoUrl.replace(/&/g, '&amp;')}" alt="">` : '',
    textElement('p', 'md-business', businessName),
    textElement('h1', 'md-title', doc.title),
    textElement('p', 'md-subtitle', doc.subtitle)
  ].join('')
  const footer = [
    textElement('p', 'md-note', doc.bottomNote),
    textElement('p', 'md-contact', contactLine),
    textElement('p', 'md-powered', options.poweredBy ? 'Powered by FoodVibe' : undefined)
  ].join('')
  return [
    '<!doctype html>',
    '<html lang="he" dir="rtl">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title dir="auto">${escapeHtml(doc.title || businessName || '')}</title>`,
    options.fonts === 'link' ? fontLink(design) : '',
    `<style>\n${styles(design)}\n</style>`,
    '</head>',
    '<body>',
    '<div class="md-page">',
    '<div class="md-bg" aria-hidden="true"></div>',
    `<div class="md-frame md-frame--${frame}" aria-hidden="true"></div>`,
    '<main class="md-content">',
    header ? `<header class="md-header">${header}</header>${divider}` : '',
    doc.sections.map(sectionElement).join(divider),
    footer ? `<footer class="md-footer">${footer}</footer>` : '',
    '</main>',
    '</div>',
    '</body>',
    '</html>'
  ].filter(Boolean).join('\n')
}
