'use strict';
/**
 * release-removed-staff-names.js — Plan 492.
 *
 * Staff removed before plan 492 still hold their username (`name`), so a new staff member (or sign-up) with
 * the same name is refused. This one-off moves each such name to `removedName` and sets `name` to the
 * placeholder `<name>~removed~<_id>`, exactly what DELETE /api/v1/business/team/:userId does now.
 * Only users with `removedAt` set and no `removedName` are touched; a second run finds none.
 *
 * Dry run by default (writes nothing). Add --write to apply:
 *   node server/scripts/release-removed-staff-names.js --target=local [--db=<scratch>] [--write]
 *   (Atlas also needs --confirm-host=<host>; take a backup first: node server/scripts/db-backup.js --target=atlas)
 */

const { releasedUsername } = require('../utils/username');

/** Pure planning step (unit-tested): the removed users that still hold their name, with the new name. */
function planRelease(users) {
  return users
    .filter((u) => u && u.removedAt && !u.removedName && typeof u.name === 'string')
    .map((u) => ({ _id: u._id, removedName: u.name, name: releasedUsername(u.name, u._id) }));
}

function parseArgs(argv) {
  const args = { write: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--write') { args.write = true; continue; }
    const m = /^--(target|confirm-host|db)=(.*)$/.exec(arg);
    if (!m) throw new Error(`Unknown argument: ${arg}`);
    args[m[1]] = m[2];
  }
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const { connect } = require('../migrations/tools/_connect');
  const { client, db } = await connect({ target: args.target, 'confirm-host': args['confirm-host'], db: args.db });
  try {
    const users = db.collection('users');
    const plan = planRelease(await users.find({ removedAt: { $nin: [null, 0] }, removedName: { $exists: false } }).toArray());
    for (const p of plan) {
      console.log(`${args.write ? 'release' : 'would release'}: ${p.removedName} (${p._id})`);
      if (args.write) await users.updateOne({ _id: p._id, removedName: { $exists: false } }, { $set: { removedName: p.removedName, name: p.name } });
    }
    console.log(`${args.write ? 'Released' : 'Would release'} ${plan.length} removed staff name(s)${args.write ? '' : ' (dry run, nothing written; add --write)'}`);
  } finally {
    await client.close();
  }
}

module.exports = { planRelease, parseArgs };

if (require.main === module) {
  main().catch((err) => { console.error('[release-492] failed:', err.message); process.exit(1); });
}
