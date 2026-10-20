/**
 * Code QA api layer (plan 414) — one minimal valid record per user entity.
 *
 * Every name starts with QA-CODE-<DATE>- so cleanup can find it. Records that point at others are built in
 * ENTITY_ORDER and take the ids created before them (product → supplier, recipe → product, dish → recipe,
 * venue → equipment, menu event → dish). `validateFixture` checks a fixture against the shared Zod schema
 * (server/generated/schemas, built by `npm run build:schemas`) with the server stamps filled in, so a case
 * that fails is the server's doing, never a bad fixture.
 */
import { existsSync } from 'fs'
import { createRequire } from 'module'
import { join } from 'path'

/** Creation order: each entity only references entities before it. */
export const ENTITY_ORDER = ['suppliers', 'equipment', 'products', 'recipes', 'dishes', 'venues', 'menuEvents']

/** The trash collection the app moves a deleted record into; null = deleted for good (suppliers). */
export const TRASH_OF = {
  suppliers: null,
  equipment: 'TRASH_EQUIPMENT',
  products: 'TRASH_PRODUCTS',
  recipes: 'TRASH_RECIPES',
  dishes: 'TRASH_DISHES',
  venues: 'TRASH_VENUES',
  menuEvents: 'TRASH_MENU_EVENTS'
}

/** Entities the app can restore from the trash (src/app/core/services/*-data.service.ts restore*()). */
export const RESTORABLE = new Set(['equipment', 'products', 'recipes', 'dishes', 'venues'])

/** Entities with the /search endpoint (server/constants/collections.js searchable). */
export const SEARCHABLE = new Set(['products', 'recipes', 'dishes'])

/** The field that holds the record's name. */
export const nameField = (entity) => (entity === 'menuEvents' ? 'name' : 'nameHebrew')

export const prefixOf = (date) => `QA-CODE-${date}-`

/** True when `doc` is a Code QA record (any date). */
export const isCodeQaRecord = (doc) => /^QA-CODE-/.test(String(doc?.nameHebrew ?? doc?.name ?? ''))

/** Reference records created before the cases (tag 'ref'), and the `refs` key that holds each id. */
export const REF_KEYS = { suppliers: 'supplier', equipment: 'equipment', products: 'refProduct', recipes: 'recipe', dishes: 'dish' }

/**
 * The fixture body for `entity`. `refs` holds the reference records' ids: { supplier, equipment, refProduct,
 * recipe, dish }. `tag` is 'subject' (the record the cases test) or 'ref' (a record other fixtures point at),
 * so every subject can be deleted without breaking a reference.
 */
export function fixtureFor(entity, date, refs = {}, tag = 'subject') {
  const name = `${prefixOf(date)}${entity}-${tag}`
  switch (entity) {
    case 'suppliers':
      return { nameHebrew: name, contactPerson: 'QA', phone: '050-0000000', deliveryDays: [0, 3], minOrderMov: 100, leadTimeDays: 2 }
    case 'equipment':
      return { nameHebrew: name, category: 'tool', ownedQuantity: 2, isConsumable: false, notes: 'Code QA' }
    case 'products':
      return {
        nameHebrew: name,
        baseUnit: 'gram',
        sources: refs.supplier ? [{ supplierId: refs.supplier, price: 12.5 }] : [],
        purchaseOptions: [{ unitSymbol: 'kg', conversionRate: 1000 }],
        categories: ['other'],
        yieldFactor: 1,
        allergens: [],
        minStockLevel: 5,
        expiryDaysDefault: 3
      }
    case 'recipes':
      return {
        nameHebrew: name,
        ingredients: [{ _id: 'qa-ing-1', referenceId: refs.refProduct, type: 'product', amount: 250, unit: 'gram', nameSnapshot: `${prefixOf(date)}products-ref` }],
        steps: [{ order: 1, instruction: 'Code QA step', laborTimeMinutes: 5 }],
        yieldAmount: 1,
        yieldUnit: 'kg',
        defaultStation: 'cold',
        isApproved: false
      }
    case 'dishes':
      return {
        nameHebrew: name,
        ingredients: [{ _id: 'qa-ing-1', referenceId: refs.recipe, type: 'recipe', amount: 0.2, unit: 'kg', nameSnapshot: `${prefixOf(date)}recipes-ref` }],
        steps: [],
        yieldAmount: 4,
        yieldUnit: 'dish',
        defaultStation: 'hot',
        isApproved: false
      }
    case 'venues':
      return {
        nameHebrew: name,
        environmentType: 'professional_kitchen',
        availableInfrastructure: refs.equipment ? [{ equipmentId: refs.equipment, availableQuantity: 1 }] : [],
        capacity: 80,
        active: true
      }
    case 'menuEvents':
      return {
        name,
        eventType: 'qa',
        servingType: 'plated',
        guestCount: 50,
        sections: [{
          _id: 'qa-sec-1', name: 'Code QA', sortOrder: 0,
          items: refs.dish ? [{ recipeId: refs.dish, recipeType: 'dish', predictedTakeRate: 1, derivedPortions: 50 }] : []
        }]
      }
    default:
      throw new Error(`no fixture for ${entity}`)
  }
}

/** SCHEMA_BY_COLLECTION from the built shared schemas, or null when they are not built. */
export function loadSchemas(root) {
  const file = join(root, 'server', 'generated', 'schemas', 'index.js')
  if (!existsSync(file)) return null
  const require = createRequire(file)
  return require(file).SCHEMA_BY_COLLECTION
}

/** [] when `fixture` parses as a stored `entity` doc, else the Zod issue lines. */
export function validateFixture(schemas, entity, fixture) {
  const stamped = { ...fixture, _id: 'qa-fixture', schemaVersion: 2, userId: 'qa-user', createdAt: 0, updatedAt: 0 }
  const r = schemas[entity].safeParse(stamped)
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
}
