import { z } from 'zod'
import { nameField } from '../base.schema'

/** Plan 424: one document per business (the tenant). Lives in the `businesses` collection, not the generic data pipe. */
export const businessSchema = z.strictObject({
  _id: z.string().min(1),
  name: nameField.min(1),
  ownerId: z.string().min(1),
  createdAt: z.number(),
  internal: z.boolean(),
  lastSyncedMasterVersion: z.number().int().min(0)
})

export type Business = z.infer<typeof businessSchema>
