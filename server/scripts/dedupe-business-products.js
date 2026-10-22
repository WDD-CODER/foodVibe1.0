'use strict';
/**
 * dedupe-business-products.js — Plan 485.
 *
 * Merges live products that share a name inside one business (name rule: trim, single spaces, lower-case).
 * Per group one product is kept: the one most recipes/dishes use, then an edited one (_userModified),
 * then the oldest. For every other copy:
 *   - its supplier prices are merged into the kept product (one entry per supplier, the latest price wins);
 *   - every recipe/dish ingredient line that points at it (live or in Trash) is re-pointed to the kept
 *     product, with the kept product's name as nameSnapshot;
 *   - VERSION_HISTORY entries about it, and recipe/dish snapshots that point at it, are re-pointed;
 *   - it is moved to the Trash (deletedAt / deletedBy 'dedupe-485'); the server refuses to restore it
 *     while the kept product has its name.
 * The master catalog (__master__) is skipped (deduped by dedupe-master-names.js).
 *
 * Dry run by default (writes nothing). Add --write to apply:
 *   node server/scripts/dedupe-business-products.js --target=local [--business=<id>] [--write]
 *   (Atlas also needs --confirm-host=<host>; take a backup first: node server/scripts/db-backup.js --target=atlas)
 */

const { normalizeProductName } = require('../utils/price-list-import');

const MASTER = '__master__';
const LIVE = { deletedAt: { $exists: false } };
const DELETED_BY = 'dedupe-485';

function parseArgs(argv) {
  const args = { write: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--write') { args.write = true; continue; }
    const m = /^--(target|confirm-host|business|db)=(.*)$/.exec(arg);
    if (!m) throw new Error(`Unknown argument: ${arg}`);
    args[m[1]] = m[2];
  }
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  return args;
}

/** Deep-replaces string values found in `map` (old id → new id). Returns [value, changed]. */
function replaceIds(value, map) {
  if (typeof value === 'string') return map.has(value) ? [map.get(value), true] : [value, false];
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => { const [nv, c] = replaceIds(v, map); changed ||= c; return nv; });
    return [changed ? out : value, changed];
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    let changed = false;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === '_id' || k === '_masterId') { out[k] = v; continue; }
      const [nv, c] = replaceIds(v, map);
      out[k] = nv;
      changed ||= c;
    }
    return [changed ? out : value, changed];
  }
  return [value, false];
}

/** One entry per supplier: the latest `addedAt` wins; entries without a supplier are kept once per price. */
function mergeSources(lists) {
  const bySupplier = new Map();
  for (const src of lists.flat()) {
    if (!src || typeof src !== 'object') continue;
    const key = src.supplierId ? `s:${src.supplierId}` : `p:${src.price}`;
    const prev = bySupplier.get(key);
    if (!prev || (src.addedAt ?? 0) > (prev.addedAt ?? 0)) bySupplier.set(key, src);
  }
  return [...bySupplier.values()];
}

