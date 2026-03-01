import type { EventLogistics } from './logistics.model';

/** Dynamic menu types from registry; legacy values buffet_family | plated_course | cocktail_passed still drive derivePortions logic. */
export type ServingType = string;

export type DishFieldKey =
  | 'sell_price'
  | 'food_cost_money'
  | 'food_cost_pct'
  | 'serving_portions'
  | 'serving_portions_pct';

export const ALL_DISH_FIELDS: { key: DishFieldKey; labelKey: string; inputType: 'number' | 'select' }[] = [
  { key: 'sell_price', labelKey: 'dish_sell_price', inputType: 'number' },
  { key: 'food_cost_money', labelKey: 'dish_food_cost_money', inputType: 'number' },
  { key: 'food_cost_pct', labelKey: 'dish_food_cost_pct', inputType: 'number' },
  { key: 'serving_portions', labelKey: 'dish_serving_portions', inputType: 'number' },
  { key: 'serving_portions_pct', labelKey: 'dish_serving_portions_pct', inputType: 'number' },
];

export const DEFAULT_DISH_FIELDS: DishFieldKey[] = [
  'sell_price',
  'food_cost_money',
  'serving_portions',
];

export interface MenuTypeDefinition {
  key: string;
  fields: DishFieldKey[];
}

export interface MenuFinancialTargets {
  target_food_cost_pct_: number;
  target_revenue_per_guest_?: number;
}

export interface MenuPerformanceTags {
  food_cost_pct_: number;
  primary_serving_style_: ServingType;
}

export interface MenuItemSelection {
  recipe_id_: string;
  recipe_type_: 'dish' | 'preparation';
  predicted_take_rate_: number;
  derived_portions_: number;
  sell_price_?: number;
  food_cost_override_?: number;
  serving_portions_?: number;
}

export interface MenuSection {
  _id: string;
  name_: string;
  sort_order_: number;
  items_: MenuItemSelection[];
}

export interface MenuEvent {
  _id: string;
  name_: string;
  event_type_: string;
  event_date_?: string;
  serving_type_: ServingType;
  guest_count_: number;
  pieces_per_person_?: number;
  sections_: MenuSection[];
  financial_targets_?: MenuFinancialTargets;
  performance_tags_?: MenuPerformanceTags;
  cuisine_tags_?: string[];
  created_at_?: number;
  created_from_template_id_?: string;
  /** Resolved equipment + venue context (contextual logistics) */
  logistics_?: EventLogistics;
}
