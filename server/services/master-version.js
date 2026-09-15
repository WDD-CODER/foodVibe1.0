/**
 * Tracks a single "master data version" so syncMasterToUser (server/services/sync-master.js)
 * can skip its full multi-collection diff when nothing has changed since a user's last sync.
 *
 * Master docs (`userId: '__master__'`) are not written by any live user-facing flow — the
 * only writers are `seed-master.js` (initial seed) and the one-off scripts under
 * `server/scripts/legacy-import/`, all run manually by a developer. That makes a single
 * shared "last modified" timestamp sufficient: there is no concurrent-write race to reason
 * about, and no need to scan `updatedAt_` across every CLONEABLE_TYPES collection (most
 * existing master docs don't carry that field at all — backfilling it everywhere just to
 * compute a version would be a bigger, riskier migration than this).
 *
 * Convention: after running any script that adds/edits/removes `__master__` docs, run
 * `node server/scripts/bump-master-version.js` (or call bumpMasterVersion() directly from
 * a new script). Forgetting this only costs a slightly-stale sync on the next refresh, not
 * a correctness bug — /login and /signup always run the full sync/clone regardless of version.
 */

'use strict';

const mongoose = require('mongoose');

const COLLECTION = 'MASTER_META';
const DOC_ID = 'version';

function col() {
  return mongoose.connection.db.collection(COLLECTION);
}

/** Current master version (ms epoch of the last known master-data change). 0 if never bumped. */
async function getMasterVersion() {
  const doc = await col().findOne({ _id: DOC_ID });
  return doc?.lastModified ?? 0;
}

/** Records that master data changed now. Call after any script writes to __master__ docs. */
async function bumpMasterVersion() {
  const lastModified = Date.now();
  await col().updateOne({ _id: DOC_ID }, { $set: { lastModified } }, { upsert: true });
  return lastModified;
}

module.exports = { getMasterVersion, bumpMasterVersion };
