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
  _masterId: z.string().optional(),
  _userModified: z.boolean().optional(),
  _userDeleted: z.boolean().optional()
})
