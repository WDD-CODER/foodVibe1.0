'use strict';
/**
 * erase-client.js — Plan 558 (privacy: erase one customer of one business by phone).
 *
 * Deletes every client (live, in Trash or merged into it), request, booking, conversation and message of that person,
 * and anonymises their events (unsets clientId, clientName, clientPhone; the event, its money and history stay).
 * decisionLog is not touched (no personal fields). Free-text event notes may still name the person: check by hand.
 * Hard deletes are irreversible. Dry run by default (counts only); add --write to apply:
 *   node server/scripts/erase-client.js --target=local --business=<businessId> --phone=<number> [--db=<scratch>] [--write]
 *   Atlas: take a backup first (node server/scripts/db-backup.js --target=atlas), then use
 *   --target=atlas --confirm-host=<host>.
 * The output never prints the phone, a name or a token.
 */

const { normalizePhone, phoneKey } = require('../utils/client-upsert');

const keyOf = (value) => phoneKey(normalizePhone(value));

/** Pure planning step (unit-tested). `key` is a phoneKey. Returns id lists. */
function planErase({ key, clients = [], requests = [], bookings = [], events = [], conversations = [], messages = [] }) {
  const ids = new Set();
  if (key) for (const c of clients) if (c.phoneKey === key) ids.add(c._id);
  let grew = ids.size > 0;
  while (grew) {
    grew = false;
    for (const c of clients) {
      if (!ids.has(c._id) && c.mergedInto != null && ids.has(c.mergedInto)) { ids.add(c._id); grew = true; }
    }
  }
  const mine = (doc, phoneField) => ids.has(doc.clientId) || (!!key && keyOf(doc[phoneField]) === key);
  const deleteConversations = conversations.filter((c) => ids.has(c.clientId)).map((c) => c._id);
  const convSet = new Set(deleteConversations);
  return {
    deleteClients: [...ids],
    deleteRequests: requests.filter((r) => mine(r, 'guestPhone')).map((r) => r._id),
    deleteBookings: bookings.filter((b) => mine(b, 'guestPhone')).map((b) => b._id),
    deleteConversations,
    deleteMessages: messages.filter((m) => convSet.has(m.conversationId)).map((m) => m._id),
    anonymiseEvents: events.filter((e) => mine(e, 'clientPhone')).map((e) => e._id),
  };
}

function parseArgs(argv) {
  const args = { write: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--write') { args.write = true; continue; }
    const m = /^--(target|confirm-host|db|business|phone)=(.*)$/.exec(arg);
    if (!m) throw new Error('Unknown argument');
    args[m[1]] = m[2];
  }
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  if (!args.business) throw new Error('--business is required');
  if (!args.phone) throw new Error('--phone is required');
  return args;
}

const readAll = (db, name, businessId) => db.collection(name).find({ businessId }).toArray();

/** Loads one business's data, plans, and with `write` applies. Returns the counts and the anonymised event ids. */
async function runErase(db, { businessId, phone, write }) {
  const key = keyOf(phone);
  if (!key) throw new Error('--phone has no digits');
  const [clients, requests, bookings, events, conversations] = await Promise.all(
    ['clients', 'requests', 'bookings', 'menuEvents', 'conversations'].map((n) => readAll(db, n, businessId))
  );
  const convIds = conversations.map((c) => c._id);
  const messages = convIds.length ? await db.collection('messages').find({ businessId, conversationId: { $in: convIds } }).toArray() : [];
  const plan = planErase({ key, clients, requests, bookings, events, conversations, messages });
  if (write) {
    const del = async (name, ids) => { if (ids.length) await db.collection(name).deleteMany({ businessId, _id: { $in: ids } }); };
    await del('clients', plan.deleteClients);
    await del('requests', plan.deleteRequests);
    await del('bookings', plan.deleteBookings);
    await del('conversations', plan.deleteConversations);
    await del('messages', plan.deleteMessages);
    if (plan.anonymiseEvents.length) {
      await db.collection('menuEvents').updateMany(
        { businessId, _id: { $in: plan.anonymiseEvents } },
        { $unset: { clientId: '', clientName: '', clientPhone: '' } }
      );
    }
  }
  return {
    counts: {
      clients: plan.deleteClients.length,
      requests: plan.deleteRequests.length,
      bookings: plan.deleteBookings.length,
      conversations: plan.deleteConversations.length,
      messages: plan.deleteMessages.length,
      events: plan.anonymiseEvents.length,
    },
    anonymisedEventIds: plan.anonymiseEvents,
  };
}

function formatResult(result, write) {
  const verb = write ? 'deleted' : 'would delete';
  const c = result.counts;
  const ids = result.anonymisedEventIds.length ? ` (${result.anonymisedEventIds.join(', ')})` : '';
  return [
    `clients: ${verb} ${c.clients}`,
    `requests: ${verb} ${c.requests}`,
    `bookings: ${verb} ${c.bookings}`,
    `conversations: ${verb} ${c.conversations}`,
    `messages: ${verb} ${c.messages}`,
    `events: ${write ? 'anonymised' : 'would anonymise'} ${c.events}${ids}`,
    'Check by hand: free-text event notes may still name this person.',
    write ? 'Done.' : 'Dry run, nothing written; add --write to apply.',
  ];
}

async function main() {
  const args = parseArgs(process.argv);
  const { connect } = require('../migrations/tools/_connect');
  const { client, db } = await connect({ target: args.target, 'confirm-host': args['confirm-host'], db: args.db });
  try {
    const result = await runErase(db, { businessId: args.business, phone: args.phone, write: args.write });
    for (const line of formatResult(result, args.write)) console.log(line);
  } finally {
    await client.close();
  }
}

module.exports = { planErase, parseArgs, runErase, formatResult };

if (require.main === module) {
  main().catch((err) => { console.error('[erase-client] failed:', err.message); process.exit(1); });
}
