'use strict';
/**
 * Plan 753 (R-26, R-27): one assistant run per conversation. The lease is the field `run` of the conversation, taken
 * and given back with conditional updates, so it holds for any number of server processes and ends by itself
 * (`RUN_LEASE_MS`) when a run dies. Logs carry ids and numbers only.
 */
const { logger } = require('../logger');
const { newId } = require('../utils/id');

const RUN_LEASE_MS = 90000;
const WAITING_MAX = 20;

const colOf = db => db.collection('conversations');
const keyOf = conversation => ({ _id: conversation._id, businessId: conversation.businessId });
/** The document of a `findOneAndUpdate` answer, whichever shape the driver gives. */
const docOf = result => (result && Object.prototype.hasOwnProperty.call(result, 'value') ? result.value : result);

/** True while a run holds the conversation. Pure. */
function leaseLive(conversation, now = Date.now()) {
  return !!(conversation && conversation.run && conversation.run.until > now);
}

/** Takes the lease of a `bot` conversation with no live one: `{ id, since }`, or `null`. */
async function takeLease(db, conversation, { now = Date.now(), log = logger } = {}) {
  const id = newId();
  const result = await colOf(db).findOneAndUpdate(
    {
      ...keyOf(conversation), status: 'bot',
      $or: [{ run: { $exists: false } }, { 'run.until': { $lte: now } }],
    },
    { $set: { run: { id, since: now, until: now + RUN_LEASE_MS, chain: 0, waiting: [] } } },
    { returnDocument: 'before' }
  );
  const before = docOf(result);
  if (!before) return null;
  if (before.run) {
    log.warn({ event: 'frontdesk.lease.expired', conversationId: conversation._id, ageMs: now - before.run.since });
  }
  return { id, since: now };
}

/** Notes a guest message on a live lease. True when a live lease took the note. */
async function noteWaiting(db, conversation, messageId, now = Date.now()) {
  if (!messageId) return false;
  const done = await colOf(db).updateOne(
    { ...keyOf(conversation), 'run.until': { $gt: now } },
    { $push: { 'run.waiting': { $each: [messageId], $slice: -WAITING_MAX } } }
  );
  return done.matchedCount === 1;
}

/** May this run still send and write? `{ ok: true, overtaken }` or `{ ok: false, reason }`. */
async function leaseCheck(db, conversation, lease, seen = []) {
  const doc = await colOf(db).findOne(keyOf(conversation), { projection: { status: 1, run: 1 } });
  if (!doc || doc.status === 'closed') return { ok: false, reason: 'closed' };
  if (doc.status !== 'bot') return { ok: false, reason: 'taken_over' };
  if (doc.run?.id !== lease.id) return { ok: false, reason: 'lease_lost' };
  const known = new Set(seen);
  return { ok: true, overtaken: (doc.run.waiting ?? []).filter(id => !known.has(id)).length };
}

/**
 * Ends one run of the lease. `{ follow: false }`: the lease is given back (or was not this run's).
 * `{ follow: true, conversation, chain }`: a noted message was not read by the run, so the lease is kept for a follow-up.
 */
async function endLease(db, conversation, lease, { seen = [], follow = true, graceMs = 0, now = Date.now() } = {}) {
  const mine = { ...keyOf(conversation), 'run.id': lease.id };
  if (follow === false) {
    await colOf(db).updateOne(mine, { $unset: { run: '' } });
    return { follow: false };
  }
  // The atomic release: a note pushed before it is seen by it; a note after it finds no lease and starts its own run.
  const released = await colOf(db).updateOne(
    { ...mine, $or: [{ status: { $ne: 'bot' } }, { 'run.waiting': { $not: { $elemMatch: { $nin: seen } } } }] },
    { $unset: { run: '' } }
  );
  if (released.matchedCount) return { follow: false };
  const result = await colOf(db).findOneAndUpdate(
    { ...mine, status: 'bot' },
    { $set: { 'run.until': now + graceMs + RUN_LEASE_MS, 'run.waiting': [] }, $inc: { 'run.chain': 1 } },
    { returnDocument: 'after' }
  );
  const doc = docOf(result);
  if (!doc) return { follow: false };
  return { follow: true, conversation: doc, chain: doc.run.chain };
}

/** A person stepped in: removes the lease, whoever holds it. True when there was one. */
async function clearLease(db, conversation) {
  const done = await colOf(db).updateOne(
    { ...keyOf(conversation), run: { $exists: true } }, { $unset: { run: '' } }
  );
  return done.modifiedCount === 1;
}

module.exports = {
  RUN_LEASE_MS, WAITING_MAX, leaseLive, takeLease, noteWaiting, leaseCheck, endLease, clearLease,
};
