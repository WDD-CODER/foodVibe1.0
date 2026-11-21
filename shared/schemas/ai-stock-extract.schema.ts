import { z } from 'zod'

/** Plan 637 (C-STOCK) — stock count by voice or text: the request, the model's loose answer and the response. */
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
 * The model's raw answer, loose on purpose: a missing `spoken` reads as '', a missing `quantity` or `unit` as null,
 * so one odd entry never refuses the whole answer. Plan 648: the model sees no product list — `unit` is a name from
 * the unit list, and the server matches `spoken` to the business's products.
 */
const looseNumber = z.preprocess((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null), z.number().nullable())
const looseText = z.preprocess((v) => (typeof v === 'string' ? v : ''), z.string())
const looseUnit = z.preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : null), z.string().nullable())

export const stockExtractModelAnswerSchema = z.object({
  lines: z.array(
    z.object({
      spoken: looseText,
      quantity: looseNumber,
      unit: looseUnit
    })
  )
})

/** Plan 651: `unit` is null with `unitNeedsFix` when the spoken unit is not one the product has (`spokenUnit` keeps the word). */
export type StockExtractLine = {
  productId: string
  quantity: number
  unit: string | null
  unitNeedsFix?: boolean
  /** Plan 654: no unit was said or found in the text — the person picks one; never the base unit. */
  unitMissing?: boolean
  spokenUnit?: string
}
/** Plan 650: `choose` = several products fit (candidates best first); `unmatched` = none fit (candidates are the nearest). */
export type StockExtractStatus = 'choose' | 'unmatched'
/** `candidates`: up to 5 products a spoken name could mean. */
export type StockExtractCandidate = { productId: string; nameHebrew: string }
export type StockExtractUnmatched = {
  spoken: string
  status?: StockExtractStatus
  quantity?: number
  unit?: string
  /** Plan 651: a unit word that is not on the unit list, kept as said. */
  spokenUnit?: string
  candidates?: StockExtractCandidate[]
}
export type StockExtractResponse = {
  draftId: string | null
  lines: StockExtractLine[]
  unmatched: StockExtractUnmatched[]
}
