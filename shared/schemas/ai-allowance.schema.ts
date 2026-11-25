import { z } from 'zod'

/**
 * Plan 736 — every user's lifetime AI allowance. A user with no `aiAllowance` field has this many AI requests;
 * a user with no `aiCallsUsed` has used none. The server and the browser both read these numbers.
 */
export const AI_DEFAULT_ALLOWANCE = 100
/** The highest allowance a platform admin can give one user. */
export const AI_ALLOWANCE_MAX = 100000

/** Body of `PUT /api/v1/admin/users/:userId/ai-allowance` (platform admin only). */
export const aiAllowanceUpdateSchema = z.object({
  aiAllowance: z.number().int().min(0).max(AI_ALLOWANCE_MAX)
}).strict()

export type AiAllowanceUpdate = z.infer<typeof aiAllowanceUpdateSchema>
