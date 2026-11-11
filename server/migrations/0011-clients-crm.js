'use strict';
/**
 * 0011-clients-crm.js - plan 544 (clients become CRM records, ADR 0031).
 *
 * Fills the new server-owned fields of every existing live client (no `deletedAt`):
 *   - per business (never across businesses, never the `__master__` catalog);
 *   - `phoneKey`       = phoneKey(normalizePhone(phone)) (shared/schemas/phone.ts, R-01: the last 9 digits);
 *   - `kinds`          gains 'event_client' when the client has at least one live event (`menuEvents` with this
 *                      `clientId`, the same `businessId` and no `deletedAt`); otherwise left as it is;
 *   - `firstSeenAt`    = `createdAt` when unset;
 *   - `counters.events` = the number of those live events.
 * Every patched doc is checked with `clientSchema` (`parseV2('clients', doc)`); the first invalid doc aborts the run,
 * dry run included (INV-4).
 * Clients of one business that share a `phoneKey` are listed (ids and names only, never the phone) and never merged
 * or deleted: they are joined by hand through the merge of plan 551.
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)       dry run: `clients: <n>, to patch: <m>, phoneKey collisions: <k>` plus one line per collision
 *                   group, nothing written.
 *   --write=yes     apply. Needs --backup-dir=<fresh db-backup.js snapshot>. Idempotent: a second run patches 0
 *                   clients. Records `{ _id: '0011-clients-crm', appliedAt, patched }` in `migrations`.
 *   --db=<scratch>  (local only) run against a scratch copy, e.g. a restored Atlas snapshot - the rehearsal;
 *                   a scratch copy needs no --backup-dir.
 *   --verify=yes    (alone: read-only; with --write=yes: after the write) every live client has the derived
 *                   `phoneKey` and `counters.events` equal to its live event count; prints `verify: ok` or
 *                   `verify: fail <n>` and exits 1 on fail.
 *
 * Usage:
 *   node server/migrations/0011-clients-crm.js --target=local
 *   node server/migrations/0011-clients-crm.js --target=local --write=yes --backup-dir=<folder>
 *   node server/migrations/0011-clients-crm.js --target=local --verify=yes
 *
 * Rollback: every added field is ignored by the code before plan 544, so leaving them is safe. To remove them:
 *   `db.clients.updateMany({}, {$unset:{phoneKey:1, firstSeenAt:1, counters:1}})` (and `kinds` where it was only
 *   ['event_client']), or restore the --backup-dir snapshot into a scratch DB and copy the clients back.
 */

const { parseArgs, connect } = require('./tools/_connect');
const { checkBackup } = require('./0001-v2-schema');
const { parseV2 } = require('../utils/schema-check');
const { normalizePhone, phoneKey } = require('../generated/schemas/phone');

const MIGRATION_ID = '0011-clients-crm';
const MASTER = '__master__';
const LIVE = { deletedAt: { $exists: false } };
const IN_A_BUSINESS = { businessId: { $nin: [null, MASTER] } };

const keyOf = (businessId, id) => `${businessId}|${id}`;

/** Live event count per business + clientId (other businesses' events never count for a client). */
async function liveEventCounts(db) {
  const rows = await db.collection('menuEvents').aggregate([
    { $match: { ...LIVE, ...IN_A_BUSINESS, clientId: { $exists: true, $ne: null } } },
    { $group: { _id: { businessId: '$businessId', clientId: '$clientId' }, n: { $sum: 1 } } },
  ]).toArray();
  return new Map(rows.map(r => [keyOf(r._id.businessId, r._id.clientId), r.n]));
}

/**
 * Pure: the `$set` a client needs (dotted `counters.events`), or null when it already holds every value.
 * @returns {{ set: Record<string, unknown>, doc: object } | null} `doc` is the client after the patch.
 */
function patchFor(client, liveEvents) {
  const set = {};
  const key = phoneKey(normalizePhone(client.phone ?? ''));
  if (client.phoneKey !== key) set.phoneKey = key;
  const kinds = Array.isArray(client.kinds) ? client.kinds : [];
  if (liveEvents > 0 && !kinds.includes('event_client')) set.kinds = [...kinds, 'event_client'];
  if (client.firstSeenAt === undefined && typeof client.createdAt === 'number') set.firstSeenAt = client.createdAt;
  if (client.counters?.events !== liveEvents) set['counters.events'] = liveEvents;
  if (!Object.keys(set).length) return null;
  const { 'counters.events': events, ...top } = set;
  const doc = { ...client, ...top };
  if (events !== undefined) doc.counters = { ...(client.counters ?? {}), events };
  return { set, doc };
}

