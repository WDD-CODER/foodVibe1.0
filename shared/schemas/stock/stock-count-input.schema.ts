import { z } from 'zod'

/** Plan 635 (C-STOCK): what a member may send for a stock count. The server owns `baseQuantity`, `status`, `finalAt`, `finalBy`. */
export const stockCountInputSchema = z.strictObject({
  countedAt: z.number().int().positive(),
  source: z.enum(['manual', 'voice', 'text']).optional(),
  draftIds: z.array(z.string().min(1).max(64)).max(20).optional(),
  note: z.string().max(500).optional(),
  lines: z.array(z.strictObject({
    productId: z.string().min(1),
    quantity: z.number().min(0).max(1_000_000),
    unit: z.string().min(1).max(40)
  })).max(2000)
})
export type StockCountInput = z.infer<typeof stockCountInputSchema>

export type OnHandRow = { productId: string; baseQuantity: number; countedAt: number }
