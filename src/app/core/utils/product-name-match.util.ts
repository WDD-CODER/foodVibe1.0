import { normalizeHebrew } from './recipe-match.util'

/** How a name matched: equal after normalising, or equal after folding plural and spelling variants. */
export type ProductNameMatch<T> =
  { kind: 'exact'; product: T } | { kind: 'variant'; product: T } | { kind: 'ambiguous'; candidates: T[] }

const FINAL_LETTERS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' }
const PLURAL_ENDINGS = ['ים', 'ות']
const MIN_STEM_LENGTH = 3

const foldFinals = (s: string): string => s.replace(/[ךםןףץ]/g, (c) => FINAL_LETTERS[c])

/** Drops the vowel letters י and ו (spelling variants) while at least two letters remain. */
function dropVowelLetters(key: string): string {
  const dropped = key.replace(/[יו]/g, '')
  return dropped.length >= 2 ? dropped : key
}

/**
 * The comparison keys of one word: a plural ending (ים / ות on a stem of 3+ letters) gives the stem and
 * stem + «ה»; any other word gives itself. Final letters are folded and י / ו dropped in every key.
 */
export function foldProductWord(word: string): string[] {
  const ending = PLURAL_ENDINGS.find((e) => word.endsWith(e))
  const stem = ending ? word.slice(0, -ending.length) : word
  const raw = ending && stem.length >= MIN_STEM_LENGTH ? [stem, stem + 'ה'] : [word]
  return [...new Set(raw.map((k) => dropVowelLetters(foldFinals(k))))]
}

/** Keys per word of a whole name (niqqud, punctuation, case and spacing removed). */
export function foldProductName(name: string): string[][] {
  const normalized = normalizeHebrew(name ?? '')
  return normalized ? normalized.split(' ').map(foldProductWord) : []
}

function sameFolded(a: string[][], b: string[][]): boolean {
  return a.length > 0 && a.length === b.length && a.every((keys, i) => keys.some((k) => b[i].includes(k)))
}

/**
 * Finds the product a typed or pasted name means. Tier 1 `exact`: equal after `normalizeHebrew`.
 * Tier 2 `variant`: equal after plural / spelling folding, only when exactly one product fits
 * two fits are `ambiguous` (never picked silently). Null when nothing fits.
 */
export function matchProductName<T extends { nameHebrew: string }>(
  name: string,
  products: readonly T[]
): ProductNameMatch<T> | null {
  const query = normalizeHebrew(name ?? '')
  if (!query) return null
  const exact = products.find((p) => normalizeHebrew(p.nameHebrew ?? '') === query)
  if (exact) return { kind: 'exact', product: exact }
  const folded = foldProductName(query)
  const candidates = products.filter((p) => sameFolded(folded, foldProductName(p.nameHebrew)))
  if (candidates.length === 1) return { kind: 'variant', product: candidates[0] }
  if (candidates.length > 1) return { kind: 'ambiguous', candidates }
  return null
}
