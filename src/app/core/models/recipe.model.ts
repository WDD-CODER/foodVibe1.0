import { Ingredient } from './ingredient.model';

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
  yield_unit_: string;
  default_station_: string;
  is_approved_: boolean;
  version_history_?: string[];
}