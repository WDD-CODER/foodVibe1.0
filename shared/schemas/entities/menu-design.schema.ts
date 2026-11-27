/** Plan 764 (C-DESIGN): the stored look of a business's menus (`menuDesigns`). It holds no dish and no price. */
import { z } from 'zod'
import { baseDocShape } from '../base.schema'
import { MENU_BASE_TEMPLATES } from '../menu-design/menu-base-templates'
import { MENU_FONT_IDS } from '../menu-design/menu-fonts'
import { MENU_TEXTURE_IDS } from '../menu-design/menu-textures'

const fontId = z.enum(MENU_FONT_IDS)
const hex = z.string().regex(/^#[0-9a-f]{6}$/i)
const size = z.enum(['s', 'm', 'l'])
const cloudinaryHttpsUrl = z.string().url().max(500).startsWith('https://res.cloudinary.com/')

const backgroundSchema = z
  .strictObject({
    kind: z.enum(['color', 'texture', 'image']),
    textureId: z.enum(MENU_TEXTURE_IDS).optional(),
    imageUrl: cloudinaryHttpsUrl.optional(),
    imageFit: z.enum(['cover', 'tile']).default('cover'),
    /** A page-colored layer over the image, for readability. */
    veil: z.number().min(0).max(0.8).default(0)
  })
  .superRefine((background, ctx) => {
    if (background.kind === 'texture' && !background.textureId) {
      ctx.addIssue({ code: 'custom', path: ['textureId'], message: 'a texture background needs textureId' })
    }
    if (background.kind === 'image' && !background.imageUrl) {
      ctx.addIssue({ code: 'custom', path: ['imageUrl'], message: 'an image background needs imageUrl' })
    }
  })

/** Everything a design looks like; also what the AI must return (D8). */
const draftShape = {
  baseTemplate: z.enum(MENU_BASE_TEMPLATES),
  fonts: z.strictObject({ title: fontId, section: fontId, dish: fontId }),
  colors: z.strictObject({ page: hex, text: hex, title: hex, section: hex, accent: hex, border: hex }),
  background: backgroundSchema,
  frame: z.strictObject({
    style: z.enum(['none', 'line', 'double', 'rounded', 'ornament']),
    width: z.number().int().min(0).max(6),
    inset: z.enum(['narrow', 'normal', 'wide'])
  }),
  divider: z.enum(['none', 'line', 'dots', 'ornament']),
  logo: z.strictObject({ url: cloudinaryHttpsUrl.optional(), size, placement: z.enum(['top', 'none']) }),
  layout: z.strictObject({
    align: z.enum(['center', 'start']),
    density: z.enum(['compact', 'normal', 'airy']),
    titleSize: size,
    sectionSize: size,
    dishSize: size
  }),
  fixedTexts: z.strictObject({ businessName: z.string().max(60).optional(), contactLine: z.string().max(120).optional() }),
  /** The reference an AI design was made from is never stored. */
  origin: z.enum(['manual', 'ai']).default('manual')
}

export const menuDesignSchema = z.strictObject({
  ...baseDocShape,
  name: z.string().trim().min(1).max(60),
  ...draftShape
})

export const menuDesignDraftSchema = z.strictObject(draftShape)

export type MenuDesign = z.infer<typeof menuDesignSchema>
export type MenuDesignDraft = z.infer<typeof menuDesignDraftSchema>
