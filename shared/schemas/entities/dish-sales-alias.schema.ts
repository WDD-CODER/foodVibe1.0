import { z } from 'zod'
import { baseDocShape } from '../base.schema'
import { coefficientSchema } from './taxonomy-term.schema'

/** Plan 724: a name printed on a sales file linked to a menu dish (or skipped), with a portion factor. */
export const DISH_ALIAS_ACTIONS = ['dish', 'skip'] as const
/** Fields only the server writes; a client's value is dropped. */
export const DISH_ALIAS_SERVER_FIELDS = ['nameKey', 'hits', 'lastSeenAt'] as const

export const dishSalesAliasSchema = z
  .strictObject({
    ...baseDocShape,
    name: z.string().min(1).max(200),
    nameKey: z.string().max(200),
    action: z.enum(DISH_ALIAS_ACTIONS),
    menuDishId: z.string().min(1).optional(),
    portionFactor: coefficientSchema.refine(n => n <= 20, 'max 20').default(1),
    hits: z.number().int().min(0).default(0),
    lastSeenAt: z.number().optional()
  })
  .superRefine((alias, ctx) => {
    if (alias.action === 'dish' && !alias.menuDishId) ctx.addIssue({ code: 'custom', path: ['menuDishId'], message: 'required for dish' })
    if (alias.action === 'skip' && alias.menuDishId) ctx.addIssue({ code: 'custom', path: ['menuDishId'], message: 'not allowed for skip' })
  })
export type DishSalesAlias = z.infer<typeof dishSalesAliasSchema>
