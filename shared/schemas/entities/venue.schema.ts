import { z } from 'zod'
import { baseDocShape } from '../base.schema'
import { environmentTypeSchema } from './common.schema'

export const venueSchema = z.strictObject({
  ...baseDocShape,
  nameHebrew: z.string(),
  environmentType: environmentTypeSchema,
  availableInfrastructure: z.array(z.strictObject({
    equipmentId: z.string(),
    availableQuantity: z.number()
  })),
  notes: z.string().optional(),
  address: z.string().optional(),
  capacity: z.number().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  operatingHours: z.array(z.strictObject({ days: z.string(), time: z.string() })).optional(),
  active: z.boolean().optional(),
  photoUrl: z.string().optional(),
  masterId: z.string().optional(),
  userModified: z.boolean().optional(),
  userDeleted: z.boolean().optional()
})
