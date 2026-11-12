import { z } from 'zod'
import { nameField } from '../base.schema'
import { REQUEST_KINDS, wantedSchema } from '../entities/request.schema'

/**
 * Plan 555 (C-PUBLIC): what a stranger may send to `POST /api/v1/public/:slug/requests`.
 * Strict: no `businessId`, no labels (the server takes labels from the profile), no status.
 */
export const publicRequestSchema = z.strictObject({
  kind: z.enum(REQUEST_KINDS),
  guestName: nameField.min(2),
  guestPhone: z.string().min(7).max(30),
  wanted: wantedSchema,
  answers: z.array(z.strictObject({ questionKey: z.string().max(60), value: z.string().max(500) })).max(30),
  consentTerms: z.literal(true),
  website: z.string().max(200).optional()
})
export type PublicRequestInput = z.infer<typeof publicRequestSchema>
