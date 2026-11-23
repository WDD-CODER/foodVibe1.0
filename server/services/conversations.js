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

const LAST_TEXT_MAX = 120;
const STATUS_FILTERS = { open: ['bot', 'human'], bot: ['bot'], human: ['human'], closed: ['closed'] };

/**
 * Plan 687: the page of conversations the inbox shows, in three queries whatever the page size: the conversations,
 * their clients (name, phone, tags) and the newest message of each. `before` pages from a `lastMessageAt`.
 */
async function listConversations(db, businessId, { status = 'open', test = false, limit = 50, before } = {}) {
  const statuses = STATUS_FILTERS[status] || STATUS_FILTERS.open;
  const filter = { businessId, status: { $in: statuses }, test: test ? true : { $ne: true } };
  if (typeof before === 'number') filter.lastMessageAt = { $lt: before };
  const rows = await db.collection('conversations').find(filter).sort({ lastMessageAt: -1 }).limit(limit).toArray();
  if (!rows.length) return [];
  const clientIds = [...new Set(rows.map(r => r.clientId))];
  const clients = await db.collection('clients')
    .find({ businessId, _id: { $in: clientIds } }, { projection: { name: 1, phone: 1, tags: 1 } }).toArray();
  const byClient = new Map(clients.map(c => [c._id, c]));
  const newest = await db.collection('messages').aggregate([
    { $match: { businessId, conversationId: { $in: rows.map(r => r._id) } } },
    { $sort: { at: -1 } },
    { $group: { _id: '$conversationId', text: { $first: '$text' }, direction: { $first: '$direction' }, kind: { $first: '$kind' }, at: { $first: '$at' } } },
  ]).toArray();
  const lastBy = new Map(newest.map(m => [m._id, m]));
  return rows.map(r => {
    const c = byClient.get(r.clientId);
    const m = lastBy.get(r._id);
    return {
      ...r,
      client: { _id: r.clientId, name: c ? c.name : '', phone: c ? c.phone : '', tags: (c && c.tags) || [] },
      last: m ? { text: String(m.text || '').slice(0, LAST_TEXT_MAX), direction: m.direction, kind: m.kind, at: m.at } : null,
    };
  });
}

module.exports = { findOrCreateConversation, loadConversation, closeConversation, listConversations };
