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
    'supplierMoves',
  ],
  recipes: ['ingredients[].supplierId'],
  dishes: ['ingredients[].supplierId'],
  businesses: ['settings', 'baseline'],
  // Plan 615 (C-REGISTRY): an invoice's prices.
  invoices: ['lines[].unitPrice', 'lines[].lineTotal', 'lines[].price'],
  // Plan 724: dish analysis prices, costs and net sales.
  menuDishes: ['priceWithVat', 'typedCost'],
  dishSalesMonths: ['rows[].netSales', 'frozen'],
  // Plan 727: a month's targets, VAT copy and revenue.
  monthPlans: ['targets', 'revenue', 'vatRatePct', 'fixed', 'labour', 'purchases'],
}
