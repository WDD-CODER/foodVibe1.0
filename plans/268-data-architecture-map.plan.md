---
name: Data Architecture Map
overview: Investigation-only reference document mapping storage modes, Mongoose models, server routes, signup seeding, and frontend services for ownership/scope diagnosis.
todos: []
isProject: false
completedAt: 2026-04-15
---

## Goal

Produce a complete data-architecture map of the current app so the planner can diagnose ownership/scope issues.

## Status: COMPLETE — Reference Document

This plan is a completed investigation. No implementation tasks. Use the findings below as a reference when scoping features that touch data ownership, user scoping, or storage modes.

---

## Findings

### 1. Storage Modes

| Configuration | Environment file | `useBackend` | `useBackendAuth` | API target |
|---|---|---|---|---|
| `ng serve` (default dev) | `environment.ts` | false | false | localStorage only |
| `--configuration=local` | `environment.local.ts` | true | true | `http://localhost:3000` |
| `--configuration=remote` | `environment.remote.ts` | true | true | `https://foodvibe-api.onrender.com` |
| Production | `environment.prod.ts` | true | true | same-origin (`''`) |

- `useBackend: false` → all CRUD hits `localStorage` directly
- `useBackend: true` → `StorageService` delegates to `HttpStorageAdapter` → `/api/v1/data/:type`
- `useBackendAuth: false` → user records stored in `localStorage['signed-users-db']`, no JWT
- `useBackendAuth: true` → JWT in `sessionStorage['fv_token']`; httpOnly refresh cookie `fv_refresh`

---

### 2. Mongoose Models

**Only one Mongoose schema exists:** `server/models/user.model.js` (collection: `users`)

Fields: `_id` (String, custom), `name` (String, unique), `email` (String, unique), `imgUrl`, `role` (enum admin/user), `passwordHash`, `failedAttempts`, `lockedUntil`.

**No ownership fields** (`userId`, `ownerId`, `createdBy`, `hiddenBy`, `isGlobal`, `isPublic`) on the User schema.

**All domain data** (recipes, products, dishes, suppliers, etc.) uses raw native MongoDB collections via `mongoose.connection.db.collection(type)` — **no Mongoose schema**. Documents are stored flat with server-stamped fields:
- `userId` — owner (`string` user `_id` or `'__master__'`)
- `_masterId` — lineage pointer to source master doc
- `_userModified` — `true` if user has edited since last sync

---

### 3. Read Routes

**`GET /api/v1/data/:type`** — `optionalToken` middleware
- Auth: optional. No token → serves `userId: '__master__'` docs. Valid token → serves `userId: req.user.userId` docs.
- Query: `col(type).find({ userId }).skip().limit().toArray()` (default limit 500, max 1000)
- Blocked types: `signed-users-db`, `users`, `GEMINI_SHOTS`, `GEMINI_USAGE` → 403

**`GET /api/v1/data/:type/:id`** — `optionalToken` middleware
- Auth: optional
- Three-layer lookup: (1) `{ _id, userId }` → (2) `{ _masterId: id, userId }` → (3) `{ _id, userId: '__master__' }`
- Fallback 3 serves master copy when user has no personal copy (sync skipped due to name collision)

**`GET /api/v1/health`** — no auth → `{ ok: true, ts: Date.now() }`

---

### 4. Write Routes

**`POST /api/v1/data/:type`** — `verifyToken`
- Stamps: `userId: req.user.userId`, `_masterId`, `_userModified: false`
- Strips `userId`, `_masterId`, `_userModified` from body (spoof prevention)
- Also writes a `userId: '__master__'` copy (shared for future signups)
- `PRODUCT_LIST` special: silent merge on `name_hebrew_normalized` collision with master

**`PUT /api/v1/data/:type/:id`** — `verifyToken`
- `$set: { ...safeBody, _userModified: true }` scoped to `{ _id, userId: req.user.userId }`
- Sets `_userModified: true` — doc will no longer be overwritten by `syncMasterToUser`

**`PUT /api/v1/data/:type`** (bulk replace) — `verifyToken` + `X-Confirm-Replace: true` header
- `deleteMany({ userId: req.user.userId })` then `insertMany` — never touches other users or master

**`DELETE /api/v1/data/:type/:id`** — `verifyToken`
- `deleteOne({ _id, userId: req.user.userId })`

**Auth write routes:**
- `POST /auth/signup` — creates User doc + calls `cloneMasterDataToUser`
- `POST /auth/login` — calls `cleanupNameCollisionClones` + `syncMasterToUser`
- `POST /auth/refresh` — calls `cleanupNameCollisionClones` + `syncMasterToUser`
- `POST /auth/logout` — clears `fv_refresh` cookie
- `POST /auth/guest` — localhost-only; upserts `dev-guest` user + cleanup + sync

---

### 5. Signup Seeding

On `POST /signup`: creates User doc, then calls `cloneMasterDataToUser(userId)`.

