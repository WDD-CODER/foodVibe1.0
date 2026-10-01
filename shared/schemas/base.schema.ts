import { z } from 'zod'

/** Fields every persisted v2 document carries (Plan 321 Phase 2a, decision D4: camelCase, no trailing `_`). */
export const baseDocShape = {
  _id: z.string().min(1),
  schemaVersion: z.literal(2),
  userId: z.string().min(1),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
  deletedBy: z.string().optional()
}

/**
 * A per-user deletion marker (`_userDeleted: true`): a stub left behind when a user deletes a
 * master-cloned document, so sync-master doesn't re-clone it. Carries no entity data.
 * Goes away with the clone/sync model in Phase 5 / Phase 6.
 */
export const tombstoneSchema = z.strictObject({
  _id: z.string().min(1),
  schemaVersion: z.literal(2),
  userId: z.string().min(1),
  _masterId: z.string().optional(),
  _userModified: z.boolean().optional(),
  _userDeleted: z.literal(true)
})
