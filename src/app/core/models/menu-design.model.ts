/** Plan 764: a menu design, typed from its shared schema (type-only import: the validation library stays out). */
import type { MenuDesign } from '@schemas/entities/menu-design.schema'

export type { MenuDesign, MenuDesignDraft } from '@schemas/entities/menu-design.schema'

/** What the screen sends for a new design: the server stamps the id, the owner and the dates. */
export type NewMenuDesign = Omit<
  MenuDesign,
  | '_id'
  | 'schemaVersion'
  | 'userId'
  | 'businessId'
  | 'createdBy'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
  | 'deletedBy'
>
