import { z } from 'zod'
import { baseDocShape } from '../base.schema'

/** Plan 615 (C-STOCK): a stock count. Read through the generic API, written only by its router. */
export const STOCK_COUNT_STATUSES = ['draft', 'final'] as const
export const STOCK_COUNT_SOURCES = ['manual', 'voice', 'text'] as const

export const stockCountSchema = z.strictObject({
  ...baseDocShape,
  countedAt: z.number(),
  status: z.enum(STOCK_COUNT_STATUSES),
  source: z.enum(STOCK_COUNT_SOURCES),
  draftIds: z.array(z.string()).max(20).optional(),
  note: z.string().max(500).optional(),
  lines: z.array(z.strictObject({
    productId: z.string().min(1),
    quantity: z.number().min(0),
    unit: z.string().min(1).max(40),
    baseQuantity: z.number().min(0)
  })).max(2000),
  finalAt: z.number().optional(),
  finalBy: z.string().optional()
})
export type StockCount = z.infer<typeof stockCountSchema>
