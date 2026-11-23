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
  /** Plan 373: links to tour videos (YouTube, Drive, WhatsApp, any URL) with the visit date (epoch ms) and a note. */
  videos: z.array(z.strictObject({
    url: z.string(),
    visitDate: z.number().optional(),
    note: z.string().optional()
  })).optional(),
  /** Plan 373: the spot saved with "use my current location"; accuracy in metres. Null clears it: the PUT only
   * $sets the keys it is sent, so the form sends `location: null` when the user removed the spot. */
  location: z.strictObject({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional()
  }).nullable().optional(),
  _masterId: z.string().optional(),
  _userModified: z.boolean().optional()
})
