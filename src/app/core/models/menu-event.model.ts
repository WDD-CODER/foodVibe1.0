import type { EventLogistics } from './logistics.model';

export type ServingType = 'buffet_family' | 'plated_course' | 'cocktail_passed';

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
