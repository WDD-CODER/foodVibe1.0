import type { Product } from '@models/product.model'
import { unitOptionsFor } from 'src/app/core/utils/stock-count.util'

/** Plan 653: spoken unit words (Hebrew) → the unit key they mean; the same table the server helper uses. */
const UNIT_WORDS: Record<string, string> = {
  קילו: 'kg',
  קילוגרם: 'kg',
  'ק"ג': 'kg',
  קג: 'kg',
  גרם: 'gram',
  גר: 'gram',
  ליטר: 'liter',
  מיליליטר: 'ml',
  מל: 'ml',
  יחידה: 'unit',
  יחידות: 'unit'
}

const foldWord = (word: string): string => (word.length > 3 ? word.replace(/(ות|ים|ה)$/, '') : word)

const unitKey = (raw: string): string => {
  const t = raw.trim().toLowerCase()
  return UNIT_WORDS[t] ?? UNIT_WORDS[foldWord(t)] ?? t
}

const sameUnit = (a: string, b: string): boolean =>
  unitKey(a) === unitKey(b) || foldWord(unitKey(a)) === foldWord(unitKey(b))

/** Plan 654: the base unit counts things one by one (יחידה) — the only base unit offered first when the person picks. */
export const COUNT_UNIT = 'unit'

/**
 * Plan 653/654: the unit a picked product really has for what was said — the same rule as an automatic match.
 * A said unit the product has (plural forms too) → that unit; otherwise `null`. Plan 654: no unit said → `null`
 * too, never the base unit: the caller tells «no unit said» (the row asks which unit) from «a unit the product
 * lacks» (the row shows the unit note) by whether `said` is empty.
 */
export function unitForSpoken(
  said: string | undefined,
  product: Pick<Product, 'baseUnit' | 'purchaseOptions'>
): string | null {
  if (!said) return null
  const own = unitOptionsFor(product)
  return own.find((u) => sameUnit(u, said)) ?? null
}

/** Plan 654: the product's own units as the choice for a row with no unit: a count base unit first, the rest as listed. */
export function unitChoicesFor(product: Pick<Product, 'baseUnit' | 'purchaseOptions'>): string[] {
  const own = unitOptionsFor(product)
  if (product.baseUnit === COUNT_UNIT) return own
  return [...own.filter((u) => u !== product.baseUnit), product.baseUnit]
}
