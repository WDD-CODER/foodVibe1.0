import { z } from 'zod'
import { baseDocShape } from '../base.schema'

/**
 * Plan 321 Phase 3 — one `taxonomyTerms` collection replaces the single-doc `{ items }`
 * registries. One document per term; `kind` says which axis it belongs to.
 *
 * Ownership follows the Phase 2b deviation from D4: the owner field stays `userId`
 * (master terms use `'__master__'`) until Phase 5 redesigns ownership.
 * Uniqueness: `{ kind, key, userId }` (index created by the 0003 migration).
 */

export const TAXONOMY_KINDS = [
  'ingredientCategory',
  'allergen',
  'label',
  'course',
  'protein',
  'kosherType',
  'unit',
  'prepCategory',
  'preparation',
  'menuType',
  'eventType',
  'sectionCategory',
  'equipmentCategory',
  'station'
] as const

export type TaxonomyKind = (typeof TAXONOMY_KINDS)[number]

/** v1 registry collection -> the kind its items become (KITCHEN_PREPARATIONS splits into two kinds). */
export const REGISTRY_KIND_BY_COLLECTION = {
  KITCHEN_CATEGORIES: 'ingredientCategory',
  KITCHEN_ALLERGENS: 'allergen',
  KITCHEN_LABELS: 'label',
  KITCHEN_COURSES: 'course',
  KITCHEN_UNITS: 'unit',
  KITCHEN_PREPARATIONS: ['prepCategory', 'preparation'],
  MENU_TYPES: 'menuType',
  MENU_EVENT_TYPES: 'eventType',
  MENU_SECTION_CATEGORIES: 'sectionCategory',
  EQUIPMENT_CUSTOM_CATEGORIES: 'equipmentCategory'
} as const satisfies Record<string, TaxonomyKind | readonly TaxonomyKind[]>

/**
 * Where each kind's `key` is stored on other documents (v2 collection -> dotted field paths).
 * A trailing `[]` marks an array of keys (e.g. `categories[]`); a path without it holds a
 * single key, possibly inside arrays of objects (`ingredients.unit`).
 * Deleting a term is blocked while any of these still holds its key (Human, 2026-10-05);
 * re-keying a term renames the key in these paths.
 * Empty for kinds nothing references yet (protein/kosherType arrive in Phase 4; equipment
 * `category` is a fixed enum, so custom equipment categories are not stored on equipment).
 */
export const TERM_REFERENCES: Record<TaxonomyKind, Partial<Record<'products' | 'recipes' | 'dishes' | 'menuEvents' | 'equipment', readonly string[]>>> = {
  ingredientCategory: { products: ['categories[]'] },
  allergen: { products: ['allergens[]'] },
  label: { recipes: ['labels[]', 'autoLabels[]'], dishes: ['labels[]', 'autoLabels[]'] },
  course: { recipes: ['course'], dishes: ['course'] },
  unit: {
    products: ['baseUnit', 'purchaseOptions.unitSymbol'],
    recipes: ['ingredients.unit', 'yieldUnit', 'yieldConversions.unit', 'prepItems.unit', 'prepCategories.items.unit'],
    dishes: ['ingredients.unit', 'yieldUnit', 'yieldConversions.unit', 'prepItems.unit', 'prepCategories.items.unit']
  },
  prepCategory: {
    recipes: ['prepItems.categoryName', 'prepCategories.categoryName', 'prepCategories.items.categoryName'],
    dishes: ['prepItems.categoryName', 'prepCategories.categoryName', 'prepCategories.items.categoryName']
  },
  preparation: {
    recipes: ['prepItems.preparationName', 'prepCategories.items.itemName'],
    dishes: ['prepItems.preparationName', 'prepCategories.items.itemName']
  },
  menuType: { menuEvents: ['servingType'] },
  eventType: { menuEvents: ['eventType'] },
  sectionCategory: { menuEvents: ['sections.name'] },
  equipmentCategory: {},
  /** Plan 436: a station key is stored on the recipe / dish as `defaultStation` ('' = general). */
  station: { recipes: ['defaultStation'], dishes: ['defaultStation'] },
  protein: {},
  kosherType: {}
}

const DISH_FIELD_KEYS = ['sell_price', 'food_cost_money', 'food_cost_pct', 'serving_portions', 'serving_portions_pct'] as const

const termShape = {
  ...baseDocShape,
  key: z.string().min(1),
  sortOrder: z.number().int().min(0)
}

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)

/** Plan 440: a portions multiplier (event type, serving type, per-dish override): > 0, at most 2 decimals. */
export const coefficientSchema = z
  .number()
  .positive()
  .refine(n => Math.abs(Math.round(n * 100) - n * 100) < 1e-9, 'max 2 decimals')

const plainKinds = [
  'ingredientCategory',
  'allergen',
  'protein',
  'kosherType',
  'prepCategory',
  'sectionCategory',
  'equipmentCategory',
  'station'
] as const

export const taxonomyTermSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...termShape, kind: z.enum(plainKinds) }),
  z.strictObject({
    ...termShape,
    kind: z.literal('label'),
    color: colorSchema,
    autoTriggers: z.array(z.string()).optional()
  }),
  z.strictObject({
    ...termShape,
    kind: z.literal('course'),
    /** @deprecated never written since plan 438; stored values removed by migration 0007 */
    color: colorSchema.optional()
  }),
  z.strictObject({ ...termShape, kind: z.literal('unit'), gramRate: z.number().positive() }),
  /** `categoryKey` is absent for an uncategorized preparation (exists in live master data). */
  z.strictObject({ ...termShape, kind: z.literal('preparation'), categoryKey: z.string().min(1).optional() }),
  /** Plan 440: `coefficient` multiplies the portions of an event of this type (missing = 1.0). */
  z.strictObject({ ...termShape, kind: z.literal('eventType'), coefficient: coefficientSchema.optional() }),
  z.strictObject({
    ...termShape,
    kind: z.literal('menuType'),
    fields: z.array(z.enum(DISH_FIELD_KEYS)),
    coefficient: coefficientSchema.optional()
  })
])

export type TaxonomyTerm = z.infer<typeof taxonomyTermSchema>
/**
 * The term type of one kind. Distributes over the union members, so it also narrows the
 * member that groups the plain kinds (`kind: z.enum(plainKinds)`), where `Extract` gives never.
 */
export type TaxonomyTermOf<K extends TaxonomyKind> = TaxonomyTerm extends infer T
  ? T extends { kind: infer TK }
    ? K extends TK
      ? Omit<T, 'kind'> & { kind: K }
      : never
    : never
  : never
