import { z } from 'zod'

/** Plan 615 (C-AIDRAFT): what the model suggested and what the person kept. Server-only collection. */
export const AI_DRAFT_SUBJECT_TYPES = ['menuEvent', 'invoice', 'diagnosis', 'stockCount'] as const
export const AI_DRAFT_STATUSES = ['pending', 'confirmed'] as const
export const AI_DRAFT_TEXT_MAX = 20000

/** A JSON object or a JSON array. */
const jsonShape = z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())])

export const aiDraftSchema = z.strictObject({
  _id: z.string().min(1),
  businessId: z.string().min(1),
  userId: z.string().min(1),
  feature: z.string().min(1).max(40),
  /** The model that answered, so accuracy can be read per model. */
  model: z.string().max(80).optional(),
  subject: z.strictObject({ type: z.enum(AI_DRAFT_SUBJECT_TYPES), id: z.string().optional() }).optional(),
  input: z.strictObject({ text: z.string().max(AI_DRAFT_TEXT_MAX).optional(), fileId: z.string().optional() }),
  aiDraft: jsonShape,
  saved: jsonShape.optional(),
  keptRatio: z.number().min(0).max(1).optional(),
  status: z.enum(AI_DRAFT_STATUSES),
  at: z.number(),
  confirmedAt: z.number().optional()
})
export type AiDraft = z.infer<typeof aiDraftSchema>