/** Pure planning step (unit-tested): groups → { keeper, losers } with the reason. */
function planGroups(products, refCount) {
  const groups = new Map();
  for (const p of products) {
    const key = normalizeProductName(p.nameHebrew);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const plans = [];
  for (const [key, docs] of groups) {
    if (docs.length < 2) continue;
    const ranked = [...docs].sort((a, b) =>
      (refCount.get(b._id) ?? 0) - (refCount.get(a._id) ?? 0)
      || Number(!!b._userModified) - Number(!!a._userModified)
      || (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity)
      || String(a._id).localeCompare(String(b._id)));
    plans.push({ key, keeper: ranked[0], losers: ranked.slice(1) });
  }
  return plans;
}

async function dedupeBusiness(db, businessId, { write, log }) {
  const products = await db.collection('products').find({ businessId, ...LIVE }).toArray();
  const ids = products.map((p) => p._id);
  // How many recipe/dish lines use each product (live and trashed recipes alike).
  const refCount = new Map();
  for (const type of ['recipes', 'dishes']) {
    const docs = await db.collection(type).find(
      { businessId, 'ingredients.referenceId': { $in: ids } },
      { projection: { ingredients: 1 } }
    ).toArray();
    for (const d of docs) for (const ing of d.ingredients ?? []) {
      if (ing?.referenceId) refCount.set(ing.referenceId, (refCount.get(ing.referenceId) ?? 0) + 1);
    }
  }
  const plans = planGroups(products, refCount);
  const summary = { groups: plans.length, removed: 0, linesRepointed: 0, historyRepointed: 0 };
  if (!plans.length) return summary;

  const idMap = new Map();
  const keeperById = new Map();
  for (const { keeper, losers } of plans) {
    keeperById.set(keeper._id, keeper);
    for (const l of losers) idMap.set(l._id, keeper._id);
    summary.removed += losers.length;
    log(`  «${keeper.nameHebrew}» keep ${keeper._id} (${refCount.get(keeper._id) ?? 0} lines) · remove ${losers.map((l) => `${l._id} (${refCount.get(l._id) ?? 0})`).join(', ')}`);
  }

  // Ingredient lines → keeper (+ keeper name as nameSnapshot).
  for (const type of ['recipes', 'dishes']) {
    const docs = await db.collection(type).find({ businessId, 'ingredients.referenceId': { $in: [...idMap.keys()] } }).toArray();
    for (const d of docs) {
      let n = 0;
      const ingredients = d.ingredients.map((ing) => {
        const to = ing?.referenceId && idMap.get(ing.referenceId);
        if (!to) return ing;
        n++;
        return { ...ing, referenceId: to, nameSnapshot: keeperById.get(to).nameHebrew };
      });
      summary.linesRepointed += n;
      if (write) await db.collection(type).updateOne({ _id: d._id }, { $set: { ingredients } });
    }
  }

  // Version history: entries about a removed copy, and snapshots that point at one.
  const history = await db.collection('VERSION_HISTORY').find({ businessId }).toArray();
  for (const h of history) {
    const [next, changed] = replaceIds({ entityId: h.entityId, snapshot: h.snapshot }, idMap);
    if (!changed) continue;
    summary.historyRepointed++;
    if (write) await db.collection('VERSION_HISTORY').updateOne({ _id: h._id }, { $set: next });
  }

  if (write) {
    const now = Date.now();
    for (const { keeper, losers } of plans) {
      const sources = mergeSources([keeper.sources ?? [], ...losers.map((l) => l.sources ?? [])]);
      await db.collection('products').updateOne({ _id: keeper._id }, { $set: { sources, updatedAt: now } });
      await db.collection('products').updateMany(
        { _id: { $in: losers.map((l) => l._id) }, ...LIVE },
        { $set: { deletedAt: now, deletedBy: DELETED_BY } }
      );
    }
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
    console.log(`[dedupe-485] ${args.write ? 'WRITE' : 'dry run'} · ${businesses.length} business(es)`);
    const total = { groups: 0, removed: 0, linesRepointed: 0, historyRepointed: 0 };
    for (const businessId of businesses) {
      const lines = [];
      const s = await dedupeBusiness(db, businessId, { write: args.write, log: (l) => lines.push(l) });
      if (!s.groups) continue;
      const biz = await db.collection('businesses').findOne({ _id: businessId }, { projection: { name: 1 } });
      console.log(`business ${biz?.name ?? businessId}: ${s.groups} names, ${s.removed} copies to remove, ${s.linesRepointed} recipe lines, ${s.historyRepointed} history entries`);
      lines.forEach((l) => console.log(l));
      for (const k of Object.keys(total)) total[k] += s[k];
    }
    console.log(`[dedupe-485] total: ${total.groups} names, ${total.removed} copies, ${total.linesRepointed} recipe lines, ${total.historyRepointed} history entries${args.write ? '' : ' (dry run — nothing written; add --write)'}`);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main().catch((err) => { console.error('[dedupe-485] failed:', err.message); process.exit(1); });
}

module.exports = { planGroups, mergeSources, replaceIds, dedupeBusiness };
