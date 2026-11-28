import type { z } from 'zod'
import { bookingSchema } from './booking.schema'
import { clientSchema } from './client.schema'
import { decisionLogSchema } from './decision-log.schema'
import { equipmentSchema } from './equipment.schema'
import { frontDeskProfileSchema } from './front-desk-profile.schema'
import { knowledgeItemSchema } from './knowledge-item.schema'
import { menuDesignSchema } from './menu-design.schema'
import { menuEventSchema } from './menu-event.schema'
import { productSchema } from './product.schema'
import { recipeSchema } from './recipe.schema'
import { requestSchema } from './request.schema'
import { supplierSchema } from './supplier.schema'
import { taxonomyTermSchema } from './taxonomy-term.schema'
import { venueSchema } from './venue.schema'
import { invoiceSchema } from './invoice.schema'
import { priceHistorySchema } from './price-history.schema'
import { invoiceAliasSchema } from './invoice-alias.schema'
import { supplierProfileSchema } from './supplier-profile.schema'
import { aiDraftSchema } from './ai-draft.schema'
import { storedFileSchema } from './stored-file.schema'
import { businessAccessSchema } from './business-access.schema'
import { diagnosisSchema } from './diagnosis.schema'
import { stockCountSchema } from './stock-count.schema'
import { notificationSchema } from './notification.schema'
import { menuDishSchema } from './menu-dish.schema'
import { dishSalesMonthSchema } from './dish-sales-month.schema'
import { dishSalesAliasSchema } from './dish-sales-alias.schema'
import { monthPlanSchema } from './month-plan.schema'

export * from './invoice.schema'
export * from './price-history.schema'
export * from './invoice-alias.schema'
export * from './supplier-profile.schema'
export * from './ai-draft.schema'
export * from './stored-file.schema'
export * from './business-access.schema'
export * from './diagnosis.schema'
export * from './stock-count.schema'
export * from './notification.schema'
export * from './menu-dish.schema'
export * from './dish-sales-month.schema'
export * from './dish-sales-alias.schema'
export * from './month-plan.schema'
export * from './booking.schema'
export * from './business.schema'
export * from './client.schema'
export * from './common.schema'
export * from './decision-log.schema'
export * from './event-logistics'
export * from './event-stage'
export * from './front-desk-profile.schema'
export * from './knowledge-item.schema'
export * from './menu-design.schema'
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
  menuDesigns: menuDesignSchema,
  taxonomyTerms: taxonomyTermSchema,
  clients: clientSchema,
  frontDeskProfiles: frontDeskProfileSchema,
  knowledgeItems: knowledgeItemSchema,
  requests: requestSchema,
  bookings: bookingSchema,
  decisionLog: decisionLogSchema,
  invoices: invoiceSchema,
  priceHistory: priceHistorySchema,
  invoiceAliases: invoiceAliasSchema,
  supplierProfiles: supplierProfileSchema,
  aiDrafts: aiDraftSchema,
  storedFiles: storedFileSchema,
  businessAccess: businessAccessSchema,
  diagnoses: diagnosisSchema,
  stockCounts: stockCountSchema,
  notifications: notificationSchema,
  menuDishes: menuDishSchema,
  dishSalesMonths: dishSalesMonthSchema,
  dishSalesAliases: dishSalesAliasSchema,
  monthPlans: monthPlanSchema
} as const

export type SchemaCollection = keyof typeof SCHEMA_BY_COLLECTION
export type Product = z.infer<typeof productSchema>
export type Recipe = z.infer<typeof recipeSchema>
export type Equipment = z.infer<typeof equipmentSchema>
export type Supplier = z.infer<typeof supplierSchema>
export type Venue = z.infer<typeof venueSchema>
export type MenuEvent = z.infer<typeof menuEventSchema>
export type Client = z.infer<typeof clientSchema>
