/**
 * Clones all master documents into a new user's namespace.
 * Called once at signup — gives the user a full starter-kit copy.
 *
 * Architecture note:
 *   Documents are stored flat in per-type native MongoDB collections.
 *   There is no Mongoose Entity model and no `data` wrapper — the doc IS the entity.
 *   `_masterId` records the source doc's _id so sync-master can track lineage.
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
 * Clones all `userId: '__master__'` documents from every CLONEABLE_TYPES collection
 * into the given user's namespace.
 *
 * @param {string} userId  — the new user's _id
 * @returns {Promise<number>} total number of documents cloned
 */
async function cloneMasterDataToUser(userId) {
  const db = mongoose.connection.db;
  let totalCloned = 0;

  for (const entityType of CLONEABLE_TYPES) {
    const col = db.collection(entityType);
    const masterDocs = await col.find({ userId: '__master__' }).toArray();

    if (masterDocs.length === 0) continue;

    const clones = masterDocs.map(doc => {
      const newId = makeId();
      // Strip master-specific fields; assign new identity
      const { _id: masterId, userId: _u, _masterId: _m, _userModified: _um, ...rest } = doc;
      return {
        ...rest,
        _id: newId,
        userId,
        _masterId: String(masterId),
        _userModified: false,
      };
    });

    await col.insertMany(clones, { ordered: false });
    totalCloned += clones.length;
  }

  return totalCloned;
}

module.exports = { cloneMasterDataToUser };
