import { Ingredient } from './ingredient.model'
import type { DishLogistics } from './logistics.model'

export interface RecipeStep {
  order: number
  instruction: string
  laborTimeMinutes: number
  /** Cook timer duration in seconds (session countdown). Separate from laborTimeMinutes which is admin/analytics. */
  cookingTimeSecs?: number
  videoUrl?: string
}

export interface MiseItem {
  itemName: string
  unit: string
  quantity?: number
  categoryName?: string
}

/** Flat prep item for dish workflow (prep list) */
export interface FlatPrepItem {
  preparationName: string
  categoryName: string
  /** When set, global (registry) category; when absent, treat as equal to categoryName (backward compatible). */
  mainCategoryName?: string
  quantity: number
  unit: string
}

export interface PrepCategory {
  categoryName: string
  items: MiseItem[]
}

export interface Recipe {
  _id: string
  nameHebrew: string
  ingredients: Ingredient[]
  steps: RecipeStep[]
  yieldAmount: number
  yieldUnit: string
  /** Equivalent yields per unit for the same batch (e.g. [{ amount: 1, unit: 'kg' }, { amount: 4, unit: 'unit' }]). Used in cook-view for recipe-specific unit options and conversion. */
  yieldConversions?: { amount: number; unit: string }[]
  defaultStation: string
  isApproved: boolean
  /** 'dish' | 'preparation' - determines storage (dishes vs recipes) */
  recipeType?: 'dish' | 'preparation'
  /** Source master doc's _id, if this recipe was cloned from one (see server clone-master/sync-master). */
  _masterId?: string
  versionHistory?: string[]
  /** For recipe_type === 'dish': flat prep list */
  prepItems?: FlatPrepItem[]
  /** For recipe_type === 'dish': grouped by category */
  prepCategories?: PrepCategory[]
  /** Baseline equipment + service-style overrides (contextual logistics) */
  logistics?: DishLogistics
  /** User-chosen labels (keys from label registry) */
  labels?: string[]
  /** Single-select course/category (key from course registry) */
  course?: string
  /** Auto-applied labels from ingredient categories/allergens (computed on save) */
  autoLabels?: string[]
  /** Epoch ms when the recipe/dish was first added (set on create, preserved on update) */
  createdAt?: number
  /** Epoch ms when the recipe/dish was last updated (set on create and on every update) */
  updatedAt?: number
  /** _id of the user who created this recipe/dish */
  createdBy?: string
  /** List of user _ids who have hidden this recipe from their view (soft-delete per user) */
  hiddenBy?: string[]
  /** List of user _ids who have favorited this recipe/dish */
  favoritedBy?: string[]
  /** Cloudinary URL of the recipe photo, set by user upload in recipe-builder (see cloudinary.service.ts). */
  imageUrl?: string
  /** User-assigned rating (1–5 stars). Optional; absent means unrated. */
  rating?: number
  /** True once user has explicitly confirmed the manual yield amount as neto (not total ingredients weight). */
  netoConfirmed?: boolean
}
