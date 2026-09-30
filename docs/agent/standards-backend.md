---
paths:
  - "server/**"
---

# Backend Persistence Standards

## 0 — Tech Stack (verified 2026-04-11)

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Runtime** | Node.js | v22.22.2 | âš ï¸ v22+ has a DNS SRV bug on Windows — `index.js` sets `dns.setServers(['8.8.8.8','8.8.4.4'])` at the top as a workaround |
| **Framework** | Express.js | 4.21.2 | |
| **ODM** | Mongoose | 8.9.2 | |
| **Database** | MongoDB Atlas | managed (M0 free tier) | SRV connection string: `mongodb+srv://` |
| **Auth** | jsonwebtoken | 9.0.2 | |
| **Security** | helmet | 8.1.0 | |
| **Rate limiting** | express-rate-limit | 8.3.1 | |
| **Config** | dotenv | 16.4.5 | |

> When suggesting Node.js changes or debugging DNS/network issues, always check this version first.

> Load this file when: adding a new entity type, adding new fields to an existing entity, changing CRUD logic in a data service, creating a new data service, or building any UI that reads/writes persisted data.

> **Security**: Backend API security rules (JWT, rate-limiting, PBKDF2, etc.) live in `standards-security.md §9–17`. Do not duplicate them here.

---

## 1 — Collection Registry

> **Canonical reference.** `BACKUP_ENTITY_TYPES` in `src/app/core/services/async-storage.service.ts` is the code-level source of truth. This table must stay in sync with it.

| `entityType` key | Domain | Purpose |
|---|---|---|
| `PRODUCT_LIST` | Kitchen | Ingredients / raw products |
| `RECIPE_LIST` | Kitchen | Recipes |
| `DISH_LIST` | Kitchen | Plated dishes |
| `KITCHEN_SUPPLIERS` | Kitchen | Supplier directory |
| `EQUIPMENT_LIST` | Kitchen | Kitchen equipment |
| `VENUE_PROFILES` | Venue | Event venue profiles |
| `MENU_EVENT_LIST` | Menu | Menu events |
| `TRASH_RECIPES` | Trash | Soft-deleted recipes |
| `TRASH_DISHES` | Trash | Soft-deleted dishes |
| `TRASH_PRODUCTS` | Trash | Soft-deleted products |
| `TRASH_EQUIPMENT` | Trash | Soft-deleted equipment |
| `TRASH_VENUES` | Trash | Soft-deleted venues |
| `TRASH_MENU_EVENTS` | Trash | Soft-deleted menu events |
| `VERSION_HISTORY` | System | Schema/version snapshots |
| `activity_log` | System | Activity log entries (`ACTIVITY_STORAGE_KEY`) |
| `KITCHEN_UNITS` | Registry | Unit of measure registry |
| `KITCHEN_PREPARATIONS` | Registry | Preparation method registry |
| `KITCHEN_CATEGORIES` | Registry | Category registry |
| `KITCHEN_ALLERGENS` | Registry | Allergen registry |
| `KITCHEN_LABELS` | Registry | Label registry |
| `MENU_TYPES` | Registry | Menu type registry |
| `MENU_SECTION_CATEGORIES` | Registry | Menu section category registry |

**22 entity types total.**

---

## 2 — When This Applies

Load this standard when a plan or feature involves any of:

- Adding a new entity type
- Adding new fields to an existing entity
- Changing CRUD logic in a data service
- Creating a new data service
- Building any UI that reads or writes persisted data

---

## 3 — New Collection Checklist

When a feature needs a new persisted entity type:

1. Add the TypeScript model to `src/app/core/models/`
2. Create a data service extending `BaseEntityDataService` (or custom if registry-doc pattern)
3. Choose an `entityType` key: `SCREAMING_SNAKE_CASE`, domain-prefixed (`KITCHEN_*`, `MENU_*`, `TRASH_*`)
4. Add the key to `BACKUP_ENTITY_TYPES` in `async-storage.service.ts`
5. Add a `reloadFromStorage()` method and wire it into `UserService`'s post-login/logout data-reload flow (`user.service.ts`)
6. **No server changes needed** — generic routes use native `collection(type)` access (no Mongoose model for entity types; `server/routes/generic.js` calls `mongoose.connection.db.collection(type)` directly)
7. If the new entity needs a dedicated endpoint beyond generic CRUD, add it to `server/routes/` and document it in this file

---

## 4 — Existing Feature Persistence Check

When modifying an existing feature:

- Identify which `entityType` the feature reads/writes (use the registry table above)
- Confirm the data service already handles the CRUD path
- **Adding new fields**: no backend migration needed (schema-less `Mixed` storage) — update the TypeScript model only
- **Changing persisted data shape**: consider backward compatibility for existing documents in both localStorage and MongoDB

---

## 5 — Backend API Contract

