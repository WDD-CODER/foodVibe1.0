/**
 * Plan 427 (contract C-PERM): which fields of each entity hold money. Staff never change these
 * (`editMoney` is owner-only); a staff-created product is saved with them stripped.
 * Paths: `a`, `a.b`, `a[].b`, `a.b[].c`. Later plans that add a money field append it here.
 */
export const MONEY_FIELDS: Record<string, readonly string[]> = {
  products: ['sources[].price', 'purchaseOptions[].priceOverride'],
  menuEvents: [
    'pricePerGuest',
    'extraCosts',
    'targetsOverride',
    'deposit',
    'closing.suppliers[].actualPaid',
    'closing.actualExtraCosts',
    'closing.actualRevenue',
  ],
  businesses: ['settings', 'baseline'],
}
