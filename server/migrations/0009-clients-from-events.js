'use strict';
/**
 * 0009-clients-from-events.js - plan 513 (clients, after plan 512 created the `clients` collection).
 *
 * Gives each live menu event that carries a client (`clientPhone` or a non-empty `clientName`) a `clientId`:
 *   - per business (never across businesses, never the `__master__` catalog), events are grouped by the digits
 *     of `clientPhone` (`phoneNormalized`); an event without phone digits groups by its trimmed `clientName`;
 *     an event with neither is skipped;
 *   - each group reuses the business's existing client (same `phoneNormalized`, or same name and no phone),
 *     otherwise one client is inserted: name of the group's most recently updated event (fallback the phone),
 *     `clientType: 'private'`, `createdBy` = the business owner (fallback the group's first event creator);
 *   - every new client is checked with `clientSchema` (`parseV2('clients', doc)`). A group whose client would not
 *     be valid (e.g. a name-only group: `clientSchema` requires a phone) is NOT written and its events stay
 *     unlinked; the dry run lists each such group with the reason, so the chef can link them by hand.
 * `clientName` / `clientPhone` stay on the event as a snapshot.
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)       dry run: `clients: <n>, events: <m>, skipped: <k>` plus one line per business, nothing written.
 *   --write=yes     apply. Needs --backup-dir=<fresh db-backup.js snapshot>. Idempotent: a second run inserts 0
 *                   clients and patches 0 events.
 *   --db=<scratch>  (local only) run against a scratch copy, e.g. a restored Atlas snapshot - the rehearsal;
 *                   a scratch copy needs no --backup-dir.
 *   --verify=yes    (alone: read-only; with --write=yes: after the write) no linkable live event is left without
 *                   a clientId; prints `verify: ok` or `verify: fail <n>` and exits 1 on fail.
 *
 * Rollback: `db.menuEvents.updateMany({}, {$unset:{clientId:1}}); db.clients.deleteMany({})`
 *   (this also removes clients created by hand after the migration; to keep those, delete only the clients whose
 *   `_id` is in the migration output, or restore from the --backup-dir snapshot). Code before plan 512 ignores
 *   `clientId`, so leaving it is also safe.
 */

const { parseArgs, connect } = require('./tools/_connect');
const { checkBackup } = require('./0001-v2-schema');
const { parseV2 } = require('../utils/schema-check');
const { newId } = require('../utils/id');

const MIGRATION_ID = '0009-clients-from-events';
const MASTER = '__master__';
const LIVE_EVENTS = { deletedAt: null, businessId: { $nin: [null, MASTER] } };

/** Pure: the digits of a phone; '' when there are none. */
function normalizePhone(s) {
  return String(s ?? '').replace(/\D/g, '');
}

const trimmed = s => (typeof s === 'string' ? s.trim() : '');

/**
 * Pure: the group an event's client belongs to inside its business, or null when the event carries no client.
 * `{ kind: 'phone', value: <digits> }` or `{ kind: 'name', value: <trimmed name> }`.
 */
function groupKey(event) {
  const phone = normalizePhone(event.clientPhone);
  if (phone) return { kind: 'phone', value: phone };
  const name = trimmed(event.clientName);
  if (name) return { kind: 'name', value: name };
  return null;
}