Write routes (`POST`/`PUT`/`DELETE`) require `Authorization: Bearer <token>`. `GET` reads
are intentionally public/optional-auth (`optionalToken` middleware): an authenticated
request returns the caller's own documents; an anonymous request returns `__master__`
(shared catalog) documents. This is a deliberate product decision (confirmed 2026-09-29,
Plan 321 Phase 1) — not the drift it used to look like against an earlier, incorrect
version of this section (and of `standards-security.md §9`, corrected the same day).

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/data/:type` | optional | List all — authed: own docs; anonymous: `__master__` docs |
| `GET` | `/api/v1/data/:type/:id` | optional | Get one — same auth split as above |
| `GET` | `/api/v1/data/:type/search` | optional | Lean prefix-match typeahead, `SEARCHABLE_ENTITY_TYPES` only |
| `GET` | `/api/v1/data/:type/count` | optional | Lightweight count, `filter=lowStock\|unapproved` |
| `POST` | `/api/v1/data/:type` | required | Create. Server generates `_id` unless the body already supplies one (Plan 321 Phase 1 — a client-supplied id is still honored, e.g. `appendExisting`/trash-restore) |
| `PUT` | `/api/v1/data/:type/:id` | required | Replace one — mirrors `StorageService.put()` |
| `PUT` | `/api/v1/data/:type/:id/push-to-master` | required | **Deliberately open to any signed-in user for now** — see the route's own doc comment in `generic.js` |
| `PUT` | `/api/v1/data/:type` | required | Replace all (requires `X-Confirm-Replace: true` header) — restricted (Plan 321 Phase 1) to `REPLACEABLE_TYPES` in `generic.js`, not every entity type |
| `DELETE` | `/api/v1/data/:type/bulk` | required | Remove many by id |
| `DELETE` | `/api/v1/data/:type/:id` | required | Remove one |

Plan 321 Phase 1 also added rate limiting: a moderate write limit on `/api/v1/data`
(300 req/15 min, writes only) and a strict per-user limit on `/api/v1/ai` (20 req/15 min,
keyed by `userId`) — see `dataWriteLimiter` in `generic.js` and `aiLimiter` in `ai.js`.

> Allowlist guard: only types in `ALL_USER_ENTITY_TYPES` (`server/constants/all-user-entity-types.js`) are reachable through the generic router — everything else, including `signed-users-db`, `users` (auth router only), and `GEMINI_SHOTS`/`GEMINI_USAGE` (`ai.js` only), returns `403`. Adding a new entity type means adding it to `ALL_USER_ENTITY_TYPES` first.

---

## 6 — Plan Annotation Rule

Every implementation plan that touches persisted data **MUST** include a `## Backend Impact` section:

```markdown
## Backend Impact
- Collections affected: [list entityType keys]
- New collections: [yes/no — if yes, list with justification]
- Server changes needed: [yes/no — if yes, describe]
```

If the answer to all three is "no impact", write `## Backend Impact — None` explicitly. This makes the decision visible rather than assumed.

---

## 7 — Backup & Restore

Before any destructive data operation (a legacy re-import, a bulk repair, a schema migration),
take a full snapshot with `server/scripts/db-backup.js`, and prove it's actually usable with
`server/scripts/db-restore.js` — a snapshot that's never been restored is not a rollback path,
it's a hope. `mongodump`/`mongorestore` are not installed; these two scripts are the only way
back on this project (Atlas is on the free M0 tier, which has no point-in-time restore).

```powershell
# Full JSON snapshot (Extended JSON — dates/ObjectIds/Decimal128 survive the round trip).
# Written OUTSIDE the repo by default (../foodvibe-db-backups/<target>-<timestamp>/) —
# a snapshot contains real user data and must never be committed.
node server/scripts/db-backup.js --target=local
node server/scripts/db-backup.js --target=atlas   # read-only against Atlas — still confirm the masked host with the Human first

# Restore a snapshot into a named SCRATCH database — never over the source. Refuses to run
# if --db matches the source database name, and refuses to restore into a database that
# already has collections in it. Prints a per-collection document-count comparison against
# the snapshot's _manifest.json and exits non-zero on any mismatch.
node server/scripts/db-restore.js --target=local --dir="<snapshot dir>" --db=foodvibe_scratch_<label>
```

Drop the scratch database manually when done (`db.dropDatabase()` via `mongosh` or the driver) —
the restore script deliberately leaves it in place for inspection rather than auto-cleaning.
Note: the app's own DB user may not hold `dropDatabase`/`dropCollection` privileges outside its
primary database (least-privilege by design) — if so, drop the scratch DB with an admin-scoped
connection instead.

`db-backup.js` filters out Mongo's internal `system.*` namespaces (e.g. `system.views`, which
`RECIPE_BOOK_VIEW` — an actual DB view — causes to appear in `listCollections()`); reading them
needs privileges the app DB user doesn't have and they hold no user data of their own.

