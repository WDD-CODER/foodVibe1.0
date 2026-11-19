import { z } from 'zod'

/** Plan 633 (C-DIAG): request bodies of /api/v1/diag. */
const vatPct = z.number().min(0).max(100)

export const diagCreateInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  periodDays: z.number().int().min(30).max(365).optional(),
  pricesIncludeVat: z.boolean().optional(),
  vatPct: vatPct.optional()
})

export const diagMenuInputSchema = z.strictObject({
  menu: z.array(z.strictObject({ name: z.string().min(1).max(200), sellPrice: z.number().min(0), dishId: z.string().optional() })).max(300),
  draftId: z.string().optional(),
  pricesIncludeVat: z.boolean().optional(),
  vatPct: vatPct.optional()
})

export const diagInvoicesInputSchema = z.strictObject({ invoiceIds: z.array(z.string()).max(100) })

export const diagStatusInputSchema = z.strictObject({ status: z.enum(['open', 'done']) })
