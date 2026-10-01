import { z } from 'zod'
import { baseDocShape } from '../base.schema'

export const supplierSchema = z.strictObject({
  ...baseDocShape,
  nameHebrew: z.string(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  deliveryDays: z.array(z.number()),
  minOrderMov: z.number(),
  leadTimeDays: z.number(),
  supplierLogoUrl: z.string().optional(),
  /** @deprecated legacy-import provenance */
  legacyImport: z.boolean().optional(),
  /** @deprecated legacy-import provenance */
  legacySupplierCode: z.number().optional(),
  masterId: z.string().optional(),
  userModified: z.boolean().optional(),
  userDeleted: z.boolean().optional()
})
