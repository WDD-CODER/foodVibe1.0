---
name: Master Pool Cleanup + Deletion Tombstones
overview: Stop user POSTs from polluting the __master__ pool, remove cleanup machinery, and add deletion tombstones so deleted master-seeded items don't re-appear on next login.
todos:
  - Task 1: server/routes/generic.js — replace POST handler body
  - Task 2: server/routes/generic.js — simplify GET /:type/:id to single findOne
  - Task 3: server/routes/generic.js — add tombstone filter to GET /:type list
  - Task 4: server/routes/generic.js — tombstone/hard-delete branching in DELETE
  - Task 5: server/services/sync-master.js — delete cleanupNameCollisionClones
  - Task 6: server/routes/auth.js — remove import + 3 call sites
  - Task 7: verify grep + no syntax errors
isProject: false
---

## Goal

Stop user POSTs from polluting the `__master__` pool, remove the cleanup/fallback machinery that mopped up that pollution, and add deletion tombstones so deleted master-seeded items don't re-appear on next login.

## Session
`.claude/sessions/2026-04-15-master-pool-cleanup/brief.md`

## Rules
- Do NOT touch `cloneMasterDataToUser` — signup behavior is correct as-is
- Do NOT touch `_userModified` sync logic in `syncMasterToUser`
- Do NOT change any frontend service
- Do NOT change `optionalToken` middleware behavior
- No data backfill/migration of existing master pollution
- JS style: single quotes, match existing server patterns

## Verification Findings (from plan-implementation)
- `server/services/sync-master.js` is the correct filename (brief had `master-sync.js` — typo)
- Tombstone MUST include `_userModified: true` (not just `_userDeleted: true`) so syncMasterToUser Rule 3 skips it; otherwise Rule 2 fires because `!undefined` is truthy
- `userDocs` query in syncMasterToUser (`_masterId: { $ne: null }`) already includes tombstones — no change to sync needed

---

## Atomic Sub-tasks

### Task 1 — `server/routes/generic.js` POST handler

Replace the entire POST handler body with the simplified version:

```js
router.post('/:type', verifyToken, async (req, res) => {
  try {
    const entity = req.body;
    if (!entity._id) {
      return res.status(400).json({ error: '_id is required in the request body' });
    }

    const entityType = req.params.type;
    const { userId: _u, _masterId: _m, _userModified: _um, ...safeEntity } = entity;

    const doc = {
      ...safeEntity,
      userId: req.user.userId,
      _masterId: safeEntity._id,
      _userModified: false,
    };

    await col(entityType).insertOne(doc);
    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Entity already exists' });
    }
    console.error('[data/post]', err);
    res.status(500).json({ error: 'Server error' });
  }
});
```

What changes:
- Removed: PRODUCT_LIST collision detection block (old lines 114–158)
- Removed: `name_hebrew_normalized` computation (old lines 169–172)
- Removed: master-copy insert + try/catch (old lines 176–200)
- Changed: `_masterId: null` → `_masterId: safeEntity._id` (self-referential for user-originated items; tombstone logic uses `_masterId !== _id` to distinguish master-clones)

---

### Task 2 — `server/routes/generic.js` GET `/:type/:id`

Keep the `userId` resolution (`const userId = req.user ? req.user.userId : '__master__'`).

Replace the three `findOne` calls (the `let doc = ...` through `if (!doc)` block) with:

```js
const doc = await col(req.params.type).findOne({
  _id: req.params.id,
  userId,
  _userDeleted: { $ne: true },
});
if (!doc) {
  return res.status(404).json({ error: `Cannot get, Item ${req.params.id} of type: ${req.params.type} does not exist` });
}
res.json(doc);
```

What changes:
- Removed: fallback layer 2 (`_masterId: req.params.id, userId`)
- Removed: fallback layer 3 (`_id: req.params.id, userId: '__master__'`)
- Added: `_userDeleted: { $ne: true }` filter — tombstones return 404

