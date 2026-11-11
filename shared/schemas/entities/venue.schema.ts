import { z } from 'zod'
import { baseDocShape, nameField } from '../base.schema'
import { environmentTypeSchema, operatingHoursRowSchema } from './common.schema'

export const venueSchema = z.strictObject({
  ...baseDocShape,
  nameHebrew: nameField,
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
  contacts: z.array(z.strictObject({
    name: z.string(),
    phone: z.string().optional(),
    role: z.string().optional()
  })).optional(),
  operatingHours: z.array(operatingHoursRowSchema).optional(),
  active: z.boolean().optional(),
  photoUrl: z.string().optional(),
  _masterId: z.string().optional(),
  _userModified: z.boolean().optional()
})