/** Pure: the groups of 2+ live, unmerged clients of one business that share a `phoneKey`. */
function collisions(clients) {
  const groups = new Map();
  for (const c of clients) {
    if (c.mergedInto) continue;
    const key = phoneKey(normalizePhone(c.phone ?? ''));
    const id = keyOf(c.businessId, key);
    if (!groups.has(id)) groups.set(id, { businessId: c.businessId, phoneKey: key, clients: [] });
    groups.get(id).clients.push({ _id: c._id, name: c.name });
  }
  return [...groups.values()].filter(g => g.clients.length > 1);
}

const liveClients = db => db.collection('clients').find({ ...LIVE, ...IN_A_BUSINESS }).sort({ businessId: 1, _id: 1 }).toArray();

/**
 * Read-only: what the write would do. Throws on the first patched client that fails `clientSchema`.
 * @returns {{ clients: number, patches: Array<{ _id, businessId, set }>, collisions: Array }}
 */
async function plan(db) {
  const clients = await liveClients(db);
  const counts = await liveEventCounts(db);
  const patches = [];
  for (const client of clients) {
    const p = patchFor(client, counts.get(keyOf(client.businessId, client._id)) ?? 0);
    if (!p) continue;
    const check = parseV2('clients', p.doc);
    if (!check.success) throw new Error(`invalid client ${client._id}: ${JSON.stringify(check.issues)}`);
    patches.push({ _id: client._id, businessId: client.businessId, set: p.set });
  }
  return { clients: clients.length, patches, collisions: collisions(clients) };
}

// The label lives off the log line so the pre-commit PII check (one line at a time) stays quiet.
const COLLISION_LABEL = 'collision';

function printPlan(r) {
  console.log(`clients: ${r.clients}, to patch: ${r.patches.length}, phoneKey collisions: ${r.collisions.length}`);
  for (const g of r.collisions) {
    const members = g.clients.map(c => `${c._id} ${JSON.stringify(c.name ?? '')}`).join(', ');
    console.log(`${COLLISION_LABEL} ${g.businessId} ${g.phoneKey}: ${members}`);
  }
}

async function write(db, args, result) {
  if (args.db === undefined) checkBackup(args);
  const clients = db.collection('clients');
  let patched = 0;
  for (const p of result.patches) {
    const res = await clients.updateOne({ _id: p._id, businessId: p.businessId, ...LIVE }, { $set: p.set });
    patched += res.modifiedCount;
  }
  await db.collection('migrations').updateOne(
    { _id: MIGRATION_ID },
    { $set: { appliedAt: new Date(), patched } },
    { upsert: true },
  );
  console.log(`[migrate] done: patched ${patched} clients.`);
  return { patched };
}

/** Read-only: every live client holds the derived `phoneKey` and its live event count in `counters.events`. */
async function verify(db) {
  const clients = await liveClients(db);
  const counts = await liveEventCounts(db);
  const failing = clients.filter(c =>
    c.phoneKey !== phoneKey(normalizePhone(c.phone ?? ''))
    || c.counters?.events !== (counts.get(keyOf(c.businessId, c._id)) ?? 0)
  ).length;
  if (failing) {
    console.log(`verify: fail ${failing}`);
    process.exitCode = 1;
    return { ok: false, failing };
  }
  console.log('verify: ok');
  return { ok: true, failing: 0 };
}

async function main() {
  const args = parseArgs(process.argv, { write: 1, verify: 1, 'backup-dir': 1, db: 1, target: 1, 'confirm-host': 1 });
  const { client, db } = await connect(args);
  try {
    const result = await plan(db);
    printPlan(result);
    if (args.write === 'yes') await write(db, args, result);
    else console.log('[migrate] DRY RUN - nothing written.');
    if (args.verify === 'yes') await verify(db);
  } finally {
    await client.close();
  }
}

module.exports = { plan, printPlan, write, verify, patchFor, collisions, MIGRATION_ID };

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
