# Plan 299 — Generic Routes Fail-Safe Hardening

## Goal

Make `server/routes/generic.js` fail safely: no destructive write without a verified
successful replacement, no arbitrary collection creation, no silent save onto a deleted
document.

## Author / role

Human-authored brief (pasted structured brief, routed here via `brief-detection` →
`b. Execute as-is`). Backend-only (`server/`), CommonJS — no Angular/TS conventions apply.
Single cohesive milestone — the five code changes are interdependent (allowlist swap
requires the client-caller reconciliation to land first, or newly-blocked types silently
break UI screens).

## Files touched

- `server/routes/generic.js` — allowlist guard, atomic bulk replace, tombstone filter fix
- `server/constants/all-user-entity-types.js` — add two entity types missed by the
  existing allowlist (discovered during client-caller reconciliation, see M1b)

## Milestones

| ID | Status | Deliverable |
| --- | --- | --- |
| M1 | [x] | Allowlist guard + atomic bulk replace + tombstone fix, verified against every real client caller |

---

### M1 — Fail-safe hardening

**Files:** `server/routes/generic.js`, `server/constants/all-user-entity-types.js`

- [x] M1a Replace `BLOCKED_ENTITY_TYPES` blocklist (lines 11-17) with an allowlist check
      against `ALL_USER_ENTITY_TYPES` (imported the same way as `admin.js:5`), returning 403
      for anything not listed. Confirm `signed-users-db`, `users`, `GEMINI_SHOTS`,
      `GEMINI_USAGE` stay absent from the allowlist (verified: none present today).
- [x] M1b Reconcile every literal storage key passed to `StorageService.query/put/post/replaceAll`
      in `src/app/core/services/*.ts` against `ALL_USER_ENTITY_TYPES`. Found two real backend
      keys missing from the allowlist that would otherwise start 403'ing: `EQUIPMENT_CUSTOM_CATEGORIES`
      (`equipment-category-registry.service.ts`) and `MENU_EVENT_TYPES` (`menu-event-type.service.ts`).
      Add both to `all-user-entity-types.js`. (`cook_view_last_recipe_id` is sessionStorage-only,
      not routed through `StorageService` — excluded. `signed-users-db` stays excluded — already
      blocked today, not a caller this route is meant to serve.)
- [x] M1c `PUT /:type` (bulk replace, lines 171-218): move the conflict-id query before any
      delete (drop the `Promise.all` race), then wrap `deleteMany` + `insertMany` in a
      `mongoose.connection.startSession()` transaction (`session.withTransaction`, `{ session }`
      passed to both calls, `insertMany` becomes `{ ordered: true, session }`). On abort, respond
      500 with `{ error: 'Replace failed, no changes were made' }`. Mongoose 8.23 / MongoDB driver
      — transactions require a replica set; Atlas (prod) is always a replica set, local dev may be
      standalone. Fallback when `startSession`/`withTransaction` throws (standalone deployment):
      insert the new docs first with a `_pendingReplace: true` flag, `deleteMany` the old docs
      (`{ userId, _pendingReplace: { $ne: true } }`), then `updateMany` to unset the flag. Document
      the choice in a comment above the handler.
- [x] M1d `PUT /:type/:id` (line 151): add `_userDeleted: { $ne: true }` to the
      `findOneAndUpdate` filter so a save onto a tombstoned (soft-deleted) master-clone 404s
      instead of silently resurrecting/overwriting it — matches the `GET /:type/:id` filter at
      lines 71-75.
- [x] M1e Leave the stale POST master-propagation comment (lines 86-97) and the POST handler
      itself untouched — that gap is an open product decision, not part of this fix.

## Out of scope (explicit)

- Route registration order (`DELETE /:type/bulk` before `DELETE /:type/:id`) — unchanged.
- Reserved-field stripping (`userId`, `_masterId`, `_userModified`) in POST/PUT — unchanged.
- Referential-integrity check and tombstone-vs-hard-delete branch in `DELETE /:type/:id`
  (lines 250-270, 283-296) — unchanged.
- Client-side `StorageService`/`HttpAdapter` contract — `replaceAll` still returns
  `Promise<void>`, `X-Confirm-Replace: true` header requirement stays.

## Validation

1. `POST /api/v1/data/junk_collection` → 403, `db.getCollectionNames()` shows no new collection.
2. Loading demo data from Metadata Manager still populates all lists; killing the server
   mid-`PUT /:type` request leaves the previous data fully intact rather than empty.
3. Deleting a master-cloned recipe, then editing it from a stale tab, shows an error instead
   of a fake "saved" — and the item stays gone after refresh.
4. `ng build` passes; every existing list page (products, recipes, dishes, equipment, venues,
   suppliers) still loads its data.
