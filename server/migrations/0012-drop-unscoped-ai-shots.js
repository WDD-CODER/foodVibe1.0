'use strict'
/**
 * 0012-drop-unscoped-ai-shots.js — Plan 600.
 *
 * Deletes the legacy GEMINI_SHOTS documents that have no `businessId`. Since plan 582 nothing reads
 * them and the per-business prune never reaches them. No backup is required: they are unreadable by design.
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)     dry run: prints how many unscoped shots exist, deletes nothing.
 *   --write=yes   deletes exactly { businessId: { $exists: false } }.
 *   --verify=yes  exits 1 while any unscoped shot remains.
 *
 * Usage:
 *   node server/migrations/0012-drop-unscoped-ai-shots.js --target=local
 *   node server/migrations/0012-drop-unscoped-ai-shots.js --target=local --write=yes
 *   node server/migrations/0012-drop-unscoped-ai-shots.js --target=local --verify=yes
 */

const { parseArgs, connect } = require('./tools/_connect')

const MIGRATION_ID = '0012-drop-unscoped-ai-shots'
const UNSCOPED = { businessId: { $exists: false } }

const shots = db => db.collection('GEMINI_SHOTS')

/** Read-only: how many unscoped shots exist. */
async function plan(db) {
  return { count: await shots(db).countDocuments(UNSCOPED) }
}

function printPlan({ count }) {
  console.log(`GEMINI_SHOTS without businessId: ${count}`)
}

async function write(db, _args, { count }) {
  const { deletedCount } = await shots(db).deleteMany(UNSCOPED)
  console.log(`[migrate] deleted ${deletedCount} of ${count} unscoped shot(s). Now run again with --verify=yes.`)
  return { deleted: deletedCount }
}

/** Read-only: no unscoped shot remains. Sets exit code 1 when one does. */
async function verify(db) {
  const remaining = await shots(db).countDocuments(UNSCOPED)
  if (remaining) {
    console.log(`verify: fail ${remaining}`)
    process.exitCode = 1
    return { ok: false, remaining }
  }
  console.log('verify: ok')
  return { ok: true, remaining: 0 }
}

async function main() {
  const args = parseArgs(process.argv, { write: 1, verify: 1 })
  const { client, db } = await connect(args)
  try {
    if (args.verify === 'yes') return await verify(db)
    const result = await plan(db)
    printPlan(result)
    if (args.write === 'yes') await write(db, args, result)
    else console.log('[migrate] DRY RUN — nothing deleted.')
  } finally {
    await client.close()
  }
}

module.exports = { plan, printPlan, write, verify, MIGRATION_ID }

if (require.main === module) {
  main().catch(err => {
    console.error(err.message)
    process.exit(1)
  })
}
