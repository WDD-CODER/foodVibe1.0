'use strict';
/**
 * field-inventory.js — READ-ONLY. Walks every document of every collection and lists each
 * top-level and nested key with counts, flagging keys the v1→v2 field map doesn't cover.
 * Plan 321 Phase 2a step 3: the field map is generated from live data, not just interfaces.
 *
 * Usage:
 *   node server/migrations/tools/field-inventory.js --target=local
 *   node server/migrations/tools/field-inventory.js --target=atlas --confirm-host=<cluster-host>
 */

const { parseArgs, connect } = require('./_connect');
const { COLLECTIONS } = require('../../constants/collections');
const { hasSchema } = require('../../utils/schema-check');
const { upgradeV1toV2 } = require('../../generated/schemas/upgrade/upgrade');

function walk(value, path, counts) {
  if (Array.isArray(value)) {
    for (const el of value) walk(el, `${path}[]`, counts);
  } else if (value && typeof value === 'object' && !(value instanceof Date) && value.constructor?.name !== 'ObjectId') {
    for (const [k, v] of Object.entries(value)) {
      const p = path ? `${path}.${k}` : k;
      counts.set(p, (counts.get(p) || 0) + 1);
      walk(v, p, counts);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const { client, db } = await connect(args);
  try {
    for (const { name } of COLLECTIONS) {
      const docs = await db.collection(name).find({}).toArray();
      if (!docs.length) continue;
      const counts = new Map();
      const unmappedCounts = new Map();
      for (const doc of docs) {
        walk(doc, '', counts);
        if (hasSchema(name)) {
          for (const u of upgradeV1toV2(name, doc).unmapped) unmappedCounts.set(u, (unmappedCounts.get(u) || 0) + 1);
        }
      }
      console.log(`\n== ${name} (${docs.length} docs)${hasSchema(name) ? '' : '  [no v2 schema yet]'}`);
      if (hasSchema(name)) {
        if (!unmappedCounts.size) console.log('  UNMAPPED: none');
        for (const [k, n] of [...unmappedCounts].sort()) console.log(`  UNMAPPED  ${k}  x${n}`);
      } else {
        for (const [k, n] of [...counts].sort()) console.log(`  ${k}  x${n}`);
      }
    }
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
