import { z } from 'zod'
import { baseDocShape } from '../base.schema'
import { FIXED_LINES_MAX, FIXED_STARTER_KEYS, MONTH_KEY_PATTERN } from '../month/month-rules'
import { DEALER_TYPES, monthTargetsSchema } from './business.schema'

/** Plan 727: one document per business and month: its own targets, the VAT copy and the typed revenue. */
export const MONTH_PLAN_STATUSES = ['open', 'closed'] as const

/** N-M2: `null` = not entered, 0 = a real zero. All money is net of VAT, after discounts, without tips. */
const amountSchema = z.number().min(0).max(1_000_000_000).nullable()
const pctSchema = z.number().min(0).max(100)

const monthKeySchema = z.string().regex(MONTH_KEY_PATTERN)

/** Plan 729: a fixed line has exactly one of `starterKey` (named by the dictionary) or `name` (the owner's own). */
const fixedLineSchema = z
  .strictObject({
    id: z.string().min(1).max(40),
    starterKey: z.enum(FIXED_STARTER_KEYS).optional(),
    name: z.string().trim().min(1).max(60).optional(),
    plan: amountSchema,
    actual: amountSchema
  })
  .refine(line => (line.starterKey === undefined) !== (line.name === undefined), { message: 'one of starterKey or name' })

export const fixedGroupSchema = z
  .strictObject({
    mode: z.enum(['lines', 'rough']),
    lines: z.array(fixedLineSchema).max(FIXED_LINES_MAX),
    rough: z.strictObject({ plan: amountSchema, actual: amountSchema })
  })
  .refine(group => new Set(group.lines.map(l => l.id)).size === group.lines.length, { message: 'line ids must be unique', path: ['lines'] })

/** One total for the whole team: no names, no roles, no per-person rows (ADR 0035). */
export const labourGroupSchema = z.strictObject({
  mode: z.enum(['employer', 'gross']),
  factor: z.number().min(1).max(2),
  plan: amountSchema,
  actual: amountSchema
})

export const purchasesGroupSchema = z.strictObject({ actual: amountSchema })

export const monthPlanSchema = z.strictObject({
  ...baseDocShape,
  month: monthKeySchema,
  status: z.enum(MONTH_PLAN_STATUSES),
  targets: monthTargetsSchema,
  vatRatePct: pctSchema,
  dealerType: z.enum(DEALER_TYPES),
  revenue: z.strictObject({ plan: amountSchema, actual: amountSchema }),
  fixed: fixedGroupSchema.optional(),
  labour: labourGroupSchema.optional(),
  purchases: purchasesGroupSchema.optional()
})
export type MonthPlan = z.infer<typeof monthPlanSchema>

export const monthPlanCreateInputSchema = z.strictObject({ month: monthKeySchema })
export type MonthPlanCreateInput = z.infer<typeof monthPlanCreateInputSchema>

export const monthPlanUpdateInputSchema = z
  .strictObject({
    revenue: z.strictObject({ plan: amountSchema.optional(), actual: amountSchema.optional() }).optional(),
    targets: monthTargetsSchema.partial().optional(),
    fixed: fixedGroupSchema.optional(),
    labour: labourGroupSchema.optional(),
    purchases: purchasesGroupSchema.optional()
  })
  .refine(
    body =>
      (body.revenue !== undefined && Object.keys(body.revenue).length > 0) ||
      (body.targets !== undefined && Object.keys(body.targets).length > 0) ||
      body.fixed !== undefined ||
      body.labour !== undefined ||
      body.purchases !== undefined,
    { message: 'at least one field' }
  )
export type MonthPlanUpdateInput = z.infer<typeof monthPlanUpdateInputSchema>
