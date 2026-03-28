# server/ — Express Backend

## Structure
| File/Dir | Purpose |
|----------|---------|
| `index.js` | Express app entry — middleware, route mounting, static file serving, error handler |
| `db.js` | MongoDB connection via Mongoose (`MONGO_LOCAL_URI` dev / `MONGO_REMOTE_URI` prod) |
| `models/entity.model.js` | Generic entity schema: `_id` (string), `entityType`, `data` (Mixed) |
| `routes/generic.js` | Full CRUD at `/api/v1/data/:type` — mirrors Angular's `StorageService` |
| `routes/auth.js` | Login, signup, refresh, logout at `/api/v1/auth` — JWT + rate limiting |
| `routes/ai.js` | Gemini AI proxy at `/api/v1/ai` — generate + parse-text |
| `middleware/auth.js` | `verifyToken` — JWT Bearer verification, attaches `req.user` |

## Key Patterns
- **One model, many types**: All domain data (products, recipes, menus, etc.) uses the generic `Entity` model with `entityType` as discriminator (e.g. `PRODUCT_LIST`, `RECIPE_LIST`).
- **Auth required on all data routes**: `router.use(verifyToken)` gates everything in `generic.js`.
- **IDs from Angular**: `_id` is a 5-char alphanumeric string from Angular's `makeId()` — not a Mongo ObjectId.
- **New feature checklist**: Does the feature need persistence? → use existing `/api/v1/data/:type` routes. Needs custom logic? → add a new route file and mount it in `index.js`.
