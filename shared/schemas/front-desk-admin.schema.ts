import { z } from 'zod'
import { FRONT_DESK_PLANS, FRONT_DESK_STATUSES } from './entities/front-desk-profile.schema'

/** Plan 557: body of `PUT /api/v1/admin/businesses/:id/front-desk` (platform admin only). */
export const frontDeskAdminUpdateSchema = z
  .strictObject({
    status: z.enum(FRONT_DESK_STATUSES).optional(),
    assistantLevel: z.union([z.literal(0), z.literal(1)]).optional(),
    plan: z.enum(FRONT_DESK_PLANS).optional(),
    reason: z.string().trim().min(1).max(200)
  })
  .refine(b => b.status !== undefined || b.assistantLevel !== undefined || b.plan !== undefined, {
    message: 'status, assistantLevel or plan is required'
  })
export type FrontDeskAdminUpdate = z.infer<typeof frontDeskAdminUpdateSchema>
