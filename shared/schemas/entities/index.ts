import type { z } from 'zod'
import { equipmentSchema } from './equipment.schema'
import { menuEventSchema } from './menu-event.schema'
import { productSchema } from './product.schema'
import { recipeSchema } from './recipe.schema'
import { supplierSchema } from './supplier.schema'
import { venueSchema } from './venue.schema'

export * from './common.schema'
export { equipmentSchema, menuEventSchema, productSchema, recipeSchema, supplierSchema, venueSchema }

/** Collections that have a v2 schema in Phase 2a. Registries/trash/logs follow in later phases. */
export const SCHEMA_BY_COLLECTION = {
  PRODUCT_LIST: productSchema,
  RECIPE_LIST: recipeSchema,
  DISH_LIST: recipeSchema,
  EQUIPMENT_LIST: equipmentSchema,
  KITCHEN_SUPPLIERS: supplierSchema,
  VENUE_PROFILES: venueSchema,
  MENU_EVENT_LIST: menuEventSchema
} as const

export type SchemaCollection = keyof typeof SCHEMA_BY_COLLECTION
export type Product = z.infer<typeof productSchema>
export type Recipe = z.infer<typeof recipeSchema>
export type Equipment = z.infer<typeof equipmentSchema>
export type Supplier = z.infer<typeof supplierSchema>
export type Venue = z.infer<typeof venueSchema>
export type MenuEvent = z.infer<typeof menuEventSchema>
