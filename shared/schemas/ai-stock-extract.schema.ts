import { z } from 'zod'

/** Plan 637 (C-STOCK) — stock count by voice or text: the request, the model's loose answer and the response. */
export const STOCK_EXTRACT_MAX_PRODUCTS = 800
export const STOCK_EXTRACT_MAX_TEXT = 20000

export const stockExtractRequestSchema = z.object({
  text: z.string().trim().min(1).max(STOCK_EXTRACT_MAX_TEXT),
  /** The recording the transcribe route stored, when there is one. */
  fileId: z.string().min(1).max(64).optional(),
  /** The existing "send again on another model" field every AI route reads. */
  model: z.string().optional()
})
export type StockExtractRequest = z.infer<typeof stockExtractRequestSchema>

/**
 * The model's raw answer, loose on purpose: a missing `spoken` reads as '', a missing `p`, `quantity` or `u` as null,
 * so one odd entry never refuses the whole answer. `p` = position in the product list, `u` = position in the unit list.
 */
const looseInt = z.preprocess((v) => (typeof v === 'number' && Number.isInteger(v) ? v : null), z.number().int().nullable())
const looseNumber = z.preprocess((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null), z.number().nullable())
const looseText = z.preprocess((v) => (typeof v === 'string' ? v : ''), z.string())

export const stockExtractModelAnswerSchema = z.object({
  lines: z.array(
    z.object({
      p: looseInt,
      spoken: looseText,
      quantity: looseNumber,
      u: looseInt
    })
  )
})

export type StockExtractLine = { productId: string; quantity: number; unit: string }
export type StockExtractUnmatched = { spoken: string; quantity?: number; unit?: string }
export type StockExtractResponse = {
  draftId: string | null
  lines: StockExtractLine[]
  unmatched: StockExtractUnmatched[]
}
