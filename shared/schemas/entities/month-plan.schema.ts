import { z } from 'zod'
import { baseDocShape } from '../base.schema'
import { MONTH_KEY_PATTERN } from '../month/month-rules'
import { DEALER_TYPES, monthTargetsSchema } from './business.schema'

/** Plan 727: one document per business and month: its own targets, the VAT copy and the typed revenue. */
export const MONTH_PLAN_STATUSES = ['open', 'closed'] as const

/** N-M2: `null` = not entered, 0 = a real zero. All money is net of VAT, after discounts, without tips. */
const amountSchema = z.number().min(0).max(1_000_000_000).nullable()
const pctSchema = z.number().min(0).max(100)

const monthKeySchema = z.string().regex(MONTH_KEY_PATTERN)

export const monthPlanSchema = z.strictObject({
  ...baseDocShape,
  month: monthKeySchema,
  status: z.enum(MONTH_PLAN_STATUSES),
  targets: monthTargetsSchema,
  vatRatePct: pctSchema,
  dealerType: z.enum(DEALER_TYPES),
  revenue: z.strictObject({ plan: amountSchema, actual: amountSchema })
})
export type MonthPlan = z.infer<typeof monthPlanSchema>

export const monthPlanCreateInputSchema = z.strictObject({ month: monthKeySchema })
export type MonthPlanCreateInput = z.infer<typeof monthPlanCreateInputSchema>

export const monthPlanUpdateInputSchema = z
  .strictObject({
    revenue: z.strictObject({ plan: amountSchema.optional(), actual: amountSchema.optional() }).optional(),
    targets: monthTargetsSchema.partial().optional()
  })
  .refine(
    body => (body.revenue !== undefined && Object.keys(body.revenue).length > 0) || (body.targets !== undefined && Object.keys(body.targets).length > 0),
    { message: 'at least one field' }
  )
export type MonthPlanUpdateInput = z.infer<typeof monthPlanUpdateInputSchema>
