import { z } from 'zod'

/** Plan 615 (C-ALIAS): printed invoice names linked to products. Server-only collection. No price, quantity or date of purchase. */
export const ownInvoiceAliasSchema = z.strictObject({
  _id: z.string().min(1),
  businessId: z.string().min(1).refine(id => id !== '__master__', { message: 'own alias' }),
  supplierKey: z.string().max(260),
  nameKey: z.string().max(200),
  printedName: z.string().min(1).max(200),
  productId: z.string().min(1),
  unit: z.string().max(40).optional(),
  packQty: z.number().gt(0).optional(),
  hits: z.number().int().min(1),
  lastAt: z.number()
})

export const sharedInvoiceAliasSchema = z.strictObject({
  _id: z.string().min(1),
  businessId: z.literal('__master__'),
  supplierKey: z.string().max(260),
  nameKey: z.string().max(200),
  printedName: z.string().min(1).max(200),
  masterProductId: z.string().min(1),
  hits: z.number().int().min(1),
  contributors: z.array(z.string()).max(200),
  lastAt: z.number()
})

export const invoiceAliasSchema = z.union([ownInvoiceAliasSchema, sharedInvoiceAliasSchema])
export type InvoiceAlias = z.infer<typeof invoiceAliasSchema>
