/**
 * Plan 765: the designer's form and a stored design. The form has the shape of a design draft but may be half filled
 * (an image background before its picture, a colour half typed); `designFromForm` always answers a design the shared
 * schema accepts. Type-only schema import: the validation library stays out of the first bundle.
 */
import type { MenuDesign, MenuDesignDraft } from '@schemas/entities/menu-design.schema'
import { baseDesign } from '@schemas/menu-design/menu-base-templates'
import { MENU_TEXTURE_IDS } from '@schemas/menu-design/menu-textures'

export type MenuDesignForm = MenuDesignDraft

export type MenuColorKey = keyof MenuDesignDraft['colors']

export const MENU_COLOR_KEYS: readonly MenuColorKey[] = ['page', 'text', 'title', 'section', 'accent', 'border']

export const BUSINESS_NAME_MAX = 60
export const CONTACT_LINE_MAX = 120
export const FRAME_WIDTH_MAX = 6
export const VEIL_MAX = 0.8

const HEX = /^#[0-9a-f]{6}$/i
const IMAGE_PREFIX = 'https://res.cloudinary.com/'

/** True for a six-digit colour such as `#a1b2c3`. */
export function isHexColor(value: string): boolean {
  return HEX.test(value)
}

/** The look of a design (a stored one or a draft) as a fresh copy: no id, name, owner or dates. */
export function formFromDesign(design: MenuDesignDraft | MenuDesign): MenuDesignForm {
  return {
    baseTemplate: design.baseTemplate,
    fonts: { ...design.fonts },
    colors: { ...design.colors },
    background: { ...design.background },
    frame: { ...design.frame },
    divider: design.divider,
    logo: { ...design.logo },
    layout: { ...design.layout },
    fixedTexts: { ...design.fixedTexts },
    origin: design.origin
  }
}

function clamp(value: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), max) : fallback
}

function imageUrlOf(url: string | undefined): string | undefined {
  return url?.startsWith(IMAGE_PREFIX) ? url : undefined
}

function backgroundOf(
  form: MenuDesignForm['background'],
  previous: MenuDesignDraft['background']
): MenuDesignDraft['background'] {
  const imageUrl = imageUrlOf(form.imageUrl) ?? previous.imageUrl
  // An image background needs its picture: without one the old kind stays.
  let kind = form.kind
  if (kind === 'image' && !imageUrl) kind = previous.kind === 'image' ? 'color' : previous.kind
  const textureId = form.textureId ?? (kind === 'texture' ? (previous.textureId ?? MENU_TEXTURE_IDS[0]) : undefined)
  return {
    kind,
    ...(textureId && { textureId }),
    ...(imageUrl && { imageUrl }),
    imageFit: form.imageFit,
    veil: clamp(form.veil, VEIL_MAX, 0)
  }
}

/** `previous` is the design the form was filled from: it answers whatever the form holds only half of. */
export function designFromForm(
  form: MenuDesignForm,
  previous: MenuDesignDraft = baseDesign(form.baseTemplate)
): MenuDesignDraft {
  const colors = { ...form.colors }
  for (const key of MENU_COLOR_KEYS) {
    if (!isHexColor(colors[key])) colors[key] = previous.colors[key]
  }
  const logoUrl = imageUrlOf(form.logo.url)
  const businessName = form.fixedTexts.businessName?.slice(0, BUSINESS_NAME_MAX)
  const contactLine = form.fixedTexts.contactLine?.slice(0, CONTACT_LINE_MAX)
  return {
    baseTemplate: form.baseTemplate,
    fonts: { ...form.fonts },
    colors,
    background: backgroundOf(form.background, previous.background),
    frame: { ...form.frame, width: Math.round(clamp(form.frame.width, FRAME_WIDTH_MAX, previous.frame.width)) },
    divider: form.divider,
    logo: { ...(logoUrl && { url: logoUrl }), size: form.logo.size, placement: form.logo.placement },
    layout: { ...form.layout },
    fixedTexts: { ...(businessName && { businessName }), ...(contactLine && { contactLine }) },
    origin: form.origin
  }
}
