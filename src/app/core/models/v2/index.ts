/**
 * Plan 321 Phase 2a — v2 entity types inferred from the shared Zod schemas.
 * Client view interfaces stay; conformance.ts locks them to these schema types at compile time.
 */
export type {
  Equipment,
  MenuEvent,
  Product,
  Recipe,
  Supplier,
  Venue,
  TaxonomyKind,
  TaxonomyTerm,
  TaxonomyTermOf
} from '@schemas/entities'
