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

/** `i` = position in the request's `names`; `product` = position in `products`, or null when no product fits. */
export const productNameMatchResponseSchema = z.object({
  matches: z.array(
    z.object({
      i: z.number().int().min(0),
      product: z.number().int().min(0).nullable()
    })
  )
})

export type ProductNameMatchRequest = z.infer<typeof productNameMatchRequestSchema>
export type ProductNameMatchResponse = z.infer<typeof productNameMatchResponseSchema>
