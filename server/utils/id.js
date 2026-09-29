'use strict';
/**
 * Single server-side id generator. Plan 321 Phase 1 replaces the 5 separate
 * `makeId(length)` (62^5 ≈ 916M space, collision risk grows with every clone)
 * implementations that used to live in auth.js, generic.js, clone-master.js,
 * seed-master.js, and sync-master.js with this one `crypto.randomUUID()`-backed
 * generator. Existing short ids already in the DB are left as-is — this only
 * affects newly created documents from here on. Not used by
 * `server/scripts/legacy-import/**` (v1-only, retired in Phase 2b Step 4).
 */

const { randomUUID } = require('crypto');

function newId() {
  return randomUUID();
}

module.exports = { newId };
