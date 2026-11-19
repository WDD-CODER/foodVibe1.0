import { z } from 'zod'
import { baseDocShape } from '../base.schema'

/** Plan 615 (C-INVOICE): an invoice the owner approved. Written only by `product-import/apply` (plan 625). */
export const INVOICE_SOURCES = ['photo', 'pdf', 'text'] as const
export const INVOICE_LINE_RESULTS = ['created', 'updated', 'same_price', 'no_price', 'invalid', 'duplicate'] as const
export const INVOICE_LINES_MAX = 200

export const invoiceLineSchema = z.strictObject({
  printedName: z.string().min(1).max(200),
  quantity: z.number().optional(),
  unit: z.string().max(40).optional(),
  unitPrice: z.number().optional(),
  lineTotal: z.number().optional(),
  price: z.number().nullable(),
  needsReview: z.boolean(),
  productId: z.string().optional(),
  /** Plan 641: the supplier whose price this line changed (the target supplier when the owner chose to update it). */
  supplierId: z.string().optional(),
  result: z.enum(INVOICE_LINE_RESULTS)
})

export const invoiceSchema = z.strictObject({
  ...baseDocShape,
  supplierId: z.string().optional(),
  supplierName: z.string().min(1).max(200),
  supplierTaxId: z.string().regex(/^\d{9}$/).optional(),
  invoiceNumber: z.string().max(40).optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vatIncluded: z.boolean().optional(),
  source: z.enum(INVOICE_SOURCES),
  fileId: z.string().optional(),
  draftId: z.string().optional(),
  supplierKey: z.string().max(260).optional(),
  lines: z.array(invoiceLineSchema).max(INVOICE_LINES_MAX)
})
export type Invoice = z.infer<typeof invoiceSchema>

/** Plan 625: `supplierKey` format — a tax id, a phone or a normalised name (plan 627 shares it between businesses). */
export const SUPPLIER_KEY_PATTERN = /^(tax:\d{9}|phone:\d{9}|name:.{1,200})$/

/** Plan 625: the optional `invoice` header of `POST /api/v1/product-import/apply`. `row` = index into `rows`. */
export const invoiceApplyInputSchema = z.strictObject({
  supplierName: z.string().trim().min(1).max(200),
  supplierTaxId: z.string().regex(/^\d{9}$/).optional(),
  invoiceNumber: z.string().trim().min(1).max(40).optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vatIncluded: z.boolean().optional(),
  source: z.enum(INVOICE_SOURCES),
  fileId: z.string().min(1).max(64).optional(),
  draftId: z.string().min(1).max(64).optional(),
  supplierKey: z.string().regex(SUPPLIER_KEY_PATTERN).optional(),
  lines: z.array(z.strictObject({
    printedName: z.string().trim().min(1).max(200),
    quantity: z.number().gt(0).optional(),
    unit: z.string().max(40).optional(),
    unitPrice: z.number().min(0).optional(),
    lineTotal: z.number().min(0).optional(),
    needsReview: z.boolean(),
    row: z.number().int().min(0)
  })).min(1).max(INVOICE_LINES_MAX)
})
export type InvoiceApplyInput = z.infer<typeof invoiceApplyInputSchema>
