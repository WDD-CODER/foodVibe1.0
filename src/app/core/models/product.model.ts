export interface PurchaseOption_ {
  unit_symbol_: string;
  conversion_rate_: number;
  price_override_?: number;
  uom?:string
}

export interface Product {
  _id: string;
  name_hebrew: string;
  base_unit_: string;
  buy_price_global_: number;
  purchase_options_: PurchaseOption_[];
  categories_: string[];
  supplierIds_: string[];
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
}