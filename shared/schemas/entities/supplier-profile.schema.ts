import { z } from 'zod'

/** Plan 615 (C-ALIAS): what the platform learned about a supplier, by supplier key. Server-only, shared. */
export const supplierProfileSchema = z.strictObject({
  _id: z.string().min(1),
  names: z.array(z.string().min(1).max(200)).max(10),
  vatIncludedYes: z.number().int().min(0),
  vatIncludedNo: z.number().int().min(0),
  invoices: z.number().int().min(0),
  contributors: z.array(z.string()).max(200),
  lastAt: z.number()
})
export type SupplierProfile = z.infer<typeof supplierProfileSchema>
