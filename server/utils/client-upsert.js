'use strict';
/**
 * Plan 545 (C-CONTACT, R-01): the one find-or-create of a client by phone, so one person is one client on every
 * channel. Matches on `phoneKey` over live, unmerged clients of one business; the unique partial index on
 * `{ businessId, liveKey }` makes two racing creates leave exactly one (the loser joins the winner).
 * `businessId` always comes from the caller's token (or the server-resolved business), never from a body.
 */

const { newId } = require('./id');
const { parseV2 } = require('./schema-check');
const { normalizePhone, phoneKey } = require('../generated/schemas/phone');
const { CLIENT_SOURCES } = require('../generated/schemas/entities/client.schema');

const PHONE_TAKEN = Object.freeze({ error: 'PHONE_TAKEN', messageKey: 'client_phone_taken' });
const LIVE_UNMERGED = Object.freeze({ deletedAt: { $exists: false }, mergedInto: { $exists: false } });

/** The oldest live, unmerged client of `businessId` with `phoneKey === key` (other than `exceptId`), or null. */
async function findLiveClientByPhoneKey(db, businessId, key, exceptId = null) {
  if (!key) return null;
  const col = typeof db.collection === 'function' ? db.collection('clients') : db;
  return col.findOne(
    { businessId, phoneKey: key, ...LIVE_UNMERGED, ...(exceptId != null && { _id: { $ne: exceptId } }) },
    { sort: { createdAt: 1, _id: 1 } }
  );
}

/** Inserts `doc` with `liveKey = phoneKey`; when the index refuses it, returns the live client that holds the key. */
async function insertClientOrJoin(db, doc) {
  const col = typeof db.collection === 'function' ? db.collection('clients') : db;
  doc.liveKey = doc.phoneKey;
  try {
    await col.insertOne(doc);
    return { client: doc, created: true };
  } catch (err) {
    if (err && err.code === 11000) {
      const found = await findLiveClientByPhoneKey(col, doc.businessId, doc.phoneKey);
      if (found) return { client: found, created: false };
    }
    throw err;
  }
}

function badClient(issues) {
  return Object.assign(new Error('BAD_CLIENT'), { code: 'BAD_CLIENT', issues });
}

/**
 * Finds the live client of `businessId` with this phone, or creates one. A found client is returned unchanged
 * (its name is never overwritten). `actor` is `actorOf(req)` (`{ userId, name }`) or a `guestActor(...)` string.
 */
async function upsertClientByPhone(db, businessId, { name, phone, source, actor }) {
  if (!CLIENT_SOURCES.includes(source)) throw badClient([{ path: 'source', code: 'invalid_enum_value', message: 'unknown source' }]);
  const normalized = normalizePhone(phone);
  const key = phoneKey(normalized);
  const existing = await findLiveClientByPhoneKey(db, businessId, key);
  if (existing) return { client: existing, created: false };

  const now = Date.now();
  const member = actor && typeof actor === 'object';
  const doc = {
    _id: newId(),
    schemaVersion: 2,
    businessId,
    createdBy: member ? actor.userId : actor,
    ...(member && { userId: actor.userId }),
    createdAt: now,
    updatedAt: now,
    name,
    phone,
    phoneNormalized: normalized,
    phoneKey: key,
    clientType: 'private',
    source,
    firstSeenAt: now,
    counters: { requests: 0, bookings: 0, events: 0, noShows: 0, conversations: 0 },
  };
  const check = parseV2('clients', doc);
  if (!check.success || !key) throw badClient(check.issues);
  return insertClientOrJoin(db, doc);
}

/** Sets each client's `counters.events` to its live events and keeps `kinds` `event_client` exactly while > 0. */
async function refreshClientEvents(db, businessId, clientIds) {
  const ids = [...new Set((clientIds ?? []).filter((id) => typeof id === 'string' && id))];
  const clients = db.collection('clients');
  const events = db.collection('menuEvents');
  for (const id of ids) {
    const n = await events.countDocuments({ businessId, clientId: id, deletedAt: { $exists: false } });
    await clients.updateOne(
      { _id: id, businessId },
      {
        $set: { 'counters.events': n, updatedAt: Date.now() },
        ...(n > 0 ? { $addToSet: { kinds: 'event_client' } } : { $pull: { kinds: 'event_client' } }),
      }
    );
  }
}

module.exports = {
  normalizePhone,
  phoneKey,
  PHONE_TAKEN,
  LIVE_UNMERGED,
  findLiveClientByPhoneKey,
  insertClientOrJoin,
  upsertClientByPhone,
  refreshClientEvents,
};
