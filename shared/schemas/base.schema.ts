import { z } from 'zod'

/** Longest name an item may have (plan 417): one limit for every entity, Hebrew or English. */
export const NAME_MAX_LENGTH = 200

/** An item's own name. Snapshot copies of a name (nameSnapshot, itemName, …) stay unlimited. */
export const nameField = z.string().max(NAME_MAX_LENGTH)

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
 * Plan 407: the stub a user's copy of a shared (__master__) item shrinks to when it is removed
 * for good (dispose, empty Trash, 30-day purge) — keeps `_masterId` so sync-master never clones it
 * back. Carries no entity data and never shows in lists or Trash (`purgedAt` set).
 */
export const tombstoneSchema = z.strictObject({
  _id: z.string().min(1),
  schemaVersion: z.literal(2),
  userId: z.string().min(1),
  _masterId: z.string().min(1),
  _userModified: z.boolean().optional(),
  deletedAt: z.number(),
  deletedBy: z.string().optional(),
  purgedAt: z.number()
})
