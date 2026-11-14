'use strict';
/**
 * set-front-desk-status.js — Plan 555 (bridge until plan 557's platform-admin switch).
 * Sets one front desk profile's status by slug:
 *   node server/scripts/set-front-desk-status.js --slug=<slug> --status=draft|pilot|active|suspended [--target=local|atlas] [--confirm-host=<host>]
 * Local by default (`parseTarget`). Atlas needs `--target=atlas --confirm-host=<host>`. Prints
 *   FRONT_DESK_STATUS: <slug> <old> → <new>
 */

const { parseTarget } = require('../utils/db-target');

const STATUSES = ['draft', 'pilot', 'active', 'suspended'];

function parseArgs(argv) {
  const args = { target: parseTarget(argv) };
  for (const arg of argv.slice(2)) {
    const m = /^--(slug|status|confirm-host|target)=(.*)$/.exec(arg);
    if (!m) throw new Error(`Unknown argument: ${arg}`);
    if (m[1] !== 'target') args[m[1]] = m[2];
  }
  if (!args.slug) throw new Error('--slug is required');
  if (!STATUSES.includes(args.status)) throw new Error(`--status must be one of ${STATUSES.join('|')}`);
  return args;
}

/** Sets the status of the live profile with this slug. Returns `{ old, next }`; throws when there is none. */
async function setStatus(db, slug, status) {
  const profiles = db.collection('frontDeskProfiles');
  const found = await profiles.findOne({ slug: slug.toLowerCase(), deletedAt: { $exists: false } });
  if (!found) throw new Error('No profile with that slug');
  await profiles.updateOne({ _id: found._id }, { $set: { status, updatedAt: Date.now() } });
  return { old: found.status ?? 'draft', next: status };
}

async function main() {
  const args = parseArgs(process.argv);
  const { connect } = require('../migrations/tools/_connect');
  const { client, db } = await connect({ target: args.target, 'confirm-host': args['confirm-host'] });
  try {
    const { old, next } = await setStatus(db, args.slug, args.status);
    console.log(`FRONT_DESK_STATUS: ${args.slug} ${old} → ${next}`);
  } finally {
    await client.close();
  }
}

module.exports = { parseArgs, setStatus };

if (require.main === module) {
  main().catch((err) => { console.error('[set-front-desk-status] failed:', err.message); process.exit(1); });
}
