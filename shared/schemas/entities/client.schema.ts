import { z } from 'zod'
import { baseDocShape, nameField } from '../base.schema'

export const CLIENT_TYPES = ['private', 'business', 'production_company'] as const

export const clientTypeSchema = z.enum(CLIENT_TYPES)

/**
 * A client: who the events are for (the event is what). Owner-only to write; staff read only
 * `name` and `phone` (STAFF_READ_FIELDS). Carries no clone-lineage fields (`_masterId`, `_userModified`).
 */
export const clientSchema = z.strictObject({
  ...baseDocShape,
  name: nameField,
  phone: z.string().min(7).max(30).regex(/^[0-9+\-\s()]{7,20}$/),
  /** Digits of `phone`; the server derives it on every write, a client-sent value is ignored. */
  phoneNormalized: z.string().max(30),
  clientType: clientTypeSchema.default('private'),
  companyName: z.string().max(200).optional(),
  email: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  source: z.string().max(100).optional()
})
