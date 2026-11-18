import { z } from 'zod'

/** Plan 615 (C-ACCESS): a consultant's grant into a business. Server-only collection. */
export const businessAccessSchema = z.strictObject({
  _id: z.string().min(1),
  userId: z.string().min(1),
  businessId: z.string().min(1),
  role: z.literal('consultant'),
  grantedBy: z.string().min(1),
  grantedByName: z.string().max(80),
  grantedAt: z.number(),
  revokedAt: z.number().optional(),
  revokedBy: z.string().optional()
})
export type BusinessAccess = z.infer<typeof businessAccessSchema>
