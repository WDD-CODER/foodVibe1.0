'use strict';
/**
 * validate-all.js — READ-ONLY. Runs the same upgrade + Zod check as the observe-mode
 * middleware over every stored document and prints a violation report grouped by
 * collection + path + code, plus any unmapped v1 keys. Nothing is written.
 * Plan 321 Phase 2a step 5. The report goes to the Human, who decides per violation
 * class whether 2b fixes the data or changes the schema.
 *
 * Usage:
 *   node server/migrations/tools/validate-all.js --target=local
 *   node server/migrations/tools/validate-all.js --target=atlas --confirm-host=<cluster-host>
 */

const { parseArgs, connect } = require('./_connect');
const { COLLECTIONS } = require('../../constants/collections');
const { hasSchema, checkDoc } = require('../../utils/schema-check');

async function main() {
  const args = parseArgs(process.argv);
  const { client, db } = await connect(args);
  let totalUnmapped = 0;
  try {
    for (const { name } of COLLECTIONS) {
      if (!hasSchema(name)) continue;
      const docs = await db.collection(name).find({}).toArray();
      const groups = new Map();
      const unmapped = new Map();
      let badDocs = 0;
      for (const doc of docs) {
        const r = checkDoc(name, doc);
        if (r.issues.length) badDocs++;
        for (const i of r.issues) {
          const key = `${i.path || '(root)'} :: ${i.code} :: ${i.message}`;
          groups.set(key, (groups.get(key) || 0) + 1);
        }
        for (const u of r.unmapped) unmapped.set(u, (unmapped.get(u) || 0) + 1);
      }
      totalUnmapped += unmapped.size;
      console.log(`\n== ${name}: ${docs.length} docs, ${badDocs} with violations, ${unmapped.size} unmapped key(s)`);
      for (const [k, n] of [...unmapped].sort()) console.log(`  UNMAPPED  ${k}  x${n}`);
      for (const [k, n] of [...groups].sort((a, b) => b[1] - a[1])) console.log(`  x${String(n).padEnd(6)} ${k}`);
    }
    console.log(`\n[validate-all] total unmapped keys: ${totalUnmapped}`);
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
