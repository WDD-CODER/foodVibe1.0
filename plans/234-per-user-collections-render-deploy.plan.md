---
name: Per-User Collections + Render Deployment
overview: Add userId scoping to all entity-type collections, clone master data on signup, sync on login, add silent token refresh, and deploy the combined Express+Angular app to Render.
todos: []
isProject: true
---

# Per-User Collections + Render Deployment

> 5 sequential briefs. Do NOT start Brief N+1 until Brief N is merged to main.

## Architecture

Every flat document in every entity-type collection gets `userId`, `_masterId`, `_userModified` fields.
Master starter-kit data lives under `userId: '__master__'`. On signup, server clones all master data into
the new user's namespace. On login, server syncs new/updated master items respecting user modifications.

Data architecture: raw native MongoDB per-type collections (no Mongoose Entity model, no `data` wrapper).
Each entity type is its own collection. The shared constant `CLONEABLE_TYPES` lists all cloneable collections.

## Constraints

- Never use `db.listCollections()` for cloning/syncing — use hardcoded `CLONEABLE_TYPES` constant
- `PUT /:type/:id` must destructure `userId`, `_masterId`, `_userModified` out of `req.body` before update (spoof prevention)
- `login()` in user.service.ts must send the RAW password — server does PBKDF2 re-derivation server-side; do NOT add hashPassword() to the login path
- Master data (`userId: '__master__'`) must never be modified by any user-facing route
- `server/models/entity.model.js` does NOT exist — all data ops use native MongoDB via `col(type)`
- Brief 3 login/signup/logout backend wiring is already done — only implement the refresh timer

## CLONEABLE_TYPES (shared constant)

```js
const CLONEABLE_TYPES = [
  'PRODUCT_LIST', 'RECIPE_LIST', 'DISH_LIST',
  'KITCHEN_SUPPLIERS', 'EQUIPMENT_LIST', 'VENUE_PROFILES',
  'KITCHEN_PREPARATIONS', 'KITCHEN_CATEGORIES', 'KITCHEN_ALLERGENS',
  'KITCHEN_LABELS', 'KITCHEN_UNITS', 'MENU_TYPES',
  'MENU_SECTION_CATEGORIES', 'MENU_EVENT_LIST'
]
```

# Atomic Sub-tasks

## Brief 1 — Schema & Migration

- [ ] Create `server/constants/cloneable-types.js` — exports `CLONEABLE_TYPES` array
- [ ] Fix `scripts/seed-from-dump.js` — replace broken Entity model with native MongoDB driver; add `userId: '__master__', _masterId: null, _userModified: false` to each `$setOnInsert`
- [ ] Create `scripts/stamp-master-userId.js` — `--confirm-stamp` flag required; blocked in production; uses `CLONEABLE_TYPES`; `updateMany` per collection; logs count per type
- [ ] `ng build` smoke check (no Angular changes)
- [ ] Run `node scripts/stamp-master-userId.js --confirm-stamp` against Atlas; verify in Compass
- [ ] PR + merge `feat/user-scoped-schema`

## Brief 2 — Backend User Scoping

- [ ] `server/routes/generic.js` — `GET /:type`: add `userId: req.user.userId` to `.find()` filter
- [ ] `server/routes/generic.js` — `GET /:type/:id`: add `userId` to `.findOne()` filter
- [ ] `server/routes/generic.js` — `POST /:type`: stamp `userId, _masterId: null, _userModified: false` on inserted doc
- [ ] `server/routes/generic.js` — `PUT /:type/:id`: destructure reserved fields from req.body; switch to findOneAndUpdate with $set; filter by userId
- [ ] `server/routes/generic.js` — `PUT /:type` (replaceAll): add `userId` to deleteMany filter; stamp `userId, _masterId: null, _userModified: false` on inserted docs
- [ ] `server/routes/generic.js` — `DELETE /:type/:id`: add `userId` to deleteOne filter
- [ ] Create `server/services/clone-master.js` — flat-doc cloning per CLONEABLE_TYPES collection
- [ ] Create `server/services/sync-master.js` — 4-rule sync per CLONEABLE_TYPES collection
- [ ] `server/routes/auth.js` — wire cloneMasterDataToUser after User.create in signup
- [ ] `server/routes/auth.js` — wire syncMasterToUser after login success (try/catch, non-blocking)
- [ ] `server/routes/auth.js` — wire syncMasterToUser after refresh success (try/catch)
- [ ] Build verification + manual API test
- [ ] Security Officer review
- [ ] PR + merge `feat/user-scoped-backend`

## Brief 3 — Frontend Auth Wiring (refresh only)

- [ ] `src/app/core/services/user.service.ts` — add `refreshToken()` method (POST refresh endpoint, withCredentials, storeToken on success)
- [ ] `src/app/core/services/user.service.ts` — call `refreshToken()` on construction (silent session restore)
- [ ] `src/app/core/services/user.service.ts` — 13-minute interval timer; start after login/refresh; clear on logout
- [ ] `ng build` verification
- [ ] Security Officer review
- [ ] PR + merge `feat/frontend-auth-wiring`

## Brief 4 — Express Static Serving (guard fix + build script)

- [ ] `server/index.js` — add `/api/` path guard to `app.get('*', ...)` SPA catch-all
- [ ] `package.json` (root) — add `"build:render": "npx ng build --configuration=production"` script
- [ ] Build + serve verification
- [ ] PR + merge `feat/express-static-serving`

## Brief 5 — Deploy to Render

- [ ] Rewrite `render.yaml` — fix buildCommand (npm ci + server install + Angular build); fix MONGO_URI key; JWT_SECRET generateValue; keep existing ALLOWED_ORIGIN; remove hardcoded PORT
- [ ] `package.json` (root) — add `"engines": { "node": ">=20" }`
- [ ] PR + merge `feat/render-deploy`
- [ ] Manual: set MONGO_URI in Render dashboard; trigger deploy; smoke test

## Backend Impact

- Collections affected: all CLONEABLE_TYPES collections + users (untouched)
- New collections: no
- Server changes: generic.js (scoping), new services/clone-master.js + services/sync-master.js, auth.js (wiring)
