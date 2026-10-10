'use strict';
/**
 * cleanup-legacy-data.js — Plan 403. One pass that cleans the stored data the schema rejects
 * (legacy `logistics: null`, trash `_masterId: null`, missing timestamps, baseline equipment
 * that no longer exists), drops the empty v1 registry collections that came back, and removes
 * the Human-approved test items and test users. Fixers live in ./lib/cleanup-fixers.js.
 *
 * DRY RUN by default: prints a count per fixer per collection, the dangling-reference report
 * (plan rows 5–6, report only) and the schema check. Nothing is written without --apply.
 * Idempotent: after --apply, a second dry run prints 0 for every fixer.
 *
 * Usage:
 *   node server/scripts/cleanup-legacy-data.js --target=local
 *   node server/scripts/cleanup-legacy-data.js --target=local --apply --backup-dir=<db-backup.js snapshot>
 *   node server/scripts/cleanup-legacy-data.js --target=atlas --confirm-host=<member host> [--apply --backup-dir=...]
 *   ... --promote-admin=<users.name>   A0b: make the Human's real account admin (needs --apply)
 *   ... --allow-atlas-users            A0b done: let F7 delete the approved Atlas test accounts
 */

const fs = require('fs');
const path = require('path');
const { connect } = require('../migrations/tools/_connect');
const { FIXERS, reportDanglingRefs, schemaSummary, promoteAdmin } = require('./lib/cleanup-fixers');

const VALUE_ARGS = ['target', 'confirm-host', 'backup-dir', 'promote-admin'];
const FLAG_ARGS = ['apply', 'allow-atlas-users'];

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    if (m && VALUE_ARGS.includes(m[1]) && m[2] !== undefined) args[m[1]] = m[2];
    else if (m && FLAG_ARGS.includes(m[1]) && m[2] === undefined) args[m[1]] = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  if (args['promote-admin'] && !args.apply) throw new Error('--promote-admin writes; add --apply');
  return args;
}

/** --apply needs a db-backup.js snapshot of the same target, taken in the last 24h. */
function checkBackup(args) {
  const dir = args['backup-dir'];
  if (!dir) throw new Error('--apply needs --backup-dir=<snapshot dir from server/scripts/db-backup.js>');
  const manifestPath = path.join(dir, '_manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`No _manifest.json in ${dir}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const ageH = (Date.now() - Date.parse(manifest.takenAt)) / 36e5;
  if (manifest.target !== args.target) throw new Error(`Backup is for target '${manifest.target}', not '${args.target}'`);
  if (!(ageH >= 0 && ageH < 24)) throw new Error(`Backup is ${ageH.toFixed(1)}h old; take a fresh one (< 24h)`);
  console.log(`[cleanup] backup OK: ${dir} (${manifest.totalDocuments} docs, taken ${manifest.takenAt})`);
}

function printFixer(fixer, result) {
  const total = result.rows.reduce((n, r) => n + r.count, 0);
  console.log(`\n${fixer.id} ${fixer.title}: ${total}`);
  for (const r of result.rows) if (r.count || r.note?.startsWith('NOT EMPTY')) console.log(`  ${r.collection.padEnd(28)} ${String(r.count).padStart(6)}  ${r.note ?? ''}`);
  for (const b of result.blockers ?? []) console.log(`  BLOCKER ${b}`);
  return total;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.apply) checkBackup(args);
  const { client, db } = await connect(args);
  try {
    if (args['promote-admin']) {
      if (!await promoteAdmin(db, args['promote-admin'])) throw new Error(`No user named '${args['promote-admin']}'`);
      console.log(`[cleanup] ${args['promote-admin']} is now admin. Log in as them before running with --allow-atlas-users.`);
      return;
    }

    let testUserIds = [];
    let masterTouched = false;
    let grand = 0;
    for (const fixer of FIXERS) {
      const result = await fixer.run(db, {
        target: args.target,
        allowAtlasUsers: !!args['allow-atlas-users'],
        ignoreUserIds: testUserIds,
      });
      if (result.userIds) testUserIds = result.userIds;
      grand += printFixer(fixer, result);
      if (!args.apply) continue;
      if (result.blockers?.length) {
        console.log(`  SKIPPED ${fixer.id} — resolve the blockers above first`);
        continue;
      }
      await result.apply();
      if (result.touchesMaster) masterTouched = true;
      console.log(`  applied ${fixer.id}`);
    }

    const dangling = await reportDanglingRefs(db);
    console.log(`\nReport only — dangling ingredient / menu references: ${dangling.length}`);
    for (const line of dangling) console.log(`  ${line}`);

    console.log('\nSchema check (invalid docs per collection):');
    for (const s of await schemaSummary(db)) console.log(`  ${s.collection.padEnd(28)} ${String(s.invalid).padStart(6)} / ${s.docs}`);

    if (masterTouched) {
      // Same write as services/master-version.js bumpMasterVersion(), which needs mongoose; this script uses the driver.
      await db.collection('MASTER_META').updateOne({ _id: 'version' }, { $set: { lastModified: Date.now() } }, { upsert: true });
      console.log('[cleanup] master docs changed — master version bumped');
    }
    console.log(`\n[cleanup] ${args.apply ? 'APPLIED' : 'DRY RUN — nothing written'}. Fixer total before this run: ${grand}`);
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
