## Goal
Fix the 4 identified performance bottlenecks causing slow load times on the remote (Render + Atlas) deployment.

## Scope
- `server/db.js` — add `userId` indexes to all 14 CLONEABLE_TYPES collections on connect
- `server/routes/auth.js` — remove blocking `await` on `syncMasterToUser` for token refresh endpoint
- `server/services/sync-master.js` — replace sequential `updateOne` loop with `bulkWrite`

## Out of Scope
- UptimeRobot keepalive (external dashboard — no code change)
- Pagination or batching of the Angular data-load calls (separate brief)
- Render tier upgrade
- Changing the sync-on-login behavior (login still awaits sync so data is ready)

## Success Criteria
- [ ] `server/db.js`: after `mongoose.connect`, creates compound index `{ userId: 1 }` on all 14 collections in `CLONEABLE_TYPES` (plus `users` collection index on `name` and `email`) — uses `{ background: true }` so re-index on a live Atlas cluster is non-blocking
- [ ] `server/routes/auth.js` `/refresh` endpoint: `syncMasterToUser` is fire-and-forget (no `await`) — login response is sent immediately, sync runs in background
- [ ] `server/services/sync-master.js`: the `toUpdate` sequential loop is replaced by a single `col.bulkWrite()` call
- [ ] No existing tests broken; server starts cleanly with `npm run dev` in `server/`

## Session ID
2026-04-17-atlas-performance-fixes
