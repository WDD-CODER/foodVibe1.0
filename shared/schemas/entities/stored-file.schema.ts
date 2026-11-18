import { z } from 'zod'

/** Plan 615 (C-FILES): a private file kept at the provider. Server-only collection. */
export const STORED_FILE_KINDS = ['invoice', 'voice'] as const

/** Plan 619: the limits every route that receives a file shares (the JSON body limit is 2 MB). */
export const FILE_BASE64_MAX = 1_800_000
export const FILE_KINDS = STORED_FILE_KINDS
export const FILE_MIME_TYPES = {
  invoice: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  voice: ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav']
} as const
/** A voice recording is kept 24 months (decision D6). */
export const VOICE_FILE_KEEP_DAYS = 730

export const storedFileSchema = z.strictObject({
  _id: z.string().min(1),
  businessId: z.string().min(1),
  kind: z.enum(STORED_FILE_KINDS),
  mimeType: z.string().max(100),
  bytes: z.number().int().min(0),
  provider: z.literal('cloudinary'),
  providerId: z.string().min(1).max(300),
  resourceType: z.string().max(20),
  /** From the provider's upload answer. */
  format: z.string().min(1).max(12).optional(),
  createdBy: z.string().min(1),
  createdAt: z.number(),
  deleteAfter: z.number().optional()
})
export type StoredFile = z.infer<typeof storedFileSchema>
