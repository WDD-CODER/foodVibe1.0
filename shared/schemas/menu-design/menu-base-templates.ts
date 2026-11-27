/** Plan 764 (C-TEMPLATE): the four complete designs every menu design starts from. */
import type { MenuDesignDraft } from '../entities/menu-design.schema'

export const MENU_BASE_TEMPLATES = ['classic', 'modern', 'rustic', 'minimal'] as const

export type MenuBaseTemplate = (typeof MENU_BASE_TEMPLATES)[number]

const BASE_DESIGNS: Record<MenuBaseTemplate, MenuDesignDraft> = {
  classic: {
    baseTemplate: 'classic',
    fonts: { title: 'frank-ruhl-libre', section: 'frank-ruhl-libre', dish: 'david-libre' },
    colors: { page: '#fbf7ee', text: '#2b2a28', title: '#5a3b1e', section: '#7a5a2f', accent: '#b08d4a', border: '#b08d4a' },
    background: { kind: 'texture', textureId: 'paper', imageFit: 'cover', veil: 0 },
    frame: { style: 'double', width: 1, inset: 'normal' },
    divider: 'ornament',
    logo: { size: 'm', placement: 'top' },
    layout: { align: 'center', density: 'normal', titleSize: 'l', sectionSize: 'm', dishSize: 'm' },
    fixedTexts: {},
    origin: 'manual'
  },
  modern: {
    baseTemplate: 'modern',
    fonts: { title: 'heebo', section: 'rubik', dish: 'assistant' },
    colors: { page: '#ffffff', text: '#1f2933', title: '#111827', section: '#0f766e', accent: '#0f766e', border: '#d1d5db' },
    background: { kind: 'color', imageFit: 'cover', veil: 0 },
    frame: { style: 'none', width: 0, inset: 'normal' },
    divider: 'line',
    logo: { size: 's', placement: 'top' },
    layout: { align: 'start', density: 'airy', titleSize: 'l', sectionSize: 'm', dishSize: 'm' },
    fixedTexts: {},
    origin: 'manual'
  },
  rustic: {
    baseTemplate: 'rustic',
    fonts: { title: 'suez-one', section: 'secular-one', dish: 'alef' },
    colors: { page: '#e9dcc3', text: '#3b2f22', title: '#5b2e12', section: '#7c3f17', accent: '#a0522d', border: '#6b4226' },
    background: { kind: 'texture', textureId: 'kraft', imageFit: 'cover', veil: 0 },
    frame: { style: 'rounded', width: 3, inset: 'wide' },
    divider: 'dots',
    logo: { size: 'm', placement: 'top' },
    layout: { align: 'center', density: 'normal', titleSize: 'm', sectionSize: 'm', dishSize: 'm' },
    fixedTexts: {},
    origin: 'manual'
  },
  minimal: {
    baseTemplate: 'minimal',
    fonts: { title: 'bellefair', section: 'miriam-libre', dish: 'assistant' },
    colors: { page: '#fafaf8', text: '#222222', title: '#000000', section: '#444444', accent: '#888888', border: '#222222' },
    background: { kind: 'color', imageFit: 'cover', veil: 0 },
    frame: { style: 'line', width: 1, inset: 'narrow' },
    divider: 'none',
    logo: { size: 's', placement: 'top' },
    layout: { align: 'start', density: 'compact', titleSize: 'm', sectionSize: 's', dishSize: 's' },
    fixedTexts: {},
    origin: 'manual'
  }
}

/** A fresh copy of one base design (the caller may change it). */
export function baseDesign(id: MenuBaseTemplate): MenuDesignDraft {
  const source = BASE_DESIGNS[id]
  return {
    ...source,
    fonts: { ...source.fonts },
    colors: { ...source.colors },
    background: { ...source.background },
    frame: { ...source.frame },
    logo: { ...source.logo },
    layout: { ...source.layout },
    fixedTexts: { ...source.fixedTexts }
  }
}
