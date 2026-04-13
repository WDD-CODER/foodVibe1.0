export interface PurchaseOption_ {
  unit_symbol_: string;
  conversion_rate_: number;
  price_override_?: number;
  uom?:string
}

/** One supplier's offering of this product — price per base_unit. */
export interface ProductSource {
  supplierId: string;
  price: number;
  addedBy?: string;
  addedAt?: number;
}

export interface Product {
  _id: string;
  name_hebrew: string;
  base_unit_: string;
  sources_: ProductSource[];
  purchase_options_: PurchaseOption_[];
  categories_: string[];
  yield_factor_: number;
  allergens_: string[];
  min_stock_level_: number;
  expiry_days_default_: number;
  /** Epoch ms when the product was first added (set on create, preserved on update) */
  addedAt_?: number;
  updatedAt?: string;
  /** English translation of the product name — populated by catalog seeder */
  name_english?: string;
  /** True for products inserted by the catalog seeder pipeline */
  seeded_?: boolean;
  /** Provenance of allergen data: "off" = Open Food Facts, "llm" = AI-inferred */
  allergen_source_?: 'off' | 'llm';

  /** @deprecated Migration shim — use sources_ */
  buy_price_global_?: number;
  /** @deprecated Migration shim — use sources_ */
  supplierIds_?: string[];
}