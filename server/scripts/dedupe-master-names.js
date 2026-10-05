'use strict';
/**
 * dedupe-master-names.js — Plan 379.
 *
 * The __master__ library holds several docs under the same name (an import that ran
 * twice: suppliers, products, equipment, venues, recipes, dishes), and every user got a
 * clone of each. recipes + dishes share one name namespace, so the recipe-builder's
 * duplicate-name check blocks saving any of them.
 *
 * Merges duplicates collection by collection — suppliers, equipment, venues, products,
 * then recipes + dishes (repeated until stable, since a recipe can reference another).
 * Per duplicated name, one master doc is kept (most user-edited clones, then oldest).
 * Every other master doc in the group is:
 *   - identical content once its references are mapped onto the kept docs
 *     (ids / owner / timestamps ignored), or named in --force-delete → merged: every
 *     reference to it, in every user's data, is repointed to the keeper, then it is deleted.
 *     Each user's clone of it is repointed to that user's clone of the keeper and deleted,
 *     or — when the user has no clone of the keeper — re-linked to the keeper instead.
 *   - different content → renamed (dish twin of a preparation gets "(מנה)", else " 2", " 3"…),
 *     along with each user's untouched clone of it. Nothing with distinct content is deleted.
 * User clones with _userModified: true are never deleted or renamed — listed in the report.
 *
 * Dry run by default (writes nothing). Take a backup first, then add --write:
 *   node server/scripts/db-backup.js --target=atlas
 *   node server/scripts/dedupe-master-names.js --target=atlas --confirm-host=<host> \
 *     [--force-delete="<name>"]... [--out=FILE] [--write]
 */

const fs = require('fs');

const MASTER = '__master__';
const ALL_COLLECTIONS = ['suppliers', 'equipment', 'venues', 'products', 'recipes', 'dishes', 'menuEvents'];
const NAMESPACES = [['suppliers'], ['equipment'], ['venues'], ['products'], ['recipes', 'dishes']];
const IGNORED_FIELDS = new Set(['_id', 'userId', '_masterId', '_userModified', 'createdAt', 'updatedAt', '__v']);

function parseArgs(argv) {
  const args = { write: false, forceDelete: [] };
  for (const arg of argv.slice(2)) {
    if (arg === '--write') { args.write = true; continue; }
    const m = /^--(target|confirm-host|out|force-delete)=(.*)$/.exec(arg);
    if (!m) throw new Error(`Unknown argument: ${arg}`);
    if (m[1] === 'force-delete') args.forceDelete.push(m[2].trim());
    else args[m[1]] = m[2];
  }
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  return args;
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;
const nameOf = (doc) => (doc.nameHebrew ?? doc.name ?? '').toString().trim();

/** Deep-replaces every string value found in `map` (old id → new id), leaving _id/_masterId and
 *  non-plain objects (Date, Decimal128, ObjectId) alone. Returns [newValue, changed]. */
function replaceIds(value, map) {
  if (typeof value === 'string') return map.has(value) ? [map.get(value), true] : [value, false];
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => { const [nv, c] = replaceIds(v, map); changed ||= c; return nv; });
    return [changed ? out : value, changed];
  }
  if (isPlainObject(value)) {
    let changed = false;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      // Identity/linkage, not references.
      if (k === '_id' || k === '_masterId') { out[k] = v; continue; }
      const [nv, c] = replaceIds(v, map);
      out[k] = nv;
      changed ||= c;
    }
    return [changed ? out : value, changed];
  }
  return [value, false];
}

/** Stable JSON of a doc's content after mapping its references, ignoring identity/ownership/timestamps. */
function contentKey(doc, map = new Map()) {
  const norm = (v) => {
    if (Array.isArray(v)) return v.map(norm);
    if (isPlainObject(v)) return Object.keys(v).sort().reduce((o, k) => { o[k] = norm(v[k]); return o; }, {});
    return v;
  };
  const body = {};
  for (const k of Object.keys(doc)) if (!IGNORED_FIELDS.has(k)) body[k] = doc[k];
  return JSON.stringify(norm(replaceIds(body, map)[0]));
}

const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Two copies of one item when, after mapping references, every content field is either equal or
 * empty on one side (e.g. nutrition data was filled in on only one copy). Returns the fields the
 * keeper is missing and `other` has, or null when some field genuinely differs.
 */
