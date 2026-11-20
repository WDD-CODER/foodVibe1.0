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

/**
 * Plan 653: the unit a picked product really has for what was said — the same rule as an automatic match.
 * No unit said → the base unit; a said unit the product has (plural forms too) → that unit; otherwise `null`
 * (the row is flagged and not counted until fixed). Never a silent default.
 */
export function unitForSpoken(
  said: string | undefined,
  product: Pick<Product, 'baseUnit' | 'purchaseOptions'>
): string | null {
  if (!said) return product.baseUnit
  const own = unitOptionsFor(product)
  return own.find((u) => sameUnit(u, said)) ?? null
}
