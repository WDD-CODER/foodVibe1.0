/** Normalizes unit keys for conversion lookup (e.g. 'gr' -> 'gram'). Includes Hebrew display names. */
export const UNIT_ALIASES: Record<string, string> = {
  gr: 'gram',
  grams: 'gram',
  g: 'gram',
  kg: 'kg',
  'ק"ג': 'kg',
  liter: 'liter',
  l: 'liter',
  ml: 'ml',
  unit: 'unit'
}

/** Units that have a direct conversion to grams in the registry (mass units). */
export const MASS_UNITS = new Set(['gram', 'gr', 'grams', 'g', 'kg'])

/** Units that have a direct conversion to milliliters in the registry (volume units). */
export const VOLUME_UNITS = new Set(['liter', 'l', 'ml', 'cup', 'tablespoon', 'teaspoon'])

/** Units that can be used for weight or volume total (registry fallback). */
export const VOLUME_OR_WEIGHT_KEYS = new Set(['gram', 'gr', 'grams', 'g', 'kg', 'liter', 'l', 'ml'])

export const MAX_RECURSION_DEPTH = 5
