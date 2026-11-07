'use strict'
/**
 * 0010-drop-v1-collections.js — Plan 526.
 *
 * Drops the seven v1 entity collections that migration 0001 copied into their v2 names
 * (COLLECTION_RENAMES). 0001 kept them as the rollback path; the Human decided on 2026-11-06
 * that FoodVibe never returns to v1, so this ends that path. The db-backup.js snapshot taken
 * right before --write is the final v1 archive.
 *
 * Refuses when the 0001 marker is missing, or when a v1 collection still has documents while
 * its v2 counterpart is missing or empty (the copy never happened).
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)          dry run: v1 collections present, their doc counts, the v2 counts, refusals,
 *                      plus other upper-case collections (info only, never dropped).
 *   --write=yes        drop them. Needs --backup-dir=<fresh db-backup.js snapshot>. Refuses on any
 *                      refusal unless --accept-refusals=yes (the Human reviewed them and accepts the
 *                      loss), and refuses to re-run without --force=yes.
 *   --verify=yes       none of the v1 collections exists and the marker is stored.
 *
 * Usage:
 *   node server/migrations/0010-drop-v1-collections.js --target=local
 *   node server/migrations/0010-drop-v1-collections.js --target=local --write=yes --backup-dir=<dir>
 *   node server/migrations/0010-drop-v1-collections.js --target=local --verify=yes
 */

const { parseArgs, connect } = require('./tools/_connect')
const { checkBackup } = require('./0001-v2-schema')
const { COLLECTION_RENAMES } = require('../generated/schemas/field-map.v1-to-v2')

const MIGRATION_ID = '0010-drop-v1-collections'
const V1_COLLECTIONS = Object.keys(COLLECTION_RENAMES)
const KEEP_UPPER = new Set(['VERSION_HISTORY', 'DICTIONARY_OVERRIDES'])
const UPPER_NAME = /^[A-Z][A-Z0-9_]+$/

/**
 * Pure planning step: which v1 collections to drop, and why it would refuse.
 * @param {{ present: string[], counts: Record<string, number>, v2Counts: Record<string, number|undefined>, has0001: boolean }} input
 * @returns {{ drop: string[], refuse: string[] }}
 */
function planDrop({ present, counts, v2Counts, has0001 }) {
  const refuse = []
  if (!has0001) refuse.push('no 0001-v2-schema marker in migrations: the v2 copy was never recorded')
  const drop = V1_COLLECTIONS.filter(name => present.includes(name))
  for (const v1 of drop) {
    const v2 = COLLECTION_RENAMES[v1]
    const v2Count = v2Counts[v2]
    if ((counts[v1] || 0) > 0 && !v2Count) {
      refuse.push(`${v1} has ${counts[v1]} doc(s) but ${v2} is ${v2Count === undefined ? 'missing' : 'empty'}`)
    }
  }
  return { drop, refuse }
}

async function plan(db) {
  const names = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name))
  const present = V1_COLLECTIONS.filter(name => names.has(name))
  const counts = {}
  const v2Counts = {}
  for (const v1 of present) counts[v1] = await db.collection(v1).countDocuments()
  for (const v2 of Object.values(COLLECTION_RENAMES)) {
    v2Counts[v2] = names.has(v2) ? await db.collection(v2).countDocuments() : undefined
  }
  const has0001 = !!(await db.collection('migrations').findOne({ _id: '0001-v2-schema' }))
  const others = [...names].filter(n => UPPER_NAME.test(n) && !KEEP_UPPER.has(n) && !V1_COLLECTIONS.includes(n)).sort()
  return { present, counts, v2Counts, has0001, others, ...planDrop({ present, counts, v2Counts, has0001 }) }
}

function printPlan({ present, counts, v2Counts, refuse, others }) {
  console.log(`v1 collections present: ${present.length} of ${V1_COLLECTIONS.length}`)
  for (const v1 of present) {
    const v2 = COLLECTION_RENAMES[v1]
    const m = v2Counts[v2] === undefined ? 'missing' : `${v2Counts[v2]} doc(s)`
    console.log(`  ${v1}: ${counts[v1]} doc(s) → ${v2}: ${m}`)
  }
  console.log(`Refusals: ${refuse.length}`)
  for (const r of refuse) console.log(`  REFUSE ${r}`)
  if (others.length) {
    console.log('Other upper-case collections (info only, not dropped):')
    for (const n of others) console.log(`  ${n}`)
  }
}

async function write(db, args, { drop, refuse, counts }) {
  checkBackup(args)
  if (await db.collection('migrations').findOne({ _id: MIGRATION_ID }) && args.force !== 'yes') {
    throw new Error(`${MIGRATION_ID} was already applied; refusing to re-run without --force=yes`)
  }
  if (refuse.length && args['accept-refusals'] !== 'yes') {
    throw new Error(`refusing to drop: ${refuse.join('; ')}. Review them, then pass --accept-refusals=yes to drop anyway`)
  }
  for (const coll of drop) await db.collection(coll).drop()
  await db.collection('migrations').replaceOne(
    { _id: MIGRATION_ID },
    { _id: MIGRATION_ID, appliedAt: new Date(), dropped: counts, refusalsAccepted: refuse },
    { upsert: true },
  )
  console.log(`[migrate] dropped ${drop.length} collection(s). Now run again with --verify=yes.`)
}

async function verify(db) {
  const names = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name))
  const present = V1_COLLECTIONS.filter(name => names.has(name))
  const marker = await db.collection('migrations').findOne({ _id: MIGRATION_ID })
  for (const coll of present) console.log(`STILL PRESENT ${coll}`)
  if (!marker) console.log(`MISSING marker ${MIGRATION_ID}`)
  if (present.length || !marker) {
    console.log('[verify] FAILED')
    process.exit(1)
  }
  console.log('[verify] OK: no v1 collection left; marker stored.')
}

async function main() {
  const args = parseArgs(process.argv, { write: 1, verify: 1, force: 1, 'accept-refusals': 1, 'backup-dir': 1 })
  const { client, db } = await connect(args)
  try {
    if (args.verify === 'yes') return await verify(db)
    const result = await plan(db)
    printPlan(result)
    if (args.write === 'yes') await write(db, args, result)
    else console.log('[migrate] DRY RUN — nothing dropped.')
  } finally {
    await client.close()
  }
}

module.exports = { planDrop, V1_COLLECTIONS }

if (require.main === module) {
  main().catch(err => {
    console.error(err.message)
    process.exit(1)
  })
}