Iterates all 14 `CLONEABLE_TYPES` and clones every `userId: '__master__'` doc to the new user:
```
PRODUCT_LIST, RECIPE_LIST, DISH_LIST, KITCHEN_SUPPLIERS, EQUIPMENT_LIST,
VENUE_PROFILES, KITCHEN_PREPARATIONS, KITCHEN_CATEGORIES, KITCHEN_ALLERGENS,
KITCHEN_LABELS, KITCHEN_UNITS, MENU_TYPES, MENU_SECTION_CATEGORIES, MENU_EVENT_LIST
```
Each clone gets: new `_id`, `userId: newUserId`, `_masterId: originalId`, `_userModified: false`.
RECIPE_LIST / DISH_LIST: `ingredients_[].referenceId` remapped from master product IDs to user product IDs.

Master data seeded on server boot from `public/assets/data/*.json` via `seed-master.js` (idempotent).

On **login / token refresh**: `syncMasterToUser` applies 4 rules:
1. New master items → clone (with name-collision guard)
2. Unmodified clones (`_userModified: false`) → overwrite with latest master
3. User-modified clones (`_userModified: true`) → skip
4. Deleted master items → skip

---

### 6. Frontend Services

All use `StorageService` → dispatches to localStorage or `HttpStorageAdapter`. Server filters by `userId`; no client-side user filtering on load.

| Service | Storage key | Signal(s) | User filtering at client |
|---|---|---|---|
| `recipe-data.service.ts` | `RECIPE_LIST` | `allRecipes_` | None on load; `addRecipe` stamps `createdBy`; `hideRecipe` pushes to `hiddenBy[]` |
| `dish-data.service.ts` | `DISH_LIST` | `allDishes_` | None on load; `addDish` stamps `createdBy`; `hideDish` pushes to `hiddenBy[]` |
| `product-data.service.ts` | `PRODUCT_LIST` | `allProducts_`, `allTopCategories_` (computed), `allAllergens_` (computed) | None |
| `supplier-data.service.ts` | `KITCHEN_SUPPLIERS` | `allSuppliers_` | None |
| `menu-event-data.service.ts` | `MENU_EVENT_LIST` | `allMenuEvents_` | None |
| `equipment-data.service.ts` | `EQUIPMENT_LIST` | `allEquipment_` | Duplicate name guard (in-memory, not user filter) |
| `venue-data.service.ts` | `VENUE_PROFILES` | `allVenues_` | None |
| `unit-registry.service.ts` | `KITCHEN_UNITS` | `globalUnits_`, `allUnitKeys_` (computed) | None; merges SYSTEM_UNITS over stored values |
| `metadata-registry.service.ts` | `KITCHEN_CATEGORIES`, `KITCHEN_ALLERGENS`, `KITCHEN_LABELS`, `MENU_TYPES` | `allCategories_`, `allAllergens_`, `allLabels_`, `allMenuTypes_` | None; seeds defaults if empty |
| `menu-section-categories.service.ts` | `MENU_SECTION_CATEGORIES` | `sectionCategories_` | None; seeds 8 defaults if empty |

---

### 7. StorageService Persistence Contract

File: `src/app/core/services/async-storage.service.ts`

- `useBackend: false` → read/write `localStorage[entityType]`; on every write, also mirrors to `localStorage[backup_<entityType>]` for all keys in `BACKUP_ENTITY_TYPES`
- `useBackend: true` → delegates all operations to `HttpStorageAdapter`:
  - `query` → `GET /api/v1/data/:type` (with Bearer token)
  - `get` → `GET /api/v1/data/:type/:id`
  - `post` → `POST /api/v1/data/:type` (assigns new `_id` before sending)
  - `put` → `PUT /api/v1/data/:type/:id`
  - `remove` → `DELETE /api/v1/data/:type/:id`
  - `replaceAll` → `PUT /api/v1/data/:type` (with `X-Confirm-Replace: true`)
  - `appendExisting` → `POST /api/v1/data/:type` (uses existing `_id`, no re-assignment)

`BACKUP_ENTITY_TYPES` (localStorage mirror targets):
```
PRODUCT_LIST, RECIPE_LIST, DISH_LIST, KITCHEN_SUPPLIERS, EQUIPMENT_LIST,
VENUE_PROFILES, MENU_EVENT_LIST, TRASH_RECIPES, TRASH_DISHES, TRASH_PRODUCTS,
TRASH_EQUIPMENT, TRASH_VENUES, TRASH_MENU_EVENTS, VERSION_HISTORY,
KITCHEN_UNITS, KITCHEN_PREPARATIONS, KITCHEN_CATEGORIES, KITCHEN_ALLERGENS,
KITCHEN_LABELS, MENU_TYPES, MENU_SECTION_CATEGORIES, ACTIVITY_STORAGE_KEY
```

---

### 8. Auth State

File: `src/app/core/services/user.service.ts`

| Item | Value |
|---|---|
| Signal name | `user_` |
| Type | `Signal<User \| null>` (public read-only) |
| User ID access | `user_()._id` — `string` (5-char alphanumeric) |
| Internal writable | `_user_` (private `WritableSignal<User \| null>`) |
| Also exposed as | `currentUser` getter (`User \| null`) |
| Persisted to | `sessionStorage['loggedInUser']` (cleared on tab close) |
| JWT stored | `sessionStorage['fv_token']` (read by `HttpStorageAdapter.headers()`) |

`User` type: `{ _id: string, name: string, email: string, imgUrl: string, role?: 'admin' | 'user' }`
