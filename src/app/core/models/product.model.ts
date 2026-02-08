export interface PurchaseOption_ {
  unit_symbol_: string;
  conversion_rate_: number;
  price_override_?: number;
}

export interface Product {
  _id: string;
  name_hebrew: string;
  base_unit_: string;
  buy_price_global_: number;
  purchase_options_: PurchaseOption_[];
  category_: string;
  supplierId_: string;
  yield_factor_: number;
  allergens_: string[];
  is_dairy_: boolean;
  min_stock_level_: number;
  expiry_days_default_: number;
}