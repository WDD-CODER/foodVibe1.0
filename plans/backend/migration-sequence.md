# foodVibe Backend — Migration Sequence

Three phases take the app from pure-localStorage to a shared MongoDB backend
without disrupting any active user's data.

---

## Phase 1 — Scaffold (this session) ✅

**Goal:** Backend exists and compiles. Angular adapter exists but is inactive.

| Deliverable | Status |
|-------------|--------|
| `server/` — Express + Mongoose app | Done |
| `server/routes/generic.js` — CRUD for all entity types | Done |
| `server/routes/auth.js` — signup / login → JWT | Done |
| `src/app/core/services/http-storage.adapter.ts` | Done |
| `environment.ts` — `useBackend: false` | Done |
| `environment.prod.ts` — `useBackend: true`, `apiUrl` placeholder | Done |
| `async-storage.service.ts` — delegation guard added | Done |
| `plans/backend/deployment.md` | Done |

**What is NOT done in Phase 1:**
- `apiUrl` in prod environment still says `your-render-url` — must be updated after deploy.
- No data in Atlas yet — frontend still reads from localStorage in all environments.
- `UserService` still uses localStorage for signup/login — Phase 3 wires it to `/api/auth`.

---

## Phase 2 — One-time Data Migration

**Goal:** Export every user's localStorage data into Atlas so Phase 3 is lossless.

> **SECURITY WARNING — migration-dump.json**
> The dump produced by the export script contains PBKDF2 password hashes from `signed-users-db`.
> - **Never commit** `migration-dump.json` to git — it is in `.gitignore`
> - **Delete** the dump file from your local machine immediately after seeding
> - **Never share** the dump file — treat it as a credentials file
> - Run the seed script with `--confirm-seed` flag only (see `scripts/seed-from-dump.js`)

### 2a. Export script (browser console, run once per user)

Open the app, open DevTools console, run:
```js
// backup_* keys (e.g. backup_PRODUCT_LIST) are intentionally excluded from this array.
// StorageService._save() writes a mirror copy under backup_<key> after every successful save.
// These mirrors are redundant for Atlas, which provides ACID writes and does not need a
// client-side safety copy — migrating them would duplicate every record without benefit.
const keys = [
  'PRODUCT_LIST','RECIPE_LIST','DISH_LIST','KITCHEN_SUPPLIERS','EQUIPMENT_LIST',
  'VENUE_PROFILES','MENU_EVENT_LIST',
  'TRASH_RECIPES','TRASH_DISHES','TRASH_PRODUCTS','TRASH_EQUIPMENT','TRASH_VENUES','TRASH_MENU_EVENTS',
  'VERSION_HISTORY','activity_log', // ACTIVITY_STORAGE_KEY = 'activity_log' — verified against activity-log.service.ts
  'KITCHEN_UNITS','KITCHEN_PREPARATIONS','KITCHEN_CATEGORIES','KITCHEN_ALLERGENS',
  'KITCHEN_LABELS','MENU_TYPES','MENU_SECTION_CATEGORIES','signed-users-db'
];
const dump = {};
for (const k of keys) {
  const raw = localStorage.getItem(k);
  if (raw) dump[k] = JSON.parse(raw);
}
copy(JSON.stringify(dump, null, 2)); // copies to clipboard
```
Save the clipboard output as `migration-dump.json`.

### 2b. Seed script (run once against Atlas)

```js
// scripts/seed-from-dump.js
// Usage: MONGO_URI=<atlas-uri> node scripts/seed-from-dump.js migration-dump.json
require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const Entity = require('./server/models/entity.model');
const fs = require('fs');

const [,, dumpFile] = process.argv;
const dump = JSON.parse(fs.readFileSync(dumpFile, 'utf8'));

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  for (const [entityType, items] of Object.entries(dump)) {
    const arr = Array.isArray(items) ? items : [items];
    for (const item of arr) {
      await Entity.updateOne(
        { _id: item._id, entityType },
        { $setOnInsert: { _id: item._id, entityType, data: item } },
        { upsert: true }
      );
    }
    console.log(`Seeded ${arr.length} × ${entityType}`);
  }
  await mongoose.disconnect();
  console.log('Done');
}
seed();
```

**Key constraint:** `$setOnInsert` with `upsert: true` is idempotent — safe to re-run.
Existing `_id` values are preserved exactly, so no Angular code needs to change.

---

## Phase 3 — Go Live

**Goal:** Flip the switch. All users read/write from Atlas.

### Checklist

1. Confirm Atlas seeding is complete for all active users (run Phase 2 for each).
2. Update `src/environments/environment.prod.ts`:
   ```typescript
   apiUrl: 'https://foodvibe-api.onrender.com',  // real Render URL
   useBackend: true,
   useBackendAuth: true,
   ```
3. **UserService wiring (requires its own planning session before executing):**
   - Scope: `src/app/core/services/user.service.ts` — replace `storageService.query/post` calls for `signed-users-db` with `POST /api/auth/signup` and `POST /api/auth/login`
   - The JWT returned by both endpoints must be stored (see http-storage.adapter.ts for chosen storage layer)
   - `_saveUserLocal()` must also persist the JWT alongside the User object
   - `logout()` must clear the JWT from storage
   - This change touches auth surface → Security Officer review is mandatory before commit
   - Estimated scope: medium (1 session, ~150 lines changed in UserService + interceptor update)
4. Update `authInterceptor` to attach `Authorization: Bearer <token>` from `fv_token`
   for all outgoing requests to `apiUrl` — or confirm `HttpStorageAdapter` headers() covers it.
5. Run `ng build --configuration production`.
6. Push to `main` → GitHub Actions deploys to GitHub Pages.
7. Run smoke tests from `plans/backend/deployment.md § 4`.
8. Monitor Atlas → Charts for first 24 hours.
9. Verify all security hardening from Plan 217 is active:
   - GET /api/v1/data/:type returns 401 without JWT
   - POST /api/v1/auth/login returns 429 after 10 failed attempts
   - POST with body > 2MB returns 413
   - npm audit in server/ reports zero critical/high vulnerabilities
   - server/package-lock.json is committed to git

### Rollback plan

If Phase 3 reveals a critical bug:
- Set `useBackend: false` in `environment.prod.ts`, rebuild, push.
- Users fall back to localStorage immediately — no data loss since localStorage was
  never cleared, and Atlas data is safely preserved for the next attempt.
