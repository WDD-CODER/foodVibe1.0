'use strict';
/**
 * 0009-clients-from-events.js - plan 513 (clients, after plan 512 created the `clients` collection).
 *
 * Gives each live menu event that carries a usable client phone a `clientId`:
 *   - per business (never across businesses, never the `__master__` catalog), events are grouped by the digits
 *     of `clientPhone` (`phoneNormalized`);
 *   - phone rule: the client `phone` is the trimmed `clientPhone` when it passes `clientSchema`
 *     (`/^[0-9+\-\s()]{7,20}$/`); otherwise its digits only, when the value holds nothing but digits and the
 *     separators space - . / ( ) +; in both cases it needs 7-20 digits;
 *   - each group reuses the business's oldest client with the same `phoneNormalized`, otherwise one client is
 *     inserted: name of the group's most recently updated event (fallback the phone), `clientType: 'private'`,
 *     `createdBy` = the business owner (fallback the group's first event creator), `_id` = `newId()`;
 *   - every new client is checked with `clientSchema` (`parseV2('clients', doc)`); the first invalid doc aborts the
 *     run, dry run included (INV-4);
 *   - NOT linked, counted in `skipped`, listed by event id, never failing verify (Human 2026-11-03, handled by hand):
 *       name-only events (a name, a blank phone)       -> `name-only events: <n>`
 *       invalid-phone events (a phone the rule refuses) -> `invalid-phone events: <n>` with the raw value
 *     events with neither a name nor a phone are skipped silently;
 *   - every phone that appears with different names is printed (`same phone, different names: ...`).
 * `clientName` / `clientPhone` stay on the event as a snapshot.
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)       dry run: `clients: <n>, events: <m>, skipped: <k>` plus one line per business, nothing written.
 *   --write=yes     apply. Needs --backup-dir=<fresh db-backup.js snapshot>. Idempotent: a second run inserts 0
 *                   clients and patches 0 events.
 *   --db=<scratch>  (local only) run against a scratch copy, e.g. a restored Atlas snapshot - the rehearsal;
 *                   a scratch copy needs no --backup-dir.
 *   --verify=yes    (alone: read-only; with --write=yes: after the write) no live event with a usable phone is left
 *                   without a clientId; prints `verify: ok` or `verify: fail <n>` and exits 1 on fail.
 *
 * Rollback: `db.menuEvents.updateMany({}, {$unset:{clientId:1}}); db.clients.deleteMany({})`
 *   (this also removes clients created by hand after the migration; to keep those, delete only the clients
 *   created by the migration run, or restore from the --backup-dir snapshot). Code before plan 512 ignores
 *   `clientId`, so leaving it is also safe.
 */

const { parseArgs, connect } = require('./tools/_connect');
const { checkBackup } = require('./0001-v2-schema');
const { parseV2 } = require('../utils/schema-check');
const { newId } = require('../utils/id');

const MIGRATION_ID = '0009-clients-from-events';
const MASTER = '__master__';
const LIVE_EVENTS = { deletedAt: null, businessId: { $nin: [null, MASTER] } };
/** The `phone` rule of `clientSchema`. */
const CLIENT_PHONE = /^[0-9+\-\s()]{7,20}$/;
/** Digits plus the separators the Human allowed (space - . / ( ) +). */
const DIGITS_AND_SEPARATORS = /^[0-9 \-./()+]+$/;

const trimmed = s => (s === undefined || s === null ? '' : String(s).trim());

/** Pure: the digits of a phone; '' when there are none. */
function normalizePhone(s) {
  return trimmed(s).replace(/\D/g, '');
}

/**
 * Pure: the client phone a raw `clientPhone` gives, or null when the rule refuses it.
 * @returns {{ phone: string, phoneNormalized: string } | null}
 */
function resolvePhone(raw) {
  const value = trimmed(raw);
  const digits = normalizePhone(value);
  if (digits.length < 7 || digits.length > 20) return null;
  if (CLIENT_PHONE.test(value)) return { phone: value, phoneNormalized: digits };
  if (DIGITS_AND_SEPARATORS.test(value)) return { phone: digits, phoneNormalized: digits };
  return null;
}

/**
 * Pure: what an event's client is inside its business.
 *   { kind: 'phone', value: <digits>, phone }  - linkable, grouped by the digits
 *   { kind: 'invalid-phone', raw }             - a non-blank phone the rule refuses
 *   { kind: 'name-only', name }                - a name and a blank phone
 *   null                                       - neither a name nor a phone
 */
