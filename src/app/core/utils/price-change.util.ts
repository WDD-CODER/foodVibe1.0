/** Plan 628: the change from the old price to the new one in percent, two decimals (the rule of `priceHistory.changePct`). */
export function priceChangePct(oldPrice: number | null, newPrice: number | null): number | null {
  if (oldPrice === null || newPrice === null || oldPrice <= 0) return null
  return Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100
}
