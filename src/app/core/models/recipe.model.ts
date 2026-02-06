import { KitchenUnit } from './units.enum';

export interface Ingredient {
  id: string;
  item_type_: 'product' | 'recipe'; // Defines if it's raw or a sub-recipe [cite: 77, 323]
  reference_id_: string;            // ID linking to Product or Recipe [cite: 20]
  amount_: number;                  // [cite: 96, 316]
  unit_: KitchenUnit;               // [cite: 316]
  note_?: string;                   // e.g., "Cut into 1cm cubes" [cite: 320]
}

export interface RecipeStep {
  order_: number;                   // [cite: 82]
  instruction_: string;             // [cite: 97, 328]
  labor_time_minutes_: number;      // Active work time [cite: 83, 329]
  video_url_?: string;              // Link for technique training [cite: 84, 159, 391]
}

export interface Recipe {
  id: string;
  name_hebrew: string;
  ingredients_: Ingredient[];       // Recursive ingredient list [cite: 13, 75, 276]
  steps_: RecipeStep[];             // Preparation steps [cite: 81, 326]
  yield_amount_: number;            // Final output quantity [cite: 73, 219]
  yield_unit_: KitchenUnit;         // Final output unit (e.g., LITER or UNITS) [cite: 219]
  default_station_: string;         // e.g., "Cold Station" [cite: 140, 312]
  
  // Governance
  is_approved_: boolean;            // Draft vs. Approved state [cite: 86, 198, 403]
  version_history_?: string[];      // Log of changes [cite: 87, 399]
}