function compatibleFill(keeper, other, map, isBroken = () => false) {
  const fill = {};
  const keys = new Set([...Object.keys(keeper), ...Object.keys(other)].filter((k) => !IGNORED_FIELDS.has(k)));
  for (const k of keys) {
    const a = keeper[k], b = other[k];
    if (isEmpty(b) || isBroken(k, b)) continue;
    if (isEmpty(a) || isBroken(k, a)) { fill[k] = replaceIds(b, map)[0]; continue; }
    if (contentKey({ v: a }, map) !== contentKey({ v: b }, map)) return null;
  }
  return fill;
}

/**
 * Plans every change. Pure: takes { [collection]: docs[] } and returns the final state of every
 * touched doc plus a human-readable log. Nothing here talks to the database.
 */
function planDedupe(data, { forceDelete = [] } = {}) {
  const force = new Set(forceDelete);
  // col → Map(_id → doc). Docs are replaced (never mutated) as the plan evolves.
  const state = Object.fromEntries(ALL_COLLECTIONS.map((c) => [c, new Map((data[c] ?? []).map((d) => [d._id, d]))]));
  const original = Object.fromEntries(ALL_COLLECTIONS.map((c) => [c, new Map(state[c])]));
  const deleted = new Set(); // `${col}:${_id}`
  const repoint = new Map(); // old _id → kept _id (ids are unique per collection, and practically globally)
  const log = { merged: [], renamed: [], relinked: [], skippedEdited: [] };
  const live = (col) => [...state[col].values()].filter((d) => !deleted.has(`${col}:${d._id}`) && d._userDeleted !== true);
  // An old import left logistics pointing at equipment ids that never existed (eq_001…). A copy
  // whose logistics only differs by such dead ids counts as empty there, so the valid copy wins.
  const equipmentIds = new Set(state.equipment.keys());
  // userId → Map(master _id → that user's clone _id), across every collection.
  const userCloneMap = (userId) => {
    const m = new Map();
    for (const col of ALL_COLLECTIONS) {
      for (const d of state[col].values()) {
        if (d.userId === userId && typeof d._masterId === 'string' && !deleted.has(`${col}:${d._id}`)) m.set(d._masterId, d._id);
      }
    }
    return m;
  };
  const isBroken = (k, v) =>
    k === 'logistics' && (v?.baseline ?? []).some((b) => b.equipmentId && !equipmentIds.has(b.equipmentId));

  for (const cols of NAMESPACES) {
    for (let pass = 0; pass < 5; pass++) {
      let mergedThisPass = 0;
      const tagged = cols.flatMap((col) => live(col).map((doc) => ({ doc, col })));
      const masters = tagged.filter((t) => t.doc.userId === MASTER);
      const usedNames = new Set(masters.map((m) => nameOf(m.doc)).filter(Boolean));
      const clonesByMaster = new Map();
      for (const t of tagged) {
        if (t.doc.userId === MASTER || typeof t.doc._masterId !== 'string') continue;
        if (!clonesByMaster.has(t.doc._masterId)) clonesByMaster.set(t.doc._masterId, []);
        clonesByMaster.get(t.doc._masterId).push(t);
      }
      const groups = new Map();
      for (const m of masters) {
        const name = nameOf(m.doc);
        if (!name) continue;
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(m);
      }

      for (const [name, members] of groups) {
        if (members.length < 2) continue;
        const editedCount = (m) => (clonesByMaster.get(m.doc._id) ?? []).filter((c) => c.doc._userModified).length;
        members.sort((a, b) =>
          editedCount(b) - editedCount(a) ||
          (a.doc.createdAt ?? 0) - (b.doc.createdAt ?? 0) ||
          String(a.doc._id).localeCompare(String(b.doc._id)));
        const [keeper, ...extras] = members;
        // userId → that user's clone of the keeper (its _id), growing as clones get re-linked.
        const keeperCloneOf = new Map((clonesByMaster.get(keeper.doc._id) ?? []).map((c) => [c.doc.userId, c.doc._id]));

        for (const ex of extras) {
          const keeperDoc = state[keeper.col].get(keeper.doc._id);
          const fill = ex.col === keeper.col ? compatibleFill(keeperDoc, ex.doc, repoint, isBroken) : null;
          const identical = fill !== null;
          const exClones = clonesByMaster.get(ex.doc._id) ?? [];
          for (const c of exClones.filter((c) => c.doc._userModified)) {
            log.skippedEdited.push({ col: c.col, name, _id: c.doc._id, userId: c.doc.userId, master: ex.doc._id });
          }
          const untouched = exClones.filter((c) => !c.doc._userModified);

          if (identical || force.has(name)) {
            mergedThisPass++;
            const filled = fill ? Object.keys(fill) : [];
            if (filled.length) {
              // The keeper takes over what only the extra had — on master and on each untouched
              // user clone of the keeper, so users get it too.
              state[keeper.col].set(keeper.doc._id, { ...keeperDoc, ...fill });
              for (const c of clonesByMaster.get(keeper.doc._id) ?? []) {
                if (c.doc._userModified) continue;
                const cur = state[c.col].get(c.doc._id);
                // Master ids inside the filled value → this user's own clones of them.
                const toUser = userCloneMap(c.doc.userId);
                const add = Object.fromEntries(
                  filled.filter((k) => isEmpty(cur[k]) || isBroken(k, cur[k])).map((k) => [k, replaceIds(fill[k], toUser)[0]])
                );
                state[c.col].set(c.doc._id, { ...cur, ...add });
              }
            }
            repoint.set(ex.doc._id, keeper.doc._id);
            deleted.add(`${ex.col}:${ex.doc._id}`);
            let clonesDeleted = 0;
            for (const c of untouched) {
              const target = keeperCloneOf.get(c.doc.userId);
              if (target) {
                repoint.set(c.doc._id, target);
                deleted.add(`${c.col}:${c.doc._id}`);
                clonesDeleted++;
              } else {
                state[c.col].set(c.doc._id, { ...c.doc, _masterId: keeper.doc._id });
                keeperCloneOf.set(c.doc.userId, c.doc._id);
                log.relinked.push({ col: c.col, name, _id: c.doc._id, userId: c.doc.userId, to: keeper.doc._id });
              }
            }
            log.merged.push({
              col: ex.col, name, _id: ex.doc._id, into: `${keeper.col}/${keeper.doc._id}`,
              why: identical ? (filled.length ? `same, keeper gains ${filled.join(',')}` : 'identical') : 'forced',
              clonesDeleted
            });
          } else {
            // Only renamed once the namespace is stable — a later pass may still make it identical.
            ex.pendingRename = { name, keeperCol: keeper.col, untouched };
          }
        }
      }
      if (mergedThisPass === 0) {
        // Stable: rename whatever is still a different doc under a duplicated name.
        for (const [name, members] of groups) {
          if (members.length < 2) continue;
          for (const ex of members) {
            if (!ex.pendingRename || deleted.has(`${ex.col}:${ex.doc._id}`)) continue;
            const base = ex.col === 'dishes' && ex.pendingRename.keeperCol === 'recipes' ? `${name} (מנה)` : name;
            let newName = base === name ? `${name} 2` : base;
            for (let i = 2; usedNames.has(newName); i++) newName = `${base} ${i}`;
            usedNames.add(newName);
            const field = 'nameHebrew' in ex.doc ? 'nameHebrew' : 'name';
            state[ex.col].set(ex.doc._id, { ...state[ex.col].get(ex.doc._id), [field]: newName });
            for (const c of ex.pendingRename.untouched) {
              state[c.col].set(c.doc._id, { ...state[c.col].get(c.doc._id), [field]: newName });
            }
            log.renamed.push({ col: ex.col, name, newName, _id: ex.doc._id, clones: ex.pendingRename.untouched.length });
          }
        }
        break;
      }
    }
  }

  // Repoint every reference in every surviving doc (all owners, soft-deleted included).
  for (const col of ALL_COLLECTIONS) {
    for (const [id, doc] of state[col]) {
      if (deleted.has(`${col}:${id}`)) continue;
      const [updated, changed] = replaceIds(doc, repoint);
      if (changed) state[col].set(id, updated);
    }
  }

  const writes = [];
  for (const col of ALL_COLLECTIONS) {
    for (const [id, doc] of state[col]) {
      if (deleted.has(`${col}:${id}`)) writes.push({ op: 'delete', col, _id: id, userId: doc.userId });
      else if (doc !== original[col].get(id)) writes.push({ op: 'replace', col, _id: id, userId: doc.userId, doc });
    }
  }

  // Verification: no surviving doc may still reference a deleted one.
  const deletedIds = new Set([...deleted].map((k) => k.slice(k.indexOf(':') + 1)));
  const danglingRefs = [];
  const scan = (v, owner) => {
    if (typeof v === 'string') { if (deletedIds.has(v)) danglingRefs.push({ ...owner, ref: v }); return; }
    if (Array.isArray(v)) { v.forEach((x) => scan(x, owner)); return; }
    if (isPlainObject(v)) for (const [k, x] of Object.entries(v)) if (k !== '_id' && k !== '_masterId') scan(x, owner);
  };
  for (const col of ALL_COLLECTIONS) {
    for (const [id, doc] of state[col]) if (!deleted.has(`${col}:${id}`)) scan(doc, { col, _id: id });
  }

  // Verification: duplicate names left per owner, in the final state.
  const remaining = [];
  for (const cols of NAMESPACES) {
    const byOwner = new Map();
    for (const col of cols) {
      for (const [id, doc] of state[col]) {
        if (deleted.has(`${col}:${id}`) || doc._userDeleted === true) continue;
        const key = `${doc.userId}\u0000${nameOf(doc)}`;
        byOwner.set(key, (byOwner.get(key) ?? 0) + 1);
      }
    }
    for (const [key, n] of byOwner) {
      if (n < 2) continue;
      const [userId, name] = key.split('\u0000');
      if (name) remaining.push({ namespace: cols.join('+'), userId, name, count: n });
    }
  }

  return { writes, log, remaining, danglingRefs, repoint };
}

