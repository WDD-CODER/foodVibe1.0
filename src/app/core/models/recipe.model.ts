import { KitchenUnit } from './units.enum';

export interface Ingredient {
  _id: string;
  item_type_: 'product' | 'recipe';
  reference_id_: string;
  amount_: number;
  unit_: KitchenUnit;
  note_?: string;
}

export interface RecipeStep {
  order_: number;
  instruction_: string;
  labor_time_minutes_: number;
  video_url_?: string;
}

export interface Recipe {
  _id: string;
  name_hebrew: string;
  ingredients_: Ingredient[];
  steps_: RecipeStep[];
  yield_amount_: number;
  yield_unit_: KitchenUnit;
  default_station_: string;
  is_approved_: boolean;
  version_history_?: string[];
}