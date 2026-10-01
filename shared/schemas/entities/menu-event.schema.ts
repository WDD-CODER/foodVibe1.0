import { z } from 'zod'
import { baseDocShape } from '../base.schema'
import { eventLogisticsSchema } from './common.schema'

export const menuEventSchema = z.strictObject({
  ...baseDocShape,
  name: z.string(),
  eventType: z.string(),
  eventDate: z.string().optional(),
  servingType: z.string(),
  guestCount: z.number(),
  piecesPerPerson: z.number().optional(),
  sections: z.array(z.strictObject({
    _id: z.string(),
    name: z.string(),
    sortOrder: z.number(),
    items: z.array(z.strictObject({
      recipeId: z.string(),
      recipeType: z.enum(['dish', 'recipe']),
      predictedTakeRate: z.number(),
      derivedPortions: z.number(),
      sellPrice: z.number().optional(),
      foodCostOverride: z.number().optional(),
      servingPortions: z.number().optional()
    }))
  })),
  financialTargets: z.strictObject({
    targetFoodCostPct: z.number(),
    targetRevenuePerGuest: z.number().optional()
  }).optional(),
  performanceTags: z.strictObject({
    foodCostPct: z.number(),
    primaryServingStyle: z.string()
  }).optional(),
  cuisineTags: z.array(z.string()).optional(),
  createdFromTemplateId: z.string().optional(),
  logistics: eventLogisticsSchema.optional(),
  masterId: z.string().optional(),
  userModified: z.boolean().optional(),
  userDeleted: z.boolean().optional()
})