function summarize({ writes, log, remaining, danglingRefs }) {
  const lines = [];
  const count = (op, col) => writes.filter((w) => w.op === op && (!col || w.col === col)).length;
  lines.push(`writes: ${writes.length} — deletes ${count('delete')}, updates ${count('replace')}`);
  for (const col of ALL_COLLECTIONS) {
    const d = count('delete', col), r = count('replace', col);
    if (d || r) lines.push(`   ${col}: delete ${d}, update ${r}`);
  }
  lines.push(`master docs merged: ${log.merged.length} · renamed: ${log.renamed.length} · user clones re-linked: ${log.relinked.length} · user-edited clones left as-is: ${log.skippedEdited.length}`);
  lines.push(`duplicate names left afterwards (any owner): ${remaining.length}`);
  lines.push(`references left pointing at a deleted doc: ${danglingRefs.length}`);
  lines.push('', 'Merged (deleted after repointing):');
  for (const m of log.merged) lines.push(`   ${m.col}/${m._id} "${m.name}" → ${m.into} [${m.why}], user clones deleted ${m.clonesDeleted}`);
  if (log.renamed.length) {
    lines.push('', 'Renamed (content differs):');
    for (const r of log.renamed) lines.push(`   ${r.col}/${r._id} "${r.name}" → "${r.newName}", user clones ${r.clones}`);
  }
  if (log.relinked.length) {
    lines.push('', 'User clones re-linked to the kept master:');
    for (const r of log.relinked) lines.push(`   ${r.col}/${r._id} (${r.userId}) "${r.name}"`);
  }
  if (log.skippedEdited.length) {
    lines.push('', 'User-edited clones left as-is:');
    for (const s of log.skippedEdited) lines.push(`   ${s.col}/${s._id} (${s.userId}) "${s.name}"`);
  }
  if (remaining.length) {
    lines.push('', 'Duplicate names still left:');
    for (const r of remaining) lines.push(`   ${r.namespace} (${r.userId}) "${r.name}" ×${r.count}`);
  }
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const { connect } = require('../migrations/tools/_connect');
  const { client, db } = await connect(args);
  try {
    const data = {};
    for (const col of ALL_COLLECTIONS) data[col] = await db.collection(col).find({}).toArray();
    const plan = planDedupe(data, { forceDelete: args.forceDelete });
    const report = summarize(plan);
    console.log(report);
    if (args.out) fs.writeFileSync(args.out, report + '\n', 'utf8');
    if (!args.write) {
      console.log('\n[dry run] nothing written. Re-run with --write to apply.');
      return;
    }
    // Replacements (repointed references, renames, re-links) before deletes, so a failure midway
    // never leaves a reference pointing at a doc that is already gone.
    for (const w of plan.writes.filter((w) => w.op === 'replace')) {
      await db.collection(w.col).replaceOne({ _id: w._id, userId: w.userId }, w.doc);
    }
    for (const w of plan.writes.filter((w) => w.op === 'delete')) {
      await db.collection(w.col).deleteOne({ _id: w._id, userId: w.userId });
    }
    console.log(`\n[write] applied ${plan.writes.length} writes.`);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}

module.exports = { planDedupe, contentKey, replaceIds, summarize };
