import { z } from 'zod'

export const ingredientSchema = z.strictObject({
  _id: z.string(),
  referenceId: z.string().optional(),
  type: z.enum(['product', 'recipe']).optional(),
  amount: z.number(),
  unit: z.string(),
  note: z.string().optional(),
  calculatedCost: z.number().optional(),
  nameSnapshot: z.string().optional()
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
