'use strict';
/**
 * repair-supplier-refs.js — Plan 649.
 *
 * Every source of every product must point at a supplier of the SAME business (or have no supplier). This lists,
 * per business, the sources whose supplier is foreign (another business's or the master's), unknown (exists
 * nowhere) or empty, and the fix for each:
 *   - map by _masterId  → the business's own copy of that supplier;
 *   - map by name       → the business supplier with the same trimmed name;
 *   - clear             → supplierId '' (the source keeps its price).
 * A source with an empty supplier is listed and left as it is. Prices are never touched.
 * The master catalog (__master__) is skipped.
 *
 * Dry run by default (writes nothing). Add --write to apply:
 *   node server/scripts/repair-supplier-refs.js --target=local [--business=<id>] [--write]
 *   (Atlas also needs --confirm-remote and --confirm-host=<host>; take a backup first: node server/scripts/db-backup.js --target=atlas)
 */

const MASTER = '__master__';
const LIVE = { deletedAt: { $exists: false } };

function parseArgs(argv) {
  const args = { write: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--write') { args.write = true; continue; }
    if (arg === '--confirm-remote') { args.confirmRemote = true; continue; }
    const m = /^--(target|confirm-host|business|db)=(.*)$/.exec(arg);
    if (!m) throw new Error(`Unknown argument: ${arg}`);
    args[m[1]] = m[2];
  }
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  if (args.target !== 'local' && !args.confirmRemote) throw new Error('--target other than local needs --confirm-remote');
  return args;
}

const trimName = (s) => (typeof s === 'string' ? s.trim() : '');

/**
 * Pure planning step (unit-tested). `own` = the business's suppliers, `known` = Map id → supplier doc for every
 * supplier id the product's sources name (any business). Returns { sources, changes } — `sources` is the repaired
 * list (same length, same prices), `changes` one entry per source that is wrong or empty.
 */
function planProductRepair(product, own, known) {
  const ownIds = new Set(own.map((s) => s._id));
  const byMaster = new Map(own.filter((s) => typeof s._masterId === 'string').map((s) => [s._masterId, s]));
  const byName = new Map();
  for (const s of own) { const n = trimName(s.nameHebrew); if (n && !byName.has(n)) byName.set(n, s); }
  const used = new Set((product.sources ?? []).map((s) => s?.supplierId).filter((id) => id && ownIds.has(id)));
  const changes = [];
  const sources = (product.sources ?? []).map((src) => {
    if (!src || typeof src !== 'object') return src;
    const id = src.supplierId;
    if (!id) { changes.push({ supplierId: '', kind: 'empty', fix: 'none', to: '', price: src.price }); return src; }
    if (ownIds.has(id)) return src;
    const doc = known.get(id);
    const kind = doc ? 'foreign' : 'unknown';
    let target = null;
    let fix = 'clear';
    if (doc) {
      const masterKey = doc.businessId === MASTER ? doc._id : doc._masterId;
      if (typeof masterKey === 'string' && byMaster.has(masterKey)) { target = byMaster.get(masterKey); fix = 'map by _masterId'; }
      else if (byName.has(trimName(doc.nameHebrew))) { target = byName.get(trimName(doc.nameHebrew)); fix = 'map by name'; }
    }
    if (target && used.has(target._id)) { target = null; fix = 'clear (that supplier is already on the product)'; }
    if (target) used.add(target._id);
    const to = target ? target._id : '';
    changes.push({ supplierId: id, kind, fix, to, price: src.price, name: doc?.nameHebrew });
    return { ...src, supplierId: to };
  });
  return { sources, changes };
}

async function repairBusiness(db, businessId, { write, log }) {
  const summary = { products: 0, foreign: 0, unknown: 0, empty: 0, mapped: 0, cleared: 0 };
  const own = await db.collection('suppliers').find({ businessId }, { projection: { _id: 1, _masterId: 1, nameHebrew: 1 } }).toArray();
  const products = await db.collection('products').find({ businessId, 'sources.0': { $exists: true } }).toArray();
  const ownIds = new Set(own.map((s) => s._id));
  const wanted = new Set();
  for (const p of products) for (const s of p.sources ?? []) if (s?.supplierId && !ownIds.has(s.supplierId)) wanted.add(s.supplierId);
  const docs = wanted.size
    ? await db.collection('suppliers').find({ _id: { $in: [...wanted] } }, { projection: { _id: 1, _masterId: 1, businessId: 1, nameHebrew: 1 } }).toArray()
    : [];
  const known = new Map(docs.map((d) => [d._id, d]));
  for (const p of products) {
    const { sources, changes } = planProductRepair(p, own, known);
    if (!changes.length) continue;
    summary.products++;
    let touched = false;
    for (const c of changes) {
      summary[c.kind]++;
      if (c.kind === 'empty') { log(`  «${p.nameHebrew}» ${p._id}: empty supplier, price ${c.price} — left as it is`); continue; }
      touched = true;
      if (c.to) summary.mapped++; else summary.cleared++;
      log(`  «${p.nameHebrew}» ${p._id}: ${c.kind} supplier ${c.supplierId}${c.name ? ` («${c.name}»)` : ''} → ${c.fix}${c.to ? ` ${c.to}` : ''}, price ${c.price} kept`);
    }
    if (write && touched) await db.collection('products').updateOne({ _id: p._id }, { $set: { sources, updatedAt: Date.now() } });
  }
  return summary;
}

async function main() {
  const args = parseArgs(process.argv);
  const { connect } = require('../migrations/tools/_connect');
  const { client, db } = await connect({ target: args.target, 'confirm-host': args['confirm-host'], db: args.db });
  try {
    const businesses = args.business
      ? [args.business]
      : (await db.collection('products').distinct('businessId', LIVE)).filter((b) => b && b !== MASTER);
    console.log(`[repair-supplier-refs-649] ${args.write ? 'WRITE' : 'dry run'} · ${businesses.length} business(es)`);
    const total = { products: 0, foreign: 0, unknown: 0, empty: 0, mapped: 0, cleared: 0 };
    for (const businessId of businesses) {
      const lines = [];
      const s = await repairBusiness(db, businessId, { write: args.write, log: (l) => lines.push(l) });
      if (!s.products) continue;
      const biz = await db.collection('businesses').findOne({ _id: businessId }, { projection: { name: 1 } });
      console.log(`business ${biz?.name ?? businessId}: ${s.products} products, ${s.foreign} foreign, ${s.unknown} unknown, ${s.empty} empty · ${s.mapped} mapped, ${s.cleared} cleared`);
      lines.forEach((l) => console.log(l));
      for (const k of Object.keys(total)) total[k] += s[k];
    }
    console.log(`[repair-supplier-refs-649] total: ${total.products} products, ${total.foreign} foreign, ${total.unknown} unknown, ${total.empty} empty · ${total.mapped} mapped, ${total.cleared} cleared${args.write ? '' : ' (dry run — nothing written; add --write)'}`);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main().catch((err) => { console.error('[repair-supplier-refs-649] failed:', err.message); process.exit(1); });
}

module.exports = { parseArgs, planProductRepair, repairBusiness };
