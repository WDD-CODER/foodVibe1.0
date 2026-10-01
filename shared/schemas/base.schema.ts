import { z } from 'zod'

/** Fields every persisted v2 document carries (Plan 321 Phase 2a, decision D4: camelCase, no trailing `_`). */
export const baseDocShape = {
  _id: z.string().min(1),
  schemaVersion: z.literal(2),
  ownerId: z.string().min(1),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
  deletedBy: z.string().optional()
}
