import type { z } from 'zod'
import { bookingSchema } from './booking.schema'
import { clientSchema } from './client.schema'
import { equipmentSchema } from './equipment.schema'
import { frontDeskProfileSchema } from './front-desk-profile.schema'
import { menuEventSchema } from './menu-event.schema'
import { productSchema } from './product.schema'
import { recipeSchema } from './recipe.schema'
import { requestSchema } from './request.schema'
import { supplierSchema } from './supplier.schema'
import { taxonomyTermSchema } from './taxonomy-term.schema'
import { venueSchema } from './venue.schema'

export * from './booking.schema'
export * from './business.schema'
export * from './client.schema'
export * from './common.schema'
export * from './event-logistics'
export * from './event-stage'
export * from './front-desk-profile.schema'
export * from './request.schema'
export * from './taxonomy-term.schema'
export { clientSchema, equipmentSchema, menuEventSchema, productSchema, recipeSchema, supplierSchema, venueSchema }

/** v2 collection name -> schema (Plan 321 G2 names). Trash/logs follow in later phases. */
export const SCHEMA_BY_COLLECTION = {
  products: productSchema,
  recipes: recipeSchema,
  dishes: recipeSchema,
  suppliers: supplierSchema,
  equipment: equipmentSchema,
  venues: venueSchema,
  menuEvents: menuEventSchema,
  taxonomyTerms: taxonomyTermSchema,
  clients: clientSchema,
  frontDeskProfiles: frontDeskProfileSchema,
  requests: requestSchema,
  bookings: bookingSchema
} as const

export type SchemaCollection = keyof typeof SCHEMA_BY_COLLECTION
export type Product = z.infer<typeof productSchema>
export type Recipe = z.infer<typeof recipeSchema>
export type Equipment = z.infer<typeof equipmentSchema>
export type Supplier = z.infer<typeof supplierSchema>
export type Venue = z.infer<typeof venueSchema>
export type MenuEvent = z.infer<typeof menuEventSchema>
export type Client = z.infer<typeof clientSchema>
