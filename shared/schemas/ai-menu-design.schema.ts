import { z } from 'zod'
import { menuDesignDraftSchema } from './entities/menu-design.schema'

/** Plan 766 — requests of the two AI routes of the menu designer. The reference is never stored. */
export const MENU_DESIGN_IMAGE_MAX_BASE64 = 1_800_000
export const MENU_DESIGN_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MENU_DESIGN_NOTE_MAX = 300
export const MENU_DESIGN_URL_MAX = 500
export const MENU_DESIGN_TEXT_MAX = 500
export const MENU_DESIGN_REQUEST_MAX = 300

/** What the chef shows the AI: a picture, a web page or a few words. */
export const menuDesignReferenceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('image'),
    imageBase64: z.string().min(1).max(MENU_DESIGN_IMAGE_MAX_BASE64),
    mimeType: z.enum(MENU_DESIGN_IMAGE_MIME_TYPES),
    note: z.string().max(MENU_DESIGN_NOTE_MAX).optional()
  }),
  z.object({ kind: z.literal('url'), url: z.string().trim().min(1).max(MENU_DESIGN_URL_MAX) }),
  z.object({ kind: z.literal('text'), text: z.string().trim().min(1).max(MENU_DESIGN_TEXT_MAX) })
])

export const menuDesignVariantsRequestSchema = z.object({
  reference: menuDesignReferenceSchema,
  model: z.string().optional()
})

export const menuDesignRefineRequestSchema = z.object({
  design: menuDesignDraftSchema,
  request: z.string().trim().min(1).max(MENU_DESIGN_REQUEST_MAX),
  model: z.string().optional()
})

export type MenuDesignReference = z.infer<typeof menuDesignReferenceSchema>
export type MenuDesignVariantsRequest = z.infer<typeof menuDesignVariantsRequestSchema>
export type MenuDesignRefineRequest = z.infer<typeof menuDesignRefineRequestSchema>

/** One design the AI offered; `fallback` marks a base design standing in for an answer that was not valid. */
export interface MenuDesignAiResult {
  design: z.infer<typeof menuDesignDraftSchema>
  fallback: boolean
}

export interface MenuDesignVariantsResponse {
  variants: MenuDesignAiResult[]
}
