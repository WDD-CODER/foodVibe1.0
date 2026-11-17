import { z } from 'zod'

/** Plan 615 (C-INVOICE): one row per created or changed price. Server-only collection. */
export const PRICE_HISTORY_SOURCES = ['invoice', 'import'] as const

export const priceHistorySchema = z.strictObject({
  _id: z.string().min(1),
  businessId: z.string().min(1),
  productId: z.string().min(1),
  /** '' = no supplier. */
  supplierId: z.string(),
  price: z.number().min(0),
  prevPrice: z.number().min(0).optional(),
  changePct: z.number().optional(),
  at: z.number(),
  by: z.string().min(1),
  source: z.enum(PRICE_HISTORY_SOURCES),
  invoiceId: z.string().optional()
})
export type PriceHistory = z.infer<typeof priceHistorySchema>
