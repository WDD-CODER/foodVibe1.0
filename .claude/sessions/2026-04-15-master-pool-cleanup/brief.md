## Goal
Stop user POSTs from polluting the __master__ pool, remove the cleanup machinery that was mopping up that pollution, and add deletion tombstones so deleted master-seeded items don't re-appear on next login.

## Scope
- `server/routes/generic.js` — POST (remove dual-write + collision branch), GET-by-id (simplify to 1 layer + tombstone filter), GET list (tombstone filter), DELETE (tombstone logic)
- `server/services/sync-master.js` — delete `cleanupNameCollisionClones` function; update module.exports
- `server/routes/auth.js` — remove all 3 calls to `cleanupNameCollisionClones`; remove from destructured import

## Out of Scope
- `cloneMasterDataToUser` — signup behavior is correct, no changes
- `syncMasterToUser` _userModified logic — no changes to sync rules
- Any frontend service — server-side changes are transparent to clients
- `optionalToken` middleware — unauthenticated reads still hit master
- Data backfill/migration — existing master pollution stays, users can delete it
- Admin analytics/aggregation endpoint

## Success Criteria
- [ ] Signed-in user creates a product → single doc in their userId, nothing in __master__
- [ ] User deletes a master-seeded item → tombstone (_userDeleted: true), invisible to client, does NOT re-appear after logout/login
- [ ] User deletes their own item → hard delete
- [ ] Admin updates a __master__ doc → unmodified user clone reflects change on next login (rule 2 unchanged)
- [ ] Admin adds a new __master__ doc → user gets a clone on next login UNLESS they have a tombstone for it
- [ ] `grep -r cleanupNameCollisionClones server/` returns nothing
- [ ] GET-by-id has a single findOne, not three

## Session ID
2026-04-15-master-pool-cleanup