---

### Task 3 — `server/routes/generic.js` GET `/:type` list

Change:
```js
.find({ userId })
```
to:
```js
.find({ userId, _userDeleted: { $ne: true } })
```

---

### Task 4 — `server/routes/generic.js` DELETE `/:type/:id`

Keep the outer `try { ... } catch (err)` wrapper. Replace only the inner logic:

```js
const existing = await col(req.params.type).findOne({
  _id: req.params.id,
  userId: req.user.userId,
});
if (!existing) {
  return res.status(404).json({ error: `Cannot remove, item ${req.params.id} of type: ${req.params.type} does not exist` });
}

const isMasterClone = existing._masterId && existing._masterId !== existing._id;

if (isMasterClone) {
  // Tombstone: preserve lineage so sync doesn't re-clone this item
  await col(req.params.type).replaceOne(
    { _id: req.params.id, userId: req.user.userId },
    { _id: req.params.id, userId: req.user.userId, _masterId: existing._masterId, _userDeleted: true, _userModified: true }
  );
} else {
  // Hard delete: user-originated item or legacy (no _masterId)
  await col(req.params.type).deleteOne({ _id: req.params.id, userId: req.user.userId });
}

res.json({ ok: true });
```

Tombstone includes `_userModified: true` so `syncMasterToUser` Rule 3 treats deletion as a user-choice-wins scenario and never re-clones the item.

---

### Task 5 — `server/services/sync-master.js`

1. Delete the entire `cleanupNameCollisionClones` function — from its JSDoc comment through the closing `}` (old lines 179–217).

2. Update the last line:
   - From: `module.exports = { syncMasterToUser, cleanupNameCollisionClones };`
   - To: `module.exports = { syncMasterToUser };`

---

### Task 6 — `server/routes/auth.js`

1. Import line — change:
   ```js
   const { syncMasterToUser, cleanupNameCollisionClones } = require('../services/sync-master');
   ```
   to:
   ```js
   const { syncMasterToUser } = require('../services/sync-master');
   ```

2. Login handler try-block — change:
   ```js
   await cleanupNameCollisionClones(user._id);
   await syncMasterToUser(user._id);
   ```
   to:
   ```js
   await syncMasterToUser(user._id);
   ```

3. Refresh handler try-block — same change (identical two-line pattern).

4. Guest handler try-block — change:
   ```js
   await cleanupNameCollisionClones('dev-guest');
   await syncMasterToUser('dev-guest');
   ```
   to:
   ```js
   await syncMasterToUser('dev-guest');
   ```

Keep all wrapping `try { ... } catch (syncErr)` blocks unchanged.

---

### Task 7 — Verify

```bash
grep -r cleanupNameCollisionClones server/
# Must return nothing

node -e "require('./server/routes/generic.js')" 2>&1
node -e "require('./server/routes/auth.js')" 2>&1
node -e "require('./server/services/sync-master.js')" 2>&1
# Must return nothing (no syntax/require errors)
```

---

## Done When

- [ ] Signed-in user creates a product → single doc under their `userId`, nothing in `__master__`
- [ ] User deletes a master-seeded item → tombstone (`_userDeleted: true`), invisible to client, does NOT re-appear after logout/login
- [ ] User deletes their own item → hard-deleted
- [ ] Admin updates a `__master__` doc → unmodified user clone reflects change on next login (rule 2 unchanged)
- [ ] Admin adds a new `__master__` doc → user gets a clone on login UNLESS they have a tombstone for it
- [ ] `grep -r cleanupNameCollisionClones server/` returns nothing
- [ ] GET-by-id has a single `findOne` call, not three

## Out of Scope (Nice-to-Have Noted)
- `PUT /:type` bulk-replace nukes tombstones (backup-restore edge case)
- `PUT /:type/:id` tombstone guard (frontend never sees tombstones, so unreachable in practice)
- Admin analytics/aggregation endpoint
