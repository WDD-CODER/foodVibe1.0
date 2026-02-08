import { KitchenUnit } from './units.enum';

export interface Product {
  _id: string;
  name_hebrew: string; 
  category_: string;
  supplierId_: string;
  
  // Pricing & Conversion Logic
  purchase_price_: number;     
  purchase_unit_: KitchenUnit; 
  base_unit_: KitchenUnit;   
  conversion_factor_: number;  
  yield_factor_: number;      
  
  // Metadata & Health
  is_dairy_: boolean;          
  allergens_: string[];        
  min_stock_level_: number;    
  expiry_days_default_: number; 
}