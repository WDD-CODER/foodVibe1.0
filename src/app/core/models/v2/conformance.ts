import type { Equipment as ClientEquipment } from '../equipment.model'
import type { MenuEvent as ClientMenuEvent } from '../menu-event.model'
import type { Product as ClientProduct } from '../product.model'
import type { Recipe as ClientRecipe } from '../recipe.model'
import type { Supplier as ClientSupplier } from '../supplier.model'
import type { VenueProfile as ClientVenue } from '../venue.model'
import type { Equipment, MenuEvent, Product, Recipe, Supplier, Venue } from './index'

/**
 * Plan 321 P2b.3b — compile-time guard: every persisted v2 document (the shared Zod schema is the
 * source of truth) must be assignable to the client's view interface. If a schema field is
 * renamed/retyped without the client model following, `ng test` (which compiles it via v2-types.spec.ts) fails here.
 * The client interfaces stay separate because create/edit flows legitimately omit the
 * server-owned fields (userId, schemaVersion, createdAt/updatedAt).
 */
export type V2ConformsToClient = [
  Equipment extends ClientEquipment ? true : never,
  Product extends ClientProduct ? true : never,
  Recipe extends ClientRecipe ? true : never,
  Supplier extends ClientSupplier ? true : never,
  Venue extends ClientVenue ? true : never,
  MenuEvent extends ClientMenuEvent ? true : never
]
export const v2ConformsToClient: V2ConformsToClient = [true, true, true, true, true, true]
