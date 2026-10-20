import type { MenuEvent } from '@models/menu-event.model'
import type { Product } from '@models/product.model'
import type { Recipe } from '@models/recipe.model'

/** Unit rates (gram/ml equivalents) the engine converts with. Plan 433 extension of C-ENGINE. */
export interface UnitConversion {
  getConversion(key: string): number
  has(key: string): boolean
}

/** Item key is `${section._id}|${itemIndex}`. */
export interface EventPlanInput {
  event: MenuEvent
  portionsByItem: Map<string, number>
  products: Product[]
  /** Recipes and dishes together. */
  recipes: Recipe[]
  units: UnitConversion
}

export type RawLineStatus = 'ok' | 'unlinked' | 'deleted' | 'no_conversion'

export interface RawLine {
  productId: string | null
  name: string
  /** The product's base unit (the ingredient's own unit on an unlinked, deleted or no_conversion line). */
  unit: string
  netQty: number
  buyQty: number
  purchase?: { unit: string; count: number }
  supplierId: string | null
  lineCost: number | null
  dishIds: string[]
  status: RawLineStatus
}

export interface PrepLine {
  prepId: string
  name: string
  qty: number
  unit: string
  dishId: string
  /** The serving dish's default station, trimmed; '' when none (consumers show "general"). */
  station: string
  /** A mise item's category name, a linked prep's course, else ''. */
  category: string
  /** 'prep' = linked sub-recipe; 'mise' = a dish's own prepItems / prepCategories row (prepId `mise:<name>`). */
  source: 'prep' | 'mise'
  /** The dish ingredient row's note. */
  note?: string
}

export interface DishCost {
  itemKey: string
  recipeId: string
  cost: number
  partial: boolean
}

export interface MissingItem {
  kind: 'unpriced' | 'unlinked' | 'deleted'
  productId?: string
  name: string
  recipeIds: string[]
}

export interface EngineError {
  kind: 'cycle' | 'no_yield' | 'no_conversion' | 'no_ingredients'
  name: string
}

export interface EventPlan {
  rawLines: RawLine[]
  prepLines: PrepLine[]
  dishCosts: DishCost[]
  eventFoodCost: number
  partial: boolean
  missing: MissingItem[]
  errors: EngineError[]
}
