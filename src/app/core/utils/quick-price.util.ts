import { Product } from '@models/product.model'

/**
 * The product with a base-unit price typed in place (plan 444): every supplier source still at 0 gets the price,
 * a source already above 0 is left alone, and a product with no source gets one with no supplier.
 */
export function withQuickPrice(product: Product, price: number): Product {
  const sources = product.sources ?? []
  if (!sources.length) return { ...product, sources: [{ supplierId: '', price }] }
  return { ...product, sources: sources.map((s) => (s.price > 0 ? s : { ...s, price })) }
}

/** A typed price is usable when it is above 0 and has at most 2 decimals. */
export function isValidQuickPrice(value: number | null): value is number {
  return value != null && Number.isFinite(value) && value > 0 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6
}
