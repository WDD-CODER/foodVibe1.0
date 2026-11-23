'use strict';
/**
 * Plan 675 (C-CONV): one live conversation per guest and channel. The live key `'<channel>:<waId>'` exists while the
 * status is not `closed`; the unique partial index on `{ businessId, liveKey }` makes two first messages leave one.
 */
const { newId } = require('../utils/id');
const { checkStoredDoc } = require('../middleware/validate');

const DAY_MS = 86400000;

function bad(issues) {
  return Object.assign(new Error('BAD_CONVERSATION'), { code: 'BAD_CONVERSATION', issues });
}

/** Finds the live conversation of this guest on this channel, or creates it as `bot`. */
async function findOrCreateConversation(db, { businessId, channel, waId, clientId, at, test }) {
  const col = db.collection('conversations');
  const liveKey = channel + ':' + waId;
  const found = await col.findOne({ businessId, liveKey });
  if (found) return { conversation: found, created: false };
  const doc = {
    _id: newId(), schemaVersion: 2, businessId, createdBy: 'server', createdAt: at, updatedAt: at,
    clientId, channel, waId, status: 'bot', lastMessageAt: at, lastInboundAt: at, unread: 0,
    windowExpiresAt: at + DAY_MS, liveKey, ...(test && { test: true }),
  };
  const check = checkStoredDoc('conversations', doc);
  if (!check.ok) throw bad(check.issues);
  try {
    await col.insertOne(doc);
  } catch (err) {
    if (err && err.code === 11000) {
      const winner = await col.findOne({ businessId, liveKey });
      if (winner) return { conversation: winner, created: false };
    }
    throw err;
  }
  if (!test) await db.collection('clients').updateOne({ _id: clientId, businessId }, { $inc: { 'counters.conversations': 1 } });
  return { conversation: doc, created: true };
}

async function loadConversation(db, businessId, id) {
  return db.collection('conversations').findOne({ _id: id, businessId });
}

/** Closes a conversation: status `closed`, the live key and the pending action removed. */
async function closeConversation(db, businessId, id, now = Date.now()) {
  await db.collection('conversations').updateOne(
    { _id: id, businessId },
    { $set: { status: 'closed', updatedAt: now }, $unset: { liveKey: '', pending: '' } }
  );
  return loadConversation(db, businessId, id);
}

module.exports = { findOrCreateConversation, loadConversation, closeConversation };
