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
- [x] Create `scripts/stamp-master-userId.js` — `--confirm-stamp` flag required; blocked in production; uses `CLONEABLE_TYPES`; `updateMany` per collection; logs count per type *(shipped in PR #53, later deleted in Plan 255 as confirmed-dead)*
- [x] `ng build` smoke check (no Angular changes)
- [x] Run `node scripts/stamp-master-userId.js --confirm-stamp` against Atlas; verify in Compass — **resolved 2026-07-27, not run:** Compass check confirmed every document in every `CLONEABLE_TYPES` collection already carries a real `userId`; no orphaned pre-migration data exists. The script is deliberately not restored — fresh deployments never need it, since `scripts/seed-from-dump.js` already stamps `userId: '__master__'` at insert time (Brief 1). The original script's blanket `updateMany({}, ...)` has no `userId` filter, so re-running it today against a database full of real per-user data would overwrite every user's `userId` to `'__master__'` — do not resurrect without adding an `{ userId: { $exists: false } }` guard first.
- [x] PR + merge `feat/user-scoped-schema` *(no separate branch/PR ever existed — shipped in the single squash-merged PR #53)*

## Brief 2 — Backend User Scoping

- [x] `server/routes/generic.js` — `GET /:type`: add `userId: req.user.userId` to `.find()` filter
- [x] `server/routes/generic.js` — `GET /:type/:id`: add `userId` to `.findOne()` filter
- [x] `server/routes/generic.js` — `POST /:type`: stamp `userId, _masterId: null, _userModified: false` on inserted doc
- [x] `server/routes/generic.js` — `PUT /:type/:id`: destructure reserved fields from req.body; switch to findOneAndUpdate with $set; filter by userId
- [x] `server/routes/generic.js` — `PUT /:type` (replaceAll): add `userId` to deleteMany filter; stamp `userId, _masterId: null, _userModified: false` on inserted docs
- [x] `server/routes/generic.js` — `DELETE /:type/:id`: add `userId` to deleteOne filter
- [x] Create `server/services/clone-master.js` — flat-doc cloning per CLONEABLE_TYPES collection
- [x] Create `server/services/sync-master.js` — 4-rule sync per CLONEABLE_TYPES collection
- [x] `server/routes/auth.js` — wire cloneMasterDataToUser after User.create in signup
- [x] `server/routes/auth.js` — wire syncMasterToUser after login success (try/catch, non-blocking)
- [x] `server/routes/auth.js` — wire syncMasterToUser after refresh success (try/catch)
- [x] Build verification + manual API test — 2026-07-27: `npm run build:render` passed; live CRUD test confirmed userId-scoped GET/POST and spoof-safe PUT
- [x] Security Officer review — 2026-07-27: security-grep patterns (innerHTML sanitization, PII-in-logs) applied by hand — clean (historical CI logs expired, 90-day retention)
- [x] PR + merge `feat/user-scoped-backend` *(no separate branch/PR ever existed — shipped in the single squash-merged PR #53)*

## Brief 3 — Frontend Auth Wiring (refresh only)

- [x] `src/app/core/services/user.service.ts` — add `refreshToken()` method (POST refresh endpoint, withCredentials, storeToken on success)
- [x] `src/app/core/services/user.service.ts` — call `refreshToken()` on construction (silent session restore)
- [x] `src/app/core/services/user.service.ts` — 13-minute interval timer; start after login/refresh; clear on logout
- [x] `ng build` verification
- [x] Security Officer review — 2026-07-27: same grep applied to user.service.ts refreshToken/storeToken/login logging — no PII values logged, only userId in log context
- [x] PR + merge `feat/frontend-auth-wiring` *(no separate branch/PR ever existed — shipped in PR #53)*

## Brief 4 — Express Static Serving (guard fix + build script)

- [x] `server/index.js` — add `/api/` path guard to `app.get('*', ...)` SPA catch-all
- [x] `package.json` (root) — add `"build:render": "npx ng build --configuration=production"` script
- [x] Build + serve verification — 2026-07-27: prod build served through Express; SPA deep-route fallback 200s, `/api/` 404 guard returns JSON not index.html
- [x] PR + merge `feat/express-static-serving` *(no separate branch/PR ever existed — shipped in PR #53)*

## Brief 5 — Deploy to Render

- [x] Rewrite `render.yaml` — fix buildCommand (npm ci + server install + Angular build); fix MONGO_URI key; JWT_SECRET generateValue; keep existing ALLOWED_ORIGIN; remove hardcoded PORT
- [x] `package.json` (root) — add `"engines": { "node": ">=20" }`
- [x] PR + merge `feat/render-deploy` — PR #53, merged 2026-04-04, confirmed via `gh pr view 53`
- [ ] Manual: set MONGO_URI in Render dashboard; trigger deploy; smoke test

## Backend Impact

- Collections affected: all CLONEABLE_TYPES collections + users (untouched)
- New collections: no
- Server changes: generic.js (scoping), new services/clone-master.js + services/sync-master.js, auth.js (wiring)
