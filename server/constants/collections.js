/**
 * Single source of truth for every collection the generic data API serves.
 * Temporary JS form — this moves into `shared/schemas/collections.ts` in Plan 321
 * Phase 2a, once the shared Zod schema package exists. Until then, this is the one
 * place every collection list derives from: `ALL_USER_ENTITY_TYPES`, `CLONEABLE_TYPES`,
 * `SEARCHABLE_ENTITY_TYPES`, `BACKUP_ENTITY_TYPES` (all server; the client copy of the
 * backup list was removed with the localStorage mode in Plan 321 P1.3).
 *
 * Flags:
 *   userData   — reachable through the generic `/api/v1/data/:type` CRUD pipe
 *   cloneable  — copied into a new user's namespace at signup / kept in sync at login
 *   backup     — was the client localStorage mirror list (removed in Plan 321 P1.3); no runtime consumer today
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
  { name: 'suppliers',        userData: true,  cloneable: true,  backup: true,  searchable: false }, // must precede products in CLONEABLE_TYPES order so supplierIdMap is ready
  { name: 'products',             userData: true,  cloneable: true,  backup: true,  searchable: true },
  { name: 'recipes',              userData: true,  cloneable: true,  backup: true,  searchable: true },
  { name: 'dishes',                userData: true,  cloneable: true,  backup: true,  searchable: true },
  { name: 'equipment',           userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'venues',           userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'menuEvents',          userData: true,  cloneable: true,  backup: true,  searchable: false },
  { name: 'TRASH_RECIPES',            userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'TRASH_DISHES',             userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'TRASH_PRODUCTS',           userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'TRASH_EQUIPMENT',          userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'TRASH_VENUES',             userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'TRASH_MENU_EVENTS',        userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'VERSION_HISTORY',          userData: true,  cloneable: false, backup: true,  searchable: false },
  { name: 'activity_log',             userData: true,  cloneable: false, backup: true,  searchable: false },
  // The v1 single-doc registries (KITCHEN_UNITS/PREPARATIONS/CATEGORIES/ALLERGENS/LABELS/
  // COURSES, MENU_TYPES, MENU_EVENT_TYPES, MENU_SECTION_CATEGORIES, EQUIPMENT_CUSTOM_CATEGORIES)
  // were replaced by taxonomyTerms (Plan 321 Phase 3) and dropped by migration 0004.
  // Plan 321 Phase 3: one doc per taxonomy term. Not cloneable — read live as master ∪ own
  // (generic.js ownerFilter).
  { name: 'taxonomyTerms',            userData: true,  cloneable: false, backup: true,  searchable: false },
  // Plan 322 M4: per-user Hebrew-dictionary overrides. Not cloneable — signup starts with none;
  // the shared '__global__' pseudo-user doc (own routes, see generic.js) is the admin-editable
  // layer every user merges in at runtime, separate from this per-user personal layer.
  { name: 'DICTIONARY_OVERRIDES',     userData: true,  cloneable: false, backup: true,  searchable: false },
]

const ALL_USER_ENTITY_TYPES = COLLECTIONS.filter(c => c.userData).map(c => c.name)
const CLONEABLE_TYPES = COLLECTIONS.filter(c => c.cloneable).map(c => c.name)
const SEARCHABLE_ENTITY_TYPES = COLLECTIONS.filter(c => c.searchable).map(c => c.name)
const BACKUP_ENTITY_TYPES = COLLECTIONS.filter(c => c.backup).map(c => c.name)

module.exports = { COLLECTIONS, ALL_USER_ENTITY_TYPES, CLONEABLE_TYPES, SEARCHABLE_ENTITY_TYPES, BACKUP_ENTITY_TYPES }
