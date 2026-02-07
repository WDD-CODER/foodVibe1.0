import { KitchenUnit } from './units.enum';

export interface Product {
  _id: string;
  name_hebrew: string; 
  category_: string;
  supplierId_: string;
  
  // Pricing & Conversion Logic
  purchase_price_: number;     // The price paid to the supplier [cite: 43]
  purchase_unit_: KitchenUnit; // e.g., BUCKET [cite: 62]
  base_unit_: KitchenUnit;     // e.g., GRAM [cite: 39]
  conversion_factor_: number;  // e.g., 5000 (Grams in a Bucket) [cite: 40]
  yield_factor_: number;       // Usable percentage (e.g., 0.85 for 85%) [cite: 41, 275]
  
  // Metadata & Health
  is_dairy_: boolean;          // [cite: 216]
  allergens_: string[];        // [cite: 217]
  min_stock_level_: number;    // Threshold for low-stock alerts [cite: 32, 305]
  expiry_days_default_: number; // [cite: 244]
}