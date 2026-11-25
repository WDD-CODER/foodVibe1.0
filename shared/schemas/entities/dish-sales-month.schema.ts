import { z } from 'zod'
import { baseDocShape } from '../base.schema'
import { DEALER_TYPES } from './business.schema'
import { DISH_COST_SOURCES } from './menu-dish.schema'

/** Plan 724: one document per business and month: the dish sales and returns, later frozen at the month close. */
export const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
export const DISH_RETURN_REASONS = ['guest_returned', 'kitchen_mistake', 'staff_meal', 'comp', 'expired', 'other'] as const
/** Fields only the server writes (the month close); a client's value is dropped. */
export const DISH_MONTH_SERVER_FIELDS = ['closedAt', 'closedBy', 'frozen', 'skipped'] as const

/** N-M2: null = not entered, 0 = a real zero. */
const countSchema = z.number().int().min(0).max(100000).nullable()

const returnReasonSchema = z.strictObject({
  reason: z.string().min(1).max(80),
  count: z.number().int().min(1),
  note: z.string().max(200).optional()
})

const rowSchema = z
  .strictObject({
    menuDishId: z.string().min(1),
    nameSnapshot: z.string().max(200),
    sold: countSchema,
    returned: countSchema,
    returnReasons: z.array(returnReasonSchema).max(20).default([]),
    netSales: z.number().min(0).nullable().optional(),
    source: z.enum(['typed', 'import']).default('typed')
  })
  .superRefine((row, ctx) => {
    const reasons = row.returnReasons
    if (reasons.length === 0) return
    const issue = (message: string) => ctx.addIssue({ code: 'custom', path: ['returnReasons'], message })
    if (row.returned === null) return issue('no reasons without a returned count')
    if (new Set(reasons.map(r => r.reason)).size !== reasons.length) issue('a reason repeats')
    if (reasons.reduce((sum, r) => sum + r.count, 0) > row.returned) issue('reasons exceed returned')
    if (reasons.some(r => r.reason === 'other' && !r.note?.trim())) issue('other needs a note')
  })

const frozenSchema = z.strictObject({
  at: z.number(),
  vatRatePct: z.number().min(0).max(100),
  dealerType: z.enum(DEALER_TYPES),
  dishes: z
    .array(
      z.strictObject({
        menuDishId: z.string().min(1),
        name: z.string().max(200),
        course: z.string().optional(),
        priceWithVat: z.number().nullable(),
        costPerPortion: z.number().nullable(),
        costSource: z.enum(DISH_COST_SOURCES),
        partial: z.boolean()
      })
    )
    .max(300)
})

export const dishSalesMonthSchema = z
  .strictObject({
    ...baseDocShape,
    month: z.string().regex(MONTH_KEY_PATTERN),
    note: z.string().max(500).optional(),
    rows: z.array(rowSchema).max(300),
    closedAt: z.number().optional(),
    closedBy: z.string().min(1).optional(),
    frozen: frozenSchema.optional(),
    skipped: z.array(z.strictObject({ name: z.string().max(200), units: z.number().int().min(0) })).max(300).optional()
  })
  .superRefine((month, ctx) => {
    if (new Set(month.rows.map(r => r.menuDishId)).size !== month.rows.length) {
      ctx.addIssue({ code: 'custom', path: ['rows'], message: 'a dish repeats' })
    }
  })
export type DishSalesMonth = z.infer<typeof dishSalesMonthSchema>