const keyString = (businessId, key) => `${businessId}|${key.kind}:${key.value}`;
const byUpdatedDesc = (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
const byCreatedAsc = (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0) || String(a._id).localeCompare(String(b._id));

/** Pure: the client a group would get (no `_id` yet). */
function clientDoc(businessId, key, events, createdBy, now) {
  const latest = [...events].sort(byUpdatedDesc);
  const named = latest.find(e => trimmed(e.clientName));
  const doc = { schemaVersion: 2, businessId, createdBy, createdAt: now, updatedAt: now, clientType: 'private' };
  if (key.kind === 'phone') {
    const phone = trimmed(latest.find(e => normalizePhone(e.clientPhone) === key.value).clientPhone);
    doc.name = named ? trimmed(named.clientName) : phone;
    doc.phone = phone;
    doc.phoneNormalized = key.value;
  } else {
    doc.name = key.value;
  }
  return doc;
}

/** The business's existing client for a group, or null. */
async function findExisting(db, businessId, key) {
  const filter = key.kind === 'phone'
    ? { businessId, phoneNormalized: key.value }
    : { businessId, name: key.value, $or: [{ phone: { $exists: false } }, { phone: '' }] };
  const [found] = await db.collection('clients').find(filter).sort({ createdAt: 1, _id: 1 }).limit(1).toArray();
  return found ?? null;
}

async function ownerOf(db, businessId) {
  const [owner] = await db.collection('users').find({ businessId, businessRole: 'owner' })
    .sort({ createdAt: 1, _id: 1 }).limit(1).toArray();
  return owner ? String(owner._id) : null;
}

/**
 * Read-only: what the write would do.
 * @returns {{ clientsToInsert, eventPatches, skipped, invalid, perBusiness, reused, now }}
 *   clientsToInsert: [{ key, group, doc, eventIds }]; eventPatches: [{ eventId, clientId?, groupKey }] (clientId is set for
 *   reused clients, filled in by write() for new ones); skipped: event ids with no client; invalid: [{ key, businessId,
 *   eventIds, issues }] groups whose client would fail clientSchema.
 */
async function plan(db, now) {
  const events = await db.collection('menuEvents').find({ ...LIVE_EVENTS, clientId: { $exists: false } }).toArray();
  const groups = new Map();
  const skipped = [];
  const perBusiness = {};
  const tally = (businessId, field, n = 1) => {
    perBusiness[businessId] ??= { clients: 0, events: 0, skipped: 0 };
    perBusiness[businessId][field] += n;
  };
  for (const event of events) {
    const key = groupKey(event);
    if (!key) {
      skipped.push(event._id);
      tally(event.businessId, 'skipped');
      continue;
    }
    const id = keyString(event.businessId, key);
    if (!groups.has(id)) groups.set(id, { businessId: event.businessId, key, events: [] });
    groups.get(id).events.push(event);
  }

  const clientsToInsert = [];
  const eventPatches = [];
  const invalid = [];
  let reused = 0;
  const owners = new Map();
  for (const [id, group] of groups) {
    const eventIds = group.events.map(e => e._id);
    const existing = await findExisting(db, group.businessId, group.key);
    if (existing) {
      reused += 1;
      for (const eventId of eventIds) eventPatches.push({ eventId, clientId: existing._id, groupKey: id });
      tally(group.businessId, 'events', eventIds.length);
      continue;
    }
    if (!owners.has(group.businessId)) owners.set(group.businessId, await ownerOf(db, group.businessId));
    const createdBy = owners.get(group.businessId) ?? [...group.events].sort(byCreatedAsc)[0].createdBy;
    const doc = clientDoc(group.businessId, group.key, group.events, createdBy, now);
    const check = parseV2('clients', { _id: 'check', ...doc });
    if (!check.success) {
      invalid.push({ key: id, businessId: group.businessId, eventIds, issues: check.issues });
      skipped.push(...eventIds);
      tally(group.businessId, 'skipped', eventIds.length);
      continue;
    }
    clientsToInsert.push({ key: id, group: group.key, doc, eventIds });
    for (const eventId of eventIds) eventPatches.push({ eventId, groupKey: id });
    tally(group.businessId, 'clients');
    tally(group.businessId, 'events', eventIds.length);
  }
  return { clientsToInsert, eventPatches, skipped, invalid, perBusiness, reused, now };
}

function printPlan(r) {
  console.log(`clients: ${r.clientsToInsert.length}, events: ${r.eventPatches.length}, skipped: ${r.skipped.length}`);
  console.log(`[migrate] existing clients reused: ${r.reused}`);
  for (const [business, c] of Object.entries(r.perBusiness)) {
    console.log(`${business}: clients ${c.clients}, events ${c.events}, skipped ${c.skipped}`);
  }
  for (const g of r.invalid) {
    const why = g.issues.map(i => `${i.path || '(doc)'} ${i.message}`).join('; ');
    console.log(`[migrate] not linked (client would be invalid): ${g.key} events=${g.eventIds.join(',')} - ${why}`);
  }
}

async function write(db, args, result) {
  if (args.db === undefined) checkBackup(args);
  const clients = db.collection('clients');
  const events = db.collection('menuEvents');
  const idByGroup = new Map();
  let inserted = 0;
  for (const { key, group, doc } of result.clientsToInsert) {
    // A crashed earlier run may already have inserted this client: reuse it instead of a duplicate.
    const existing = await findExisting(db, doc.businessId, group);
    if (existing) {
      idByGroup.set(key, existing._id);
      continue;
    }
    const full = { _id: newId(), ...doc };
    const check = parseV2('clients', full);
    if (!check.success) throw new Error(`invalid client for ${key}: ${JSON.stringify(check.issues)}`);
    await clients.insertOne(full);
    idByGroup.set(key, full._id);
    inserted += 1;
  }
  let patched = 0;
  for (const p of result.eventPatches) {
    const clientId = p.clientId ?? idByGroup.get(p.groupKey);
    // Re-checks inside the filter, so a re-run never overwrites a link (made by an earlier run or by hand).
    const res = await events.updateOne({ _id: p.eventId, clientId: { $exists: false } }, { $set: { clientId, updatedAt: result.now } });
    patched += res.modifiedCount;
  }
  await db.collection('migrations').updateOne(
    { _id: MIGRATION_ID },
    { $set: { lastRunAt: new Date() }, $inc: { runs: 1 } },
    { upsert: true },
  );
  console.log(`[migrate] done: inserted ${inserted} clients, patched ${patched} events.`);
  return { inserted, patched };
}

/**
 * Read-only: live events that carry a client and could be linked but have no clientId. Events whose group has no
 * valid client (listed by the dry run) are counted separately and do not fail the check.
 */
async function verify(db) {
  const unlinked = await db.collection('menuEvents').find({
    ...LIVE_EVENTS,
    clientId: { $exists: false },
    $or: [{ clientPhone: { $exists: true, $ne: '' } }, { clientName: { $exists: true, $ne: '' } }],
  }).toArray();
  const r = await plan(db, Date.now());
  const unlinkable = new Set(r.invalid.flatMap(g => g.eventIds));
  const failing = unlinked.filter(e => groupKey(e) && !unlinkable.has(e._id)).length;
  if (unlinkable.size) console.log(`[verify] events left for the chef to link (no valid client): ${unlinkable.size}`);
  if (failing) {
    console.log(`verify: fail ${failing}`);
    process.exitCode = 1;
    return { ok: false, failing, unlinkable: unlinkable.size };
  }
  console.log('verify: ok');
  return { ok: true, failing: 0, unlinkable: unlinkable.size };
}

async function main() {
  const args = parseArgs(process.argv, { write: 1, verify: 1, 'backup-dir': 1, db: 1, target: 1, 'confirm-host': 1 });
  const { client, db } = await connect(args);
  try {
    const result = await plan(db, Date.now());
    printPlan(result);
    if (args.write === 'yes') await write(db, args, result);
    else console.log('[migrate] DRY RUN - nothing written.');
    if (args.verify === 'yes') await verify(db);
  } finally {
    await client.close();
  }
}

module.exports = { normalizePhone, groupKey, clientDoc, plan, write, verify, MIGRATION_ID };

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
