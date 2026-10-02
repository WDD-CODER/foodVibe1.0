export interface NutritionPer100g {
  energyKcal?: number
  proteinG?: number
  carbsG?: number
  sugarsG?: number
  fatG?: number
  fiberG?: number
  sodiumG?: number
  cholesterolMg?: number
}

export interface PurchaseOption_ {
  unitSymbol: string
  conversionRate: number
  priceOverride?: number
  uom?: string
}

/** One supplier's offering of this product — price per base_unit. */
export interface ProductSource {
  supplierId: string
  price: number
  addedBy?: string
  addedAt?: number
}

export interface Product {
  _id: string
  nameHebrew: string
  baseUnit: string
  sources: ProductSource[]
  purchaseOptions: PurchaseOption_[]
  categories: string[]
  yieldFactor: number
  allergens: string[]
  minStockLevel: number
  expiryDaysDefault: number
  /** Epoch ms when the product was first added (set on create, preserved on update) */
  createdAt?: number
  updatedAt?: number
  /** English translation of the product name — populated by catalog seeder */
  nameEnglish?: string
  /** True for products inserted by the catalog seeder pipeline */
  seeded?: boolean
  /** Provenance of allergen data: "off" = Open Food Facts, "llm" = AI-inferred */
  allergenSource?: 'off' | 'llm'

  /** @deprecated Migration shim — use sources */
  buy_price_global_?: number
  /** @deprecated Migration shim — use sources */
  supplierIds_?: string[]
  /** Nutritional data per 100g — populated by catalog seeder (Open Food Facts) */
  nutritionPer100g?: NutritionPer100g
  /** Set at signup-time clone (points to __master__'s original _id) or after a manual
   *  push-to-master (Plan 322). Absent for a product that's never been linked to master. */
  _masterId?: string
  /** Set to false right after a save that matches master (so sync-master's Rule 2 can still
   *  manage it); true once the user's own edit diverges from master. */
  _userModified?: boolean
}
