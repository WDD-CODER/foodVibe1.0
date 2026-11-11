import { z } from 'zod'

/** One row of opening hours (venues and front desk profiles share it; plan 548). `dayIndexes` 0 = Sunday. */
export const operatingHoursRowSchema = z.strictObject({
  days: z.string(),
  time: z.string(),
  dayIndexes: z.array(z.number().int().min(0).max(6)).optional(),
  open: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  close: z.string().regex(/^\d{2}:\d{2}$/).optional()
})
export type OperatingHoursRow = z.infer<typeof operatingHoursRowSchema>

export const ingredientSchema = z.strictObject({
  _id: z.string(),
  referenceId: z.string().optional(),
  type: z.enum(['product', 'recipe']).optional(),
  amount: z.number(),
  unit: z.string(),
  note: z.string().optional(),
  calculatedCost: z.number().optional(),
  nameSnapshot: z.string().optional(),
  /** Plan 536: the supplier this line is bought from (owner-only money field); absent = automatic = cheapest. */
  supplierId: z.string().optional()
})

export const baselineEntrySchema = z.strictObject({
  equipmentId: z.string(),
  quantity: z.number(),
  phase: z.enum(['prep', 'service', 'both']),
  isCritical: z.boolean(),
  notes: z.string().optional()
})

export const dishLogisticsSchema = z.strictObject({
  baseline: z.array(baselineEntrySchema),
  serviceOverrides: z.array(z.strictObject({
    serviceStyle: z.enum(['plated', 'takeaway', 'buffet']),
    equipment: z.array(baselineEntrySchema)
  })).optional()
})

export const environmentTypeSchema = z.enum(['professional_kitchen', 'outdoor_field', 'client_home', 'popup_venue'])

export const eventLogisticsSchema = z.strictObject({
  environmentType: environmentTypeSchema,
  venueProfileId: z.string().optional(),
  resolvedItems: z.array(z.strictObject({
    equipmentId: z.string(),
    autoQuantity: z.number(),
    source: z.enum(['baseline', 'environmental', 'service_style', 'scaling', 'manual'])
  })),
  manualOverrides: z.array(z.strictObject({
    equipmentId: z.string(),
    overrideQuantity: z.number()
  })).optional()
})
