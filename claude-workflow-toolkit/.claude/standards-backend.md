---
name: standards-backend
description: Backend collection registry, API contract, and persistence rules. Load when any feature adds, modifies, or removes persisted data.
---

# Backend Persistence Standards

> Load this file when: adding a new entity type, adding new fields to an existing entity, changing CRUD logic in a data service, creating a new data service, or building any UI that reads/writes persisted data.

> **Security**: Backend API security rules (JWT, rate-limiting, hashing, etc.) live in `standards-security.md`. Do not duplicate them here.

---

## 1 — Collection Registry

> **Canonical reference.** `[DOMAIN_SERVICE_NAME]` is the code-level source of truth. This table must stay in sync with it.

<!-- [PROJECT_SPECIFIC] Entity Registry -->
<!-- List your project's entity types here -->
<!-- Example format: -->
<!--
| `[DB_ENTITY_TYPE]` key | Domain | Purpose |
|---|---|---|
| `USER_LIST` | Users | User accounts |
| `PRODUCT_LIST` | Products | Product catalog |
-->

| `[DB_ENTITY_TYPE]` key | Domain | Purpose |
|---|---|---|
| [REPLACE with your entity types] | | |

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

1. Add the model/interface to your models directory
2. Create a data service following your project's service pattern
3. Choose a `[DB_ENTITY_TYPE]` key: `SCREAMING_SNAKE_CASE`, domain-prefixed
4. Register the key in `[DOMAIN_SERVICE_NAME]`
5. Add a `reloadFromStorage()` method and wire it into any backup/restore service
6. If the new entity needs a dedicated endpoint beyond generic CRUD, add it to the server routes and document it in this file

---

## 4 — Existing Feature Persistence Check

When modifying an existing feature:

- Identify which `[DB_ENTITY_TYPE]` the feature reads/writes (use the registry table above)
- Confirm the data service already handles the CRUD path
- **Adding new fields**: consider whether schema migration is needed — update the model/interface
- **Changing persisted data shape**: consider backward compatibility for existing documents

---

## 5 — Backend API Contract

All routes require `Authorization: Bearer <token>` (see `standards-security.md` — authenticated reads, no public endpoints).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/data/:type` | List all |
| `GET` | `/api/v1/data/:type/:id` | Get one |
| `POST` | `/api/v1/data/:type` | Create |
| `PUT` | `/api/v1/data/:type/:id` | Replace one |
| `PUT` | `/api/v1/data/:type` | Replace all (requires confirmation header) |
| `DELETE` | `/api/v1/data/:type/:id` | Remove one |

> [PROJECT_SPECIFIC] Adapt this API contract to match your [BACKEND_STACK] routes.

---

## 6 — Plan Annotation Rule

Every implementation plan that touches persisted data **MUST** include a `## Backend Impact` section:

```markdown
## Backend Impact
- Collections affected: [list [DB_ENTITY_TYPE] keys]
- New collections: [yes/no — if yes, list with justification]
- Server changes needed: [yes/no — if yes, describe]
```

If the answer to all three is "no impact", write `## Backend Impact — None` explicitly. This makes the decision visible rather than assumed.
