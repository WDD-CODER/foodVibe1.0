import { z } from 'zod'
import { baseDocShape } from '../base.schema'

export const equipmentSchema = z.strictObject({
  ...baseDocShape,
  nameHebrew: z.string(),
  category: z.enum(['heat_source', 'tool', 'container', 'packaging', 'infrastructure', 'consumable']),
  ownedQuantity: z.number(),
  scalingRule: z.strictObject({
    perGuests: z.number(),
    minQuantity: z.number(),
    maxQuantity: z.number().optional()
  }).optional(),
  isConsumable: z.boolean(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  masterId: z.string().optional(),
  userModified: z.boolean().optional(),
  userDeleted: z.boolean().optional()
})
