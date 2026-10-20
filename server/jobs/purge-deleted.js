'use strict';
/**
 * Plan 407 — one soft-delete model.
 *
 * Deleting stamps `deletedAt` / `deletedBy` on the document itself; Trash lists those, restore
 * unsets them. Removing a document for good ("dispose", empty Trash, or the 30-day purge) hard-
 * deletes it, except a user's copy of a shared (__master__) item: that one shrinks to a stub
 * (`_masterId` + `deletedAt` + `purgedAt`) so the login sync never clones it back.
 */

const { SOFT_DELETE_TYPES } = require('../constants/collections');

const MASTER = '__master__';
const PURGE_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Live documents only — every read and write of user data goes through this. */
const LIVE = Object.freeze({ deletedAt: { $exists: false } });
/** Documents shown in Trash: deleted, not yet purged to a stub. */
const IN_TRASH = Object.freeze({ deletedAt: { $exists: true }, purgedAt: { $exists: false } });

/** True for a user's copy of a shared item (its `_masterId` points at another doc). */
function isMasterClone(doc) {
  return doc.userId !== MASTER && typeof doc._masterId === 'string' && doc._masterId !== doc._id;
}

/** The stub a purged master clone leaves behind. */
function toStub(doc, now) {
  return {
    _id: doc._id,
    schemaVersion: 2,
    userId: doc.userId,
    _masterId: doc._masterId,
    _userModified: true,
    deletedAt: typeof doc.deletedAt === 'number' ? doc.deletedAt : now,
    ...(typeof doc.deletedBy === 'string' && { deletedBy: doc.deletedBy }),
    purgedAt: now,
  };
}

/** Removes one document for good: a stub for a master clone, a hard delete otherwise. */
async function disposeDoc(collection, doc, now = Date.now()) {
  if (isMasterClone(doc)) {
    await collection.replaceOne({ _id: doc._id, userId: doc.userId }, toStub(doc, now));
  } else {
    await collection.deleteOne({ _id: doc._id, userId: doc.userId });
  }
}

/**
 * Disposes every document deleted more than PURGE_AFTER_DAYS ago (counted from its own
 * `deletedAt`). `owners` limits it to some userIds (the Trash read passes the caller + master).
 * @returns {Promise<Record<string, number>>} disposed count per collection
 */
async function purgeExpired(db, { owners, types = SOFT_DELETE_TYPES, now = Date.now(), days = PURGE_AFTER_DAYS } = {}) {
  const counts = {};
  const filter = {
    deletedAt: { $lt: now - days * DAY_MS },
    purgedAt: { $exists: false },
    ...(owners && { userId: { $in: owners } }),
  };
  for (const type of types) {
    const col = db.collection(type);
    const docs = await col.find(filter, { projection: { _id: 1, userId: 1, _masterId: 1, deletedAt: 1, deletedBy: 1 } }).toArray();
    for (const doc of docs) await disposeDoc(col, doc, now);
    counts[type] = docs.length;
  }
  return counts;
}

module.exports = { LIVE, IN_TRASH, MASTER, PURGE_AFTER_DAYS, isMasterClone, toStub, disposeDoc, purgeExpired };
