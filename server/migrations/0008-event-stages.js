'use strict';
/**
 * 0008-event-stages.js - plan 442 (spec 09.1, event pipeline).
 *
 * Gives every menu event that has no `stage` one, and marks it old:
 *   - the event date is before today (Jerusalem) -> `finished`; a later date or no date -> `quote_sent`;
 *   - `legacy: true` ("ישן") so dashboards never count it, `stageHistory: []`, `notes` kept or `[]`.
 * Covers every business, the master catalog and trashed events. Run it after 0007 (both reshape `menuEvents`).
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)       dry run: counts per target stage and per business, nothing written.
 *   --write=yes     apply. Needs --backup-dir=<fresh db-backup.js snapshot>. Idempotent: a second run changes 0.
 *   --db=<scratch>  (local only) run against a scratch copy, e.g. a restored Atlas snapshot - the rehearsal;
 *                   a scratch copy needs no --backup-dir.
 *   --verify=yes    read-only: no event is missing its stage; exit 1 on any miss.
 *
 * Rollback: `db.menuEvents.updateMany({ legacy: true, stageHistory: { $size: 0 } },
 *   { $unset: { stage: '', legacy: '', stageHistory: '', notes: '' } })` restores the pre-migration shape for
 * legacy events nobody has moved yet; otherwise restore `menuEvents` from the --backup-dir snapshot
 * (`server/scripts/db-restore.js` into a scratch DB, then the Human copies the collection back).
 * Code before plan 442 ignores the new fields, so leaving them is also safe.
 */

const { parseArgs, connect } = require('./tools/_connect');
const { checkBackup } = require('./0001-v2-schema');

const MIGRATION_ID = '0008-event-stages';

/** Pure: today's date in Jerusalem as 'YYYY-MM-DD'. */
function todayInJerusalem(now) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(now));
}

/** Pure: the stage an event without one starts in. */
function legacyStage(event, today) {
  const date = typeof event.eventDate === 'string' ? event.eventDate.slice(0, 10) : '';
  return date !== '' && date < today ? 'finished' : 'quote_sent';
}

/** Pure: the update that gives an event its stage, or null when it already has one. */
function eventPatch(event, today) {
  if (event.stage !== undefined) return null;
  return { $set: { stage: legacyStage(event, today), legacy: true, stageHistory: [], notes: event.notes ?? [] } };
}

async function plan(db, now) {
  const today = todayInJerusalem(now);
  const patches = [];
  for (const event of await db.collection('menuEvents').find({ stage: { $exists: false } }).toArray()) {
    const patch = eventPatch(event, today);
    if (patch) patches.push({ event, patch });
  }
  const perStage = {};
  const perBusiness = {};
  for (const { event, patch } of patches) {
    const stage = patch.$set.stage;
    perStage[stage] = (perStage[stage] ?? 0) + 1;
    const business = event.businessId ?? '-';
    perBusiness[business] ??= {};
    perBusiness[business][stage] = (perBusiness[business][stage] ?? 0) + 1;
  }
  return { patches, perStage, perBusiness, today, now };
}

function printPlan(r) {
  console.log(`[migrate] today (Jerusalem): ${r.today}`);
  console.log(`[migrate] events to give a stage: ${r.patches.length}`);
  for (const [stage, n] of Object.entries(r.perStage)) console.log(`[migrate]   -> ${stage}: ${n}`);
  for (const [business, counts] of Object.entries(r.perBusiness)) {
    console.log(`[migrate]   business=${business}: ${Object.entries(counts).map(([s, n]) => `${s} ${n}`).join(', ')}`);
  }
}

async function write(db, args, result) {
  if (args.db === undefined) checkBackup(args);
  const events = db.collection('menuEvents');
  let changed = 0;
  for (const { event, patch } of result.patches) {
    // Re-checks inside the filter, so a crashed run can be repeated and a moved event is never overwritten.
    const res = await events.updateOne({ _id: event._id, stage: { $exists: false } }, { $set: { ...patch.$set, updatedAt: result.now } });
    changed += res.modifiedCount;
  }
  await db.collection('migrations').updateOne(
    { _id: MIGRATION_ID },
    { $set: { lastRunAt: new Date() }, $inc: { runs: 1 } },
    { upsert: true },
  );
  console.log(`[migrate] done: ${changed} events got a stage. Now run again with --verify=yes.`);
}

async function verify(db) {
  const missing = await db.collection('menuEvents').countDocuments({ stage: { $exists: false } });
  console.log(`${missing ? 'FAIL' : 'ok'} events without a stage: ${missing}`);
  let failed = missing > 0;
  if (!await db.collection('migrations').findOne({ _id: MIGRATION_ID })) {
    console.log(`FAIL missing marker ${MIGRATION_ID}`);
    failed = true;
  }
  if (failed) {
    console.log('[verify] FAILED');
    process.exitCode = 1;
    return;
  }
  console.log('[verify] OK: every event has a stage.');
}

async function main() {
  const args = parseArgs(process.argv, { write: 1, verify: 1, 'backup-dir': 1 });
  const { client, db } = await connect(args);
  try {
    if (args.verify === 'yes') return await verify(db);
    const result = await plan(db, Date.now());
    printPlan(result);
    if (args.write === 'yes') await write(db, args, result);
    else console.log('[migrate] DRY RUN - nothing written.');
  } finally {
    await client.close();
  }
}

module.exports = { todayInJerusalem, legacyStage, eventPatch, plan, write, verify, MIGRATION_ID };

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
