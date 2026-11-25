/** Plan 724: a dish's selling price without VAT. One shared rule for the menu page, the month close and the analysis. */
export function netPriceOf(priceWithVat: number, vatRatePct: number, dealerType: 'murshe' | 'patur'): number {
  if (dealerType === 'patur') return priceWithVat
  return Math.round((priceWithVat / (1 + vatRatePct / 100)) * 100) / 100
}
