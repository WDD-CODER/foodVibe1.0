import { z } from 'zod'
import { MODULE_KEYS } from './modules-pure'

export * from './modules-pure'

export const modulesFieldSchema = z
  .array(z.enum(MODULE_KEYS))
  .max(5)
  .refine(list => new Set(list).size === list.length, { message: 'modules must not repeat' })

export const platformHistoryRowSchema = z.strictObject({
  at: z.number(),
  by: z.string().min(1),
  byName: z.string().max(80),
  reason: z.string().min(3).max(200),
  changed: z.array(z.string().max(40)).max(10),
  changes: z
    .array(z.strictObject({ field: z.string().max(40), from: z.string().max(200), to: z.string().max(200) }))
    .max(10)
    .optional()
})
export type PlatformHistoryRow = z.infer<typeof platformHistoryRowSchema>

/** Body of the platform admin's write (plan 616). */
export const platformUpdateSchema = z
  .strictObject({
    modules: modulesFieldSchema.optional(),
    aiMonthlyTokenCap: z.number().int().min(0).nullable().optional(),
    aiPrivate: z.boolean().optional(),
    reason: z.string().trim().min(3).max(200)
  })
  .refine(body => body.modules !== undefined || body.aiMonthlyTokenCap !== undefined || body.aiPrivate !== undefined, {
    message: 'at least one of modules, aiMonthlyTokenCap, aiPrivate'
  })
export type PlatformUpdate = z.infer<typeof platformUpdateSchema>