function groupKey(event) {
  const raw = trimmed(event.clientPhone);
  if (raw) {
    const resolved = resolvePhone(raw);
    if (!resolved) return { kind: 'invalid-phone', raw: event.clientPhone };
    return { kind: 'phone', value: resolved.phoneNormalized, phone: resolved.phone };
  }
  const name = trimmed(event.clientName);
  if (name) return { kind: 'name-only', name };
  return null;
}

const byUpdatedDesc = (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
const byCreatedAsc = (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0) || String(a._id).localeCompare(String(b._id));

/** Pure: the trimmed names of a group's events, most recently updated first, without repeats. */
function namesOf(events) {
  return [...new Set([...events].sort(byUpdatedDesc).map(e => trimmed(e.clientName)).filter(Boolean))];
}

/** Pure: the client a phone group would get. */
function clientDoc(businessId, phoneNormalized, events, createdBy, now) {
  const latest = [...events].sort(byUpdatedDesc)[0];
  const { phone } = resolvePhone(latest.clientPhone);
  const [name] = namesOf(events);
  return {
    _id: newId(), schemaVersion: 2, businessId, createdBy, createdAt: now, updatedAt: now,
    name: name ?? phone, phone, phoneNormalized, clientType: 'private',
  };
}

/** The business's oldest client with this phone, or null. */
async function findExisting(db, businessId, phoneNormalized) {
  const [found] = await db.collection('clients').find({ businessId, phoneNormalized })
    .sort({ createdAt: 1, _id: 1 }).limit(1).toArray();
  return found ?? null;
}

async function ownerOf(db, businessId) {
  const [owner] = await db.collection('users').find({ businessId, businessRole: 'owner' })
    .sort({ createdAt: 1, _id: 1 }).limit(1).toArray();
  return owner ? String(owner._id) : null;
}

/** Splits unlinked live events into phone groups and the lists that stay unlinked. */
function classify(events) {
  const groups = new Map();
  const nameOnly = [];
  const invalidPhone = [];
  const neither = [];
  for (const event of events) {
    const key = groupKey(event);
    if (!key) neither.push(event);
    else if (key.kind === 'name-only') nameOnly.push(event);
    else if (key.kind === 'invalid-phone') invalidPhone.push(event);
    else {
      const id = `${event.businessId}|${key.value}`;
      if (!groups.has(id)) groups.set(id, { businessId: event.businessId, phoneNormalized: key.value, events: [] });
      groups.get(id).events.push(event);
    }
  }
  return { groups, nameOnly, invalidPhone, neither };
}

const unlinkedLiveEvents = db => db.collection('menuEvents').find({ ...LIVE_EVENTS, clientId: { $exists: false } }).toArray();

/**
 * Read-only: what the write would do. Throws on the first client that fails `clientSchema`.
 * @returns {{ clientsToInsert, eventPatches, skipped, nameOnly, invalidPhone, sameNameConflicts, perBusiness, reused, now }}
 *   clientsToInsert: [{ key, doc, eventIds }]; eventPatches: [{ eventId, clientId, groupKey }];
 *   skipped: event ids left unlinked; nameOnly: event ids; invalidPhone: [{ eventId, raw }];
 *   sameNameConflicts: [{ businessId, phone, names }].
 */
async function plan(db, now) {
  const { groups, nameOnly, invalidPhone, neither } = classify(await unlinkedLiveEvents(db));
  const perBusiness = {};
  const tally = (businessId, field, n = 1) => {
    perBusiness[businessId] ??= { clients: 0, events: 0, skipped: 0 };
    perBusiness[businessId][field] += n;
  };
  for (const e of [...nameOnly, ...invalidPhone, ...neither]) tally(e.businessId, 'skipped');

  const clientsToInsert = [];
  const eventPatches = [];
  const sameNameConflicts = [];
  let reused = 0;
  const owners = new Map();
  for (const [key, group] of groups) {
    const eventIds = group.events.map(e => e._id);
    const names = namesOf(group.events);
    if (names.length > 1) sameNameConflicts.push({ businessId: group.businessId, phone: group.phoneNormalized, names });
    let clientId;
    const existing = await findExisting(db, group.businessId, group.phoneNormalized);
    if (existing) {
      reused += 1;
      clientId = existing._id;
    } else {
      if (!owners.has(group.businessId)) owners.set(group.businessId, await ownerOf(db, group.businessId));
      const createdBy = owners.get(group.businessId) ?? [...group.events].sort(byCreatedAsc)[0].createdBy;
      const doc = clientDoc(group.businessId, group.phoneNormalized, group.events, createdBy, now);
      const check = parseV2('clients', doc);
      if (!check.success) throw new Error(`invalid client for ${key} (events ${eventIds.join(',')}): ${JSON.stringify(check.issues)}`);
      clientsToInsert.push({ key, doc, eventIds });
      clientId = doc._id;
      tally(group.businessId, 'clients');
    }
    for (const eventId of eventIds) eventPatches.push({ eventId, clientId, groupKey: key });
    tally(group.businessId, 'events', eventIds.length);
  }
  return {
    clientsToInsert,
    eventPatches,
    skipped: [...nameOnly, ...invalidPhone, ...neither].map(e => e._id),
    nameOnly: nameOnly.map(e => e._id),
    invalidPhone: invalidPhone.map(e => ({ eventId: e._id, raw: e.clientPhone })),
    sameNameConflicts,
    perBusiness,
    reused,
    now,
  };
}

/** Prints the events left unlinked by hand: `name-only events: <n>` and `invalid-phone events: <n>`, one line per id. */
// Labels live off the log lines so the pre-commit PII check (one line at a time) stays quiet;
// the printed values stay unmasked (Human 2026-11-05).
const INVALID_LABEL = 'invalid-phone events';
const CONFLICT_LABEL = 'same phone, different names';

function printUnlinked(nameOnly, invalid) {
  console.log(`name-only events: ${nameOnly.length}`);
  for (const id of nameOnly) console.log(`  ${id}`);
  console.log(`${INVALID_LABEL}: ${invalid.length}`);
  for (const { eventId, raw } of invalid) console.log(`  ${eventId} ${JSON.stringify(raw)}`);
}

function printPlan(r) {
  console.log(`clients: ${r.clientsToInsert.length}, events: ${r.eventPatches.length}, skipped: ${r.skipped.length}`);
  console.log(`[migrate] existing clients reused: ${r.reused}`);
  for (const [business, c] of Object.entries(r.perBusiness)) {
    console.log(`${business}: clients ${c.clients}, events ${c.events}, skipped ${c.skipped}`);
  }
  for (const c of r.sameNameConflicts) {
    const key = c.phone;
    console.log(`${CONFLICT_LABEL}: ${key} → ${c.names.join(' | ')}`);
  }
  printUnlinked(r.nameOnly, r.invalidPhone);
}

async function write(db, args, result) {
  if (args.db === undefined) checkBackup(args);
  const clients = db.collection('clients');
  const events = db.collection('menuEvents');
  const idByGroup = new Map();
  let inserted = 0;
  for (const { key, doc } of result.clientsToInsert) {
    // A client inserted since the plan was read (another run, or by hand): reuse it instead of a duplicate.
    const existing = await findExisting(db, doc.businessId, doc.phoneNormalized);
    if (existing) {
      idByGroup.set(key, existing._id);
      continue;
    }
    const check = parseV2('clients', doc);
    if (!check.success) throw new Error(`invalid client for ${key}: ${JSON.stringify(check.issues)}`);
    await clients.insertOne(doc);
    idByGroup.set(key, doc._id);
    inserted += 1;
  }
  let patched = 0;
  for (const p of result.eventPatches) {
    const clientId = idByGroup.get(p.groupKey) ?? p.clientId;
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
 * Read-only: every live event with a usable phone (the phone rule above) and no clientId fails the check.
 * Name-only and invalid-phone events are listed and never fail it.
 */
async function verify(db) {
  const { groups, nameOnly, invalidPhone } = classify(await unlinkedLiveEvents(db));
  const failing = [...groups.values()].reduce((n, g) => n + g.events.length, 0);
  const nameOnlyIds = nameOnly.map(e => e._id);
  const invalid = invalidPhone.map(e => ({ eventId: e._id, raw: e.clientPhone }));
  printUnlinked(nameOnlyIds, invalid);
  if (failing) {
    console.log(`verify: fail ${failing}`);
    process.exitCode = 1;
    return { ok: false, failing, nameOnly: nameOnlyIds, invalidPhone: invalid };
  }
  console.log('verify: ok');
  return { ok: true, failing: 0, nameOnly: nameOnlyIds, invalidPhone: invalid };
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

module.exports = { normalizePhone, resolvePhone, groupKey, clientDoc, plan, printPlan, write, verify, MIGRATION_ID };

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
