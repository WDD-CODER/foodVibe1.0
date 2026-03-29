---
name: standards-backend
description: Backend collection registry, API contract, and persistence rules. Load when any feature adds, modifies, or removes persisted data.
---

# Backend Persistence Standards

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
5. Add a `reloadFromStorage()` method and wire it into `BackupService.reloadAllDataServices()`
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

All routes require `Authorization: Bearer <token>` (see `standards-security.md §9` — authenticated reads, no public endpoints).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/data/:type` | List all — mirrors `StorageService.query()` |
| `GET` | `/api/v1/data/:type/:id` | Get one — mirrors `StorageService.get()` |
| `POST` | `/api/v1/data/:type` | Create (body must include `_id`) |
| `PUT` | `/api/v1/data/:type/:id` | Replace one — mirrors `StorageService.put()` |
| `PUT` | `/api/v1/data/:type` | Replace all (requires `X-Confirm-Replace: true` header) |
| `DELETE` | `/api/v1/data/:type/:id` | Remove one |

> `BLOCKED_ENTITY_TYPES`: `signed-users-db` and `users` return `403` from the generic router — managed exclusively by the auth router.

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
