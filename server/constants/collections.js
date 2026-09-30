/**
 * Single source of truth for every collection the generic data API serves.
 * Temporary JS form — this moves into `shared/schemas/collections.ts` in Plan 321
 * Phase 2a, once the shared Zod schema package exists. Until then, this is the one
 * place all four of the previously-hand-maintained lists derive from:
 * `ALL_USER_ENTITY_TYPES` (server), `CLONEABLE_TYPES` (server), `SEARCHABLE_ENTITY_TYPES`
 * (server), `BACKUP_ENTITY_TYPES` (client — check drift with
 * `npm run lint:backup-entity-types` / `scripts/check-backup-entity-types.mjs`).
 *
 * Flags:
 *   userData   — reachable through the generic `/api/v1/data/:type` CRUD pipe
 *   cloneable  — copied into a new user's namespace at signup / kept in sync at login
 *   backup     — mirrored to `backup_<key>` in localStorage after every save
 *   searchable — has the lean prefix-match `/search` endpoint
 *
 * Rules:
 *  - Never use db.listCollections() to derive any of this — that picks up system
 *    collections and `users` (see the `system.views` gotcha in
 *    docs/brain/gotchas/backend.md).
 *  - Add a new entry here whenever a new entity type is introduced to the app.
 *  - Keep in sync with `docs/agent/standards-backend.md` §1.
 */
const COLLECTIONS = [
  // name                         userData cloneable backup searchable
  { name: 'KITCHEN_SUPPLIERS',        userData: true,  cloneable: true,  backup: true,  searchable: false }, // must precede PRODUCT_LIST in CLONEABLE_TYPES order so supplierIdMap is ready
  { name: 'PRODUCT_LIST',             userData: true,  cloneable: true,  backup: true,  searchable: true },
  { name: 'RECIPE_LIST',              userData: true,  cloneable: true,  backup: true,  searchable: true },
  { name: 'DISH_LIST',                userData: true,  cloneable: true,  backup: true,  searchable: true },
  { name: 'EQUIPMENT_LIST',           userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'VENUE_PROFILES',           userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'MENU_EVENT_LIST',          userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'TRASH_RECIPES',            userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'TRASH_DISHES',             userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'TRASH_PRODUCTS',           userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'TRASH_EQUIPMENT',          userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'TRASH_VENUES',             userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'TRASH_MENU_EVENTS',        userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'VERSION_HISTORY',          userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'activity_log',             userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'KITCHEN_UNITS',            userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'KITCHEN_PREPARATIONS',     userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'KITCHEN_CATEGORIES',       userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'KITCHEN_ALLERGENS',        userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'KITCHEN_LABELS',           userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'MENU_TYPES',               userData: true,  cloneable: true,  backup: true,  searchable: false },
  // MENU_EVENT_TYPES / EQUIPMENT_CUSTOM_CATEGORIES: drift found in Plan 321 Phase 1
  // Reality Check — present in ALL_USER_ENTITY_TYPES but missing from CLONEABLE_TYPES
  // and BACKUP_ENTITY_TYPES (an oversight, not a documented design choice — nothing
  // distinguishes these two small custom-category registries from the others above).
  // Fixed here: both now cloned and backed up like every other registry.
  { name: 'MENU_EVENT_TYPES',         userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'MENU_SECTION_CATEGORIES',  userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'EQUIPMENT_CUSTOM_CATEGORIES', userData: true, cloneable: true, backup: true, searchable: false },
]

const ALL_USER_ENTITY_TYPES = COLLECTIONS.filter(c => c.userData).map(c => c.name)
const CLONEABLE_TYPES = COLLECTIONS.filter(c => c.cloneable).map(c => c.name)
const SEARCHABLE_ENTITY_TYPES = COLLECTIONS.filter(c => c.searchable).map(c => c.name)
const BACKUP_ENTITY_TYPES = COLLECTIONS.filter(c => c.backup).map(c => c.name)

module.exports = { COLLECTIONS, ALL_USER_ENTITY_TYPES, CLONEABLE_TYPES, SEARCHABLE_ENTITY_TYPES, BACKUP_ENTITY_TYPES }
