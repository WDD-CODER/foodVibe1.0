/** Plan 635: the unit constants live in the shared package (`@schemas/units/to-base`); re-exported here. */
export { UNIT_ALIASES, MASS_UNITS, VOLUME_UNITS } from '@schemas/units/to-base'

/** Units that can be used for weight or volume total (registry fallback). */
export const VOLUME_OR_WEIGHT_KEYS = new Set(['gram', 'gr', 'grams', 'g', 'kg', 'liter', 'l', 'ml'])

export const MAX_RECURSION_DEPTH = 5
