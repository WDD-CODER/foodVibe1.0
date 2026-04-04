/**
 * Syncs master document updates into a user's namespace on login.
 * Respects user modifications — never overwrites user-edited documents.
 *
 * Sync rules (applied per document per collection):
 *   1. New master item (no matching _masterId in user data)   → clone to user
 *   2. Unchanged clone (_userModified: false) with stale data → overwrite with latest master
 *   3. User-modified clone (_userModified: true)              → skip (user's version wins)
 *   4. Deleted master item                                    → skip (no removal from user)
 */

'use strict';

const mongoose = require('mongoose');
const { CLONEABLE_TYPES } = require('../constants/cloneable-types');

function makeId(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/**
 * Syncs master data changes into the given user's namespace.
 *
 * @param {string} userId
 * @returns {Promise<{ inserted: number, updated: number }>}
 */
async function syncMasterToUser(userId) {
  const db = mongoose.connection.db;
  let totalInserted = 0;
  let totalUpdated = 0;

  for (const entityType of CLONEABLE_TYPES) {
    const col = db.collection(entityType);

    const [masterDocs, userDocs] = await Promise.all([
      col.find({ userId: '__master__' }).toArray(),
      col.find({ userId, _masterId: { $ne: null } }).toArray(),
    ]);

    if (masterDocs.length === 0) continue;

    // Build lookup: _masterId string → user doc
    const userByMasterId = new Map();
    for (const ud of userDocs) {
      userByMasterId.set(String(ud._masterId), ud);
    }

    const toInsert = [];
    const toUpdate = [];

    for (const master of masterDocs) {
      const masterId = String(master._id);
      const existing = userByMasterId.get(masterId);

      if (!existing) {
        // Rule 1: new master item — clone to user
        const newId = makeId();
        const { _id: _mid, userId: _u, _masterId: _m, _userModified: _um, ...rest } = master;
        toInsert.push({
          ...rest,
          _id: newId,
          userId,
          _masterId: masterId,
          _userModified: false,
        });
      } else if (!existing._userModified) {
        // Rule 2: unmodified clone — overwrite with latest master data
        const { _id: _mid, userId: _u, _masterId: _m, _userModified: _um, ...masterRest } = master;
        toUpdate.push({
          filter: { _id: existing._id },
          update: { $set: { ...masterRest, _userModified: false } },
        });
      }
      // Rule 3: _userModified === true → skip
      // Rule 4: deleted master items → skip (absence in masterDocs means no action)
    }

    if (toInsert.length > 0) {
      await col.insertMany(toInsert, { ordered: false });
      totalInserted += toInsert.length;
    }

    for (const op of toUpdate) {
      await col.updateOne(op.filter, op.update);
    }
    totalUpdated += toUpdate.length;
  }

  return { inserted: totalInserted, updated: totalUpdated };
}

module.exports = { syncMasterToUser };
