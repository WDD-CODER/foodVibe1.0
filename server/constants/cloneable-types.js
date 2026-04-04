/**
 * Exhaustive list of entity-type collection names that hold user data.
 * Used by clone-master, sync-master, and the stamp migration script.
 *
 * Rules:
 *  - Never use db.listCollections() — that picks up system collections and `users`.
 *  - Add a new entry here whenever a new entity type is introduced to the app.
 *  - Keep in sync with standards-backend.md §1 (collection registry).
 */
const CLONEABLE_TYPES = [
  'PRODUCT_LIST',
  'RECIPE_LIST',
  'DISH_LIST',
  'KITCHEN_SUPPLIERS',
  'EQUIPMENT_LIST',
  'VENUE_PROFILES',
  'KITCHEN_PREPARATIONS',
  'KITCHEN_CATEGORIES',
  'KITCHEN_ALLERGENS',
  'KITCHEN_LABELS',
  'KITCHEN_UNITS',
  'MENU_TYPES',
  'MENU_SECTION_CATEGORIES',
  'MENU_EVENT_LIST',
]

module.exports = { CLONEABLE_TYPES }
