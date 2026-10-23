import { z } from 'zod'

/** Plan 463 — AI step that matches pasted ingredient names to existing products. Names and units only. */
export const PRODUCT_MATCH_MAX_NAMES = 200
export const PRODUCT_MATCH_MAX_PRODUCTS = 1000

const matchItemSchema = z.object({
  name: z.string().min(1).max(200),
  unit: z.string().max(40)
})

export const productNameMatchRequestSchema = z.object({
  names: z.array(matchItemSchema).min(1).max(PRODUCT_MATCH_MAX_NAMES),
  products: z.array(matchItemSchema).min(1).max(PRODUCT_MATCH_MAX_PRODUCTS),
  model: z.string().optional()
})

/** Plan 490 — the most product positions one name may list as `options`. */
export const PRODUCT_MATCH_MAX_OPTIONS = 5

/**
 * `i` = position in the request's `names`; `product` = position in `products`, or null when no product fits.
 * Plan 490: `options` = positions of the products that could be that name when the model cannot tell which
 * (only with `product: null`). Deliberately loose (no max / min): the same schema parses the model's raw answer,
 * and the server's cleaning step caps and range-checks so one bad list never rejects the whole answer.
 */
export const productNameMatchResponseSchema = z.object({
  matches: z.array(
    z.object({
      i: z.number().int().min(0),
      product: z.number().int().min(0).nullable(),
      options: z.array(z.number().int()).optional()
    })
  )
})

export type ProductNameMatchRequest = z.infer<typeof productNameMatchRequestSchema>
export type ProductNameMatchResponse = z.infer<typeof productNameMatchResponseSchema>
