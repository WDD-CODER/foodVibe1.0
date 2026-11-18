import { z } from 'zod'

/** Plan 626 (C-INVREAD) — request and model-answer shapes of POST /api/v1/ai/invoices/read. */
export const INVOICE_FILE_MAX_BASE64 = 1_800_000
export const INVOICE_FILE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const

export const invoiceReadRequestSchema = z.object({
  fileBase64: z.string().min(1).max(INVOICE_FILE_MAX_BASE64),
  mimeType: z.enum(INVOICE_FILE_MIME_TYPES),
  knownCategories: z.array(z.string().max(80)).max(200).optional(),
  model: z.string().optional()
})

const printedText = z.union([z.string(), z.number()]).nullable().optional()
const printedNumber = z.union([z.number(), z.string()]).nullable().optional()

/** The structure the model's answer must have: loose on values, strict on shape. */
export const invoiceReadModelSchema = z.object({
  header: z.object({
    supplierName: printedText,
    supplierTaxId: printedText,
    supplierPhone: printedText,
    invoiceNumber: printedText,
    invoiceDate: printedText,
    vatIncluded: z.boolean().nullable().optional()
  }).nullable().optional(),
  rows: z.array(z.object({
    name: z.string().nullable().optional(),
    quantity: printedNumber,
    unitPrice: printedNumber,
    lineTotal: printedNumber,
    unit: z.string().nullable().optional(),
    category: z.string().nullable().optional()
  })).max(1000)
})

export interface InvoiceReadHeader {
  supplierName?: string
  supplierTaxId?: string
  supplierPhone?: string
  invoiceNumber?: string
  invoiceDate?: string
  vatIncluded?: boolean
}

export interface InvoiceReadSupplier {
  supplierId?: string
  matchedBy?: 'taxId' | 'phone' | 'name'
  supplierKey: string
}

export interface InvoicePrintedLine {
  name: string
  quantity: number | null
  unit: string | null
  unitPrice: number | null
  lineTotal: number | null
}

export interface InvoiceReadResponse {
  header: InvoiceReadHeader
  supplier: InvoiceReadSupplier
  rows: Array<Record<string, unknown>>
  printed: InvoicePrintedLine[]
  truncated: boolean
  draftId: string | null
  fileId: string | null
}

export type InvoiceReadRequest = z.infer<typeof invoiceReadRequestSchema>
