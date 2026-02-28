import { Ingredient } from './ingredient.model';
import type { DishLogistics } from './logistics.model';

export interface RecipeStep {
  order_: number;
  instruction_: string;
  labor_time_minutes_: number;
  video_url_?: string;
}

export interface MiseItem {
  item_name: string;
  unit: string;
  quantity?: number;
  category_name?: string;
}

export interface MiseCategory {
  category_name: string;
  items: MiseItem[];
}

/** Flat prep item for dish workflow (prep list) */
export interface FlatPrepItem {
  preparation_name: string;
  category_name: string;
  quantity: number;
  unit: string;
}

export interface PrepCategory {
  category_name: string;
  items: MiseItem[];
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
  /** 'dish' | 'preparation' - determines storage (DISH_LIST vs RECIPE_LIST) */
  recipe_type_?: 'dish' | 'preparation';
  version_history_?: string[];
  /** For recipe_type === 'dish': legacy nested structure (backward compat) */
  mise_categories_?: MiseCategory[];
  /** For recipe_type === 'dish': flat prep list */
  prep_items_?: FlatPrepItem[];
  /** For recipe_type === 'dish': grouped by category (backward compat) */
  prep_categories_?: PrepCategory[];
  /** Baseline equipment + service-style overrides (contextual logistics) */
  logistics_?: DishLogistics;
  /** User-chosen labels (keys from label registry) */
  labels_?: string[];
  /** Auto-applied labels from ingredient categories/allergens (computed on save) */
  autoLabels_?: string[];
}