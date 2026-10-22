import { z } from 'zod'

/** Plan 465 — request for the AI route that reads a supplier receipt photo. The photo itself is never stored. */
export const RECEIPT_IMAGE_MAX_BASE64 = 1_800_000
export const RECEIPT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const receiptPhotoRequestSchema = z.object({
  imageBase64: z.string().min(1).max(RECEIPT_IMAGE_MAX_BASE64),
  mimeType: z.enum(RECEIPT_IMAGE_MIME_TYPES),
  knownCategories: z.array(z.string().max(80)).max(200).optional(),
  model: z.string().optional()
})

export type ReceiptPhotoRequest = z.infer<typeof receiptPhotoRequestSchema>
