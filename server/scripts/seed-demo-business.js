'use strict';
/**
 * seed-demo-business.js — Plan 575.
 *
 * Fills a LOCAL database with one demo catering business ("קייטרינג הדגמה"): an owner user, 4 suppliers, 30 products,
 * 6 preparations, 10 dishes, 2 venues, 6 clients, 7 events (with their money) and 21 days of usage, so the dashboard,
 * the recipe book and the events all show data in a demo. The business is `internal: true` (kept out of platform totals).
 * Idempotent: only documents whose `_id` is not in the database yet are inserted; nothing existing is changed.
 *
 * Local only: `--target=atlas` and `--confirm-host` are refused. Dry run by default (writes nothing). Add --write:
 *   DEMO_OWNER_PASSWORD=<at least 8 characters> node server/scripts/seed-demo-business.js --target=local --db=<scratch> --write
 * The password is read from the environment, stored only as a PBKDF2 hash, and never printed.
 * To remove the demo data, drop the scratch database.
 */

const crypto = require('node:crypto');
const { buildDemoData } = require('./lib/demo-data');

const OWNER_ID = 'demo_owner';
const BUSINESS_ID = 'demo_business';
const DAY = 86400000;
const COLLECTIONS = ['suppliers', 'products', 'recipes', 'dishes', 'venues', 'clients', 'menuEvents', 'usageDays'];
const VALIDATED = new Set(['suppliers', 'products', 'recipes', 'dishes', 'venues', 'clients', 'menuEvents']);

function parseArgs(argv) {
  const args = { write: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--write') { args.write = true; continue; }
    if (arg.startsWith('--confirm-host')) throw new Error('demo seed is local only');
    const m = /^--(target|db)=(.*)$/.exec(arg);
    if (!m) throw new Error(`Unknown argument: ${arg}`);
    args[m[1]] = m[2];
  }
  if (args.target === 'atlas') throw new Error('demo seed is local only');
  if (args.target !== 'local') throw new Error("--target must be 'local'");
  if (args.db !== undefined && !/^[A-Za-z0-9_-]+$/.test(args.db)) throw new Error('--db=<name>: letters, digits, _ and - only');
  return args;
}

/** The stored password form `<saltHex>:<hashHex>` (PBKDF2-SHA-256, 100 000 rounds, 32 bytes), as signup stores it. */
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/** Stops with the first document that does not pass its shared schema (INV-4). */
function validateAll(parseV2, data) {
  for (const collection of VALIDATED) {
    for (const doc of data[collection]) {
      const result = parseV2(collection, doc);
      if (!result.success) {
        const issue = result.issues[0];
        throw new Error(`${collection}/${doc._id}: ${issue.path || '(root)'} ${issue.message}`);
      }
    }
  }
}

async function seedDemoBusiness(db, { write = false, now = Date.now(), passwordHash } = {}) {
  const { parseV2 } = require('../utils/schema-check');
  const { businessSchema } = require('../generated/schemas/entities');
  const data = buildDemoData({ now, ownerId: OWNER_ID, businessId: BUSINESS_ID, ownerName: 'demo_chef' });
  validateAll(parseV2, data);

  const business = {
    _id: BUSINESS_ID, name: 'קייטרינג הדגמה', ownerId: OWNER_ID, createdAt: now - 90 * DAY, internal: true,
    lastSyncedMasterVersion: 0, baseline: { ...data.baseline, filledAt: now - 89 * DAY },
  };
  const checked = businessSchema.safeParse(business);
  if (!checked.success) throw new Error(`businesses/${BUSINESS_ID}: ${checked.error.issues[0].path.join('.')} ${checked.error.issues[0].message}`);

  const plan = [
    ['users', [{
      _id: OWNER_ID, name: 'demo_chef', email: 'demo@foodco.invalid', imgUrl: '', role: 'user', passwordHash: passwordHash ?? null,
      failedAttempts: 0, lockedUntil: null, lastSyncedMasterVersion: 0, businessId: BUSINESS_ID, businessRole: 'owner',
      isPlatformAdmin: false, removedAt: null, createdAt: now - 90 * DAY,
    }]],
    ['businesses', [business]],
    ...COLLECTIONS.map(name => [name, data[name]]),
  ];
  if (write && !passwordHash && !(await db.collection('users').findOne({ _id: OWNER_ID }))) {
    throw new Error('passwordHash is required to create the demo owner');
  }

  let inserted = 0;
  let skipped = 0;
  for (const [name, docs] of plan) {
    const col = db.collection(name);
    const have = new Set((await col.find({ _id: { $in: docs.map(d => d._id) } }, { projection: { _id: 1 } }).toArray()).map(d => d._id));
    const fresh = docs.filter(d => !have.has(d._id));
    skipped += docs.length - fresh.length;
    if (fresh.length === 0) continue;
    if (write) {
      await col.insertMany(fresh, { ordered: true });
      inserted += fresh.length;
    }
    console.log(`${write ? 'inserted' : 'would insert'} ${fresh.length} ${name}`);
  }
  const total = plan.reduce((n, [, docs]) => n + docs.length, 0);
  if (skipped === total) console.log('already seeded');
  else if (write) console.log(`demo seed: ${inserted} documents inserted, ${skipped} already there - done`);
  else console.log('demo seed: new documents found (dry run, nothing written; add --write)');
  return { inserted, skipped };
}

async function main() {
  const args = parseArgs(process.argv);
  let passwordHash;
  if (args.write) {
    const password = process.env.DEMO_OWNER_PASSWORD;
    if (!password || password.length < 8) throw new Error('--write needs DEMO_OWNER_PASSWORD (at least 8 characters) in the environment');
    passwordHash = hashPassword(password);
  }
  const { connect } = require('../migrations/tools/_connect');
  const { client, db } = await connect({ target: 'local', db: args.db });
  try {
    await seedDemoBusiness(db, { write: args.write, passwordHash });
  } finally {
    await client.close();
  }
}

module.exports = { parseArgs, seedDemoBusiness };

if (require.main === module) {
  main().catch((err) => { console.error('[seed-demo-business] failed:', err.message); process.exit(1); });
}
