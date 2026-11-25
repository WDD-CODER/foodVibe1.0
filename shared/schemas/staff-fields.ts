/**
 * Which top-level fields of an entity a staff member may read. The server trims every other
 * field (base fields stay) from staff reads of a type listed here; types not listed are untouched.
 */
export const STAFF_READ_FIELDS: Record<string, readonly string[]> = {
  clients: ['name', 'phone', 'tags', 'kinds'],
  // Plan 615 (C-REGISTRY): staff see an invoice's header only, and never a diagnosis's selling prices.
  invoices: ['supplierName', 'invoiceDate', 'invoiceNumber'],
  diagnoses: ['name', 'status'],
  // Plan 724: staff read base fields only (no names, prices, counts or costs).
  menuDishes: [],
  dishSalesMonths: [],
  dishSalesAliases: []
}
