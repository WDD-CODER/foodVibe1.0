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
  updatedAt?: string
}