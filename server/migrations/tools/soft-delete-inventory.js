'use strict';
/**
 * Plan 407 Step 0 — read-only inventory of today's three deletion mechanisms and per-user state.
 *   node server/migrations/tools/soft-delete-inventory.js --target=local
 *   node server/migrations/tools/soft-delete-inventory.js --target=atlas --confirm-host=<member host>
 * Prints counts only (no document contents). Never writes.
 */

const { parseArgs, connect } = require('./_connect');
const { COLLECTIONS } = require('../../constants/collections');

const LIVE = ['recipes', 'dishes', 'products', 'equipment', 'venues', 'menuEvents', 'suppliers'];
const TRASH = COLLECTIONS.map(c => c.name).filter(n => n.startsWith('TRASH_'));
const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const args = parseArgs(process.argv);
  const { client, db } = await connect(args);
  try {
    const now = Date.now();
    console.log('\n== TRASH_* collections (docs · users · older than 30d · no deletedAt)');
    for (const name of TRASH) {
      const c = db.collection(name);
      const total = await c.countDocuments();
      const users = (await c.distinct('userId')).length;
      const old = await c.countDocuments({ deletedAt: { $lt: now - 30 * DAY } });
      const noTs = await c.countDocuments({ deletedAt: { $exists: false } });
      const master = await c.countDocuments({ userId: '__master__' });
      console.log(`${name.padEnd(20)} ${String(total).padStart(5)} · ${users} users · ${old} >30d · ${noTs} no-ts · ${master} __master__`);
    }

    console.log('\n== Live collections (docs · _userDeleted tombstones · deletedAt set · hiddenBy · favoritedBy)');
    for (const name of LIVE) {
      const c = db.collection(name);
      const total = await c.countDocuments();
      const tomb = await c.countDocuments({ _userDeleted: true });
      const delAt = await c.countDocuments({ deletedAt: { $exists: true } });
      const hidden = await c.countDocuments({ 'hiddenBy.0': { $exists: true } });
      const fav = await c.countDocuments({ $or: [{ 'favoritedBy.0': { $exists: true } }, { 'favoritedBy_.0': { $exists: true } }] });
      const favOther = await c.countDocuments({
        $expr: { $gt: [{ $size: { $filter: { input: { $ifNull: ['$favoritedBy', []] }, cond: { $ne: ['$$this', '$userId'] } } } }, 0] },
      });
      console.log(`${name.padEnd(12)} ${String(total).padStart(6)} · ${tomb} tomb · ${delAt} deletedAt · ${hidden} hiddenBy · ${fav} fav (${favOther} with another user's id)`);
    }

    const prefs = await db.listCollections({ name: 'userPrefs' }).toArray();
    console.log(`\nuserPrefs collection exists: ${prefs.length > 0}`);
  } finally {
    await client.close();
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
