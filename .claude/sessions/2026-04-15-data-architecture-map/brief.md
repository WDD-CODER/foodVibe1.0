## Goal
Produce a complete data-architecture map of the current app so the planner can diagnose ownership/scope issues.

## Scope
- `src/environments/environment.ts`
- `server/index.js` (or `app.js`)
- `server/models/` — all Mongoose schema files
- `server/routes/generic.js` + any other route files
- `server/routes/auth.js` + any seed/default files
- `src/app/core/services/` — all domain data services
- `src/app/core/services/async-storage.service.ts`
- Auth service (current user ID exposure)

## Out of Scope
- No code changes
- No recommendations
- No architectural analysis beyond the 8 specified report items

## Success Criteria
- [ ] Storage modes (dev / dev:local / dev:remote) listed with storage type
- [ ] Every Mongoose schema in server/models/ documented with fields, ownership fields, indexes
- [ ] Every GET endpoint documented with route, query, auth requirement
- [ ] Every POST/PUT/PATCH/DELETE documented with route, what it writes, auth requirement
- [ ] Signup seeding documented — what collections/documents are created
- [ ] Every domain data service in src/app/core/services/ documented
- [ ] AsyncStorageService full file pasted
- [ ] Auth service currentUser ID signal documented

## Session ID
2026-04-15-data-architecture-map
