/**
 * The one rule for "is this the same product name": trim, single spaces, lower-case Latin.
 * Same rule as `normalizeProductName` in `server/utils/price-list-import.js`, `nameHebrewNormalized`
 * written by the seed, and `duplicateNameValidator`. The price-list import (plan 432) matches by it.
 */
export function normalizeProductName(name: string | null | undefined): string {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}
