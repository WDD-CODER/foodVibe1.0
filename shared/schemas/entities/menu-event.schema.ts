import { z } from 'zod'
import { baseDocShape, nameField } from '../base.schema'
import { eventLogisticsSchema } from './common.schema'
import { coefficientSchema } from './taxonomy-term.schema'

/** Plan 440: a copy of the event type's / serving type's name and coefficient at selection time (no decimal rule: it is a copy). */
const typeSnapshotSchema = z.strictObject({
  key: z.string(),
  name: z.string(),
  coefficient: z.number().positive()
})

export const menuEventSchema = z.strictObject({
  ...baseDocShape,
  name: nameField,
  eventType: z.string(),
  eventDate: z.string().optional(),
  servingType: z.string(),
  eventTypeSnapshot: typeSnapshotSchema.optional(),
  servingTypeSnapshot: typeSnapshotSchema.optional(),
  guestCount: z.number(),
  /** @deprecated legacy since plan 440, unused */
  piecesPerPerson: z.number().optional(),
  sections: z.array(z.strictObject({
    _id: z.string(),
    name: z.string(),
    sortOrder: z.number(),
    items: z.array(z.strictObject({
      recipeId: z.string(),
      recipeType: z.enum(['dish', 'preparation']),
      /** @deprecated legacy since plan 440, unused */
      predictedTakeRate: z.number().optional(),
      derivedPortions: z.number(),
      sellPrice: z.number().optional(),
      foodCostOverride: z.number().optional(),
      /** @deprecated replaced by portionsPerDiner (plan 440); read only as a fallback */
      servingPortions: z.number().optional(),
      portionsPerDiner: z.number().min(0).optional(),
      coefficientOverride: coefficientSchema.optional()
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
  _masterId: z.string().optional(),
  _userModified: z.boolean().optional()
})
