import { z } from 'zod'

/** Plan 615 (C-FILES): a private file kept at the provider. Server-only collection. */
export const STORED_FILE_KINDS = ['invoice', 'voice'] as const

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
  format: z.string().max(12).optional(),
  createdBy: z.string().min(1),
  createdAt: z.number(),
  deleteAfter: z.number().optional()
})
export type StoredFile = z.infer<typeof storedFileSchema>
