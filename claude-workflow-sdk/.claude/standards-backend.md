---
name: standards-backend
description: Backend collection registry, API contract, and persistence rules. Load when any feature adds, modifies, or removes persisted data.
---

# Backend Persistence Standards

## 0 — Tech Stack

> **[PLACEHOLDER]** Fill in your project's backend tech stack after `/init-repo`.

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Runtime** | `[RUNTIME]` | `[VERSION]` | |
| **Framework** | `[BACKEND_STACK]` | `[VERSION]` | |
| **Database** | `[DATABASE]` | `[VERSION]` | |
| **Auth** | `[AUTH_LIB]` | `[VERSION]` | |

> Load this file when: adding a new entity type, adding new fields to an existing entity, changing CRUD logic in a data service, creating a new data service, or building any UI that reads/writes persisted data.

> **Security**: Backend API security rules (JWT, rate-limiting, hashing, etc.) live in `standards-security.md`. Do not duplicate them here.

---

## 1 — Collection / Entity Registry

> **[PLACEHOLDER]** After `/init-repo`, list all persisted entity types here. This table must stay in sync with the code-level source of truth.

| `entityType` key | Domain | Purpose |
|---|---|---|
| *(add rows here)* | | |

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

1. Add the TypeScript/language model to the models directory
2. Create a data service (extending base class if applicable)
3. Choose an `entityType` key: `SCREAMING_SNAKE_CASE`, domain-prefixed
4. Add the key to the global entity type registry in the codebase
5. Add a reload/refresh method and wire it into the backup/restore service
6. Verify backend route handles the new type (or add a dedicated endpoint if needed)
7. Document in the registry table above

---

## 4 — Existing Feature Persistence Check

When modifying an existing feature:

- Identify which `entityType` the feature reads/writes (use the registry table above)
- Confirm the data service already handles the CRUD path
- **Adding new fields**: update the model only — no migration needed for schema-less storage; for schema-strict DBs, write and run a migration
- **Changing persisted data shape**: consider backward compatibility for existing documents

---

## 5 — Backend API Contract

> **[PLACEHOLDER]** Document your project's API routes here after `/init-repo`.

All routes require `Authorization: Bearer <token>` (see `standards-security.md` — authenticated reads, no public endpoints).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/data/:type` | List all |
| `GET` | `/api/v1/data/:type/:id` | Get one |
| `POST` | `/api/v1/data/:type` | Create |
| `PUT` | `/api/v1/data/:type/:id` | Replace one |
| `DELETE` | `/api/v1/data/:type/:id` | Remove one |

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
