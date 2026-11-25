'use strict';
/**
 * seed-demo-restaurant.js — Plan 674.
 *
 * Fills a LOCAL database with one demo restaurant ("מסעדת הדגמה"): an owner user, a public profile with table settings,
 * a 14-table room with 2 joins, 6 clients, 40 bookings over seven days on real tables (each live booking holds its tables
 * in `tableHolds`) and 4 waiting parties. The business is `internal: true` (kept out of platform totals).
 * Idempotent: only documents whose `_id` is not in the database yet are inserted; nothing existing is changed, except the demo assistant's level (plan 719).
 * Booking statuses come from the clock of the run, so seed a fresh scratch database shortly before a demo.
 *
 * Local only: `--target=atlas` and `--confirm-host` are refused. Dry run by default (writes nothing). Add --write:
 *   DEMO_OWNER_PASSWORD=<at least 8 characters> node server/scripts/seed-demo-restaurant.js --target=local --db=<scratch> --write
 * The password is read from the environment, stored only as a PBKDF2 hash, and never printed.
 * To remove the demo data, drop the scratch database.
 */

const crypto = require('node:crypto');
const { parseArgs } = require('./seed-demo-business');
const { buildDemoRestaurant, OWNER_ID, BUSINESS_ID, OWNER_NAME } = require('./lib/demo-restaurant-data');

const DAY = 86400000;
const MIN = 60000;
const PLAIN = ['frontDeskProfiles', 'floorPlans', 'clients', 'waitlistEntries'];
const LIVE_STATUSES = ['confirmed', 'seated'];

/** The stored password form `<saltHex>:<hashHex>` (PBKDF2-SHA-256, 100 000 rounds, 32 bytes), as signup stores it. */
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/** Stops with the first document that does not pass its shared schema (INV-4). */
function validateAll(parseV2, data) {
  for (const collection of [...PLAIN, 'bookings']) {
    for (const doc of data[collection]) {
      const result = parseV2(collection, doc);
      if (!result.success) {
        const issue = result.issues[0];
        throw new Error(`${collection}/${doc._id}: ${issue.path || '(root)'} ${issue.message}`);
      }
    }
  }
}

async function seedDemoRestaurant(db, { write = false, now = Date.now(), passwordHash } = {}) {
  const { parseV2 } = require('../utils/schema-check');
  const { businessSchema } = require('../generated/schemas/entities');
  const holds = require('../services/table-holds');
  const data = buildDemoRestaurant({ now, ownerId: OWNER_ID, businessId: BUSINESS_ID });
  validateAll(parseV2, data);

  const business = {
    _id: BUSINESS_ID, name: 'מסעדת הדגמה', ownerId: OWNER_ID, createdAt: now - 90 * DAY, internal: true,
    lastSyncedMasterVersion: 0, modules: ['events', 'event_logistics', 'frontdesk', 'ai_create', 'tables'],
  };
  const checked = businessSchema.safeParse(business);
  if (!checked.success) throw new Error(`businesses/${BUSINESS_ID}: ${checked.error.issues[0].path.join('.')} ${checked.error.issues[0].message}`);

  const plan = [
    ['users', [{
      _id: OWNER_ID, name: OWNER_NAME, email: 'demo-restaurant@foodco.invalid', imgUrl: '', role: 'user', passwordHash: passwordHash ?? null,
      failedAttempts: 0, lockedUntil: null, lastSyncedMasterVersion: 0, businessId: BUSINESS_ID, businessRole: 'owner',
      isPlatformAdmin: false, removedAt: null, createdAt: now - 90 * DAY,
    }]],
    ['businesses', [business]],
    ...PLAIN.map(name => [name, data[name]]),
  ];
  if (write && !passwordHash && !(await db.collection('users').findOne({ _id: OWNER_ID }))) {
    throw new Error('passwordHash is required to create the demo owner');
  }

  const missingOf = async (name, docs) => {
    const have = new Set((await db.collection(name).find({ _id: { $in: docs.map(d => d._id) } }, { projection: { _id: 1 } }).toArray()).map(d => d._id));
    return docs.filter(d => !have.has(d._id));
  };

  let inserted = 0;
  let skipped = 0;
  let claimed = 0;
  for (const [name, docs] of plan) {
    const fresh = await missingOf(name, docs);
    skipped += docs.length - fresh.length;
    if (fresh.length === 0) continue;
    if (write) {
      await db.collection(name).insertMany(fresh, { ordered: true });
      inserted += fresh.length;
    }
    console.log(`${write ? 'inserted' : 'would insert'} ${fresh.length} ${name}`);
  }

  const freshBookings = await missingOf('bookings', data.bookings);
  skipped += data.bookings.length - freshBookings.length;
  if (freshBookings.length > 0) {
    const live = freshBookings.filter(b => LIVE_STATUSES.includes(b.status)).length;
    if (!write) {
      console.log(`would insert ${freshBookings.length} bookings`);
      console.log(`would claim tables for ${live} bookings`);
    } else {
      const bufferMs = data.frontDeskProfiles[0].tableService.bufferMinutes * MIN;
      for (const booking of freshBookings) {
        const isLive = LIVE_STATUSES.includes(booking.status);
        if (isLive) {
          const res = await holds.claim(db, { _id: booking._id, businessId: booking.businessId }, booking.tableKeys, booking.startAt, booking.endAt + bufferMs);
          if (!res.ok) throw new Error(`demo booking ${booking._id}: its table is taken in this database`);
        }
        try {
          await db.collection('bookings').insertOne(booking);
        } catch (err) {
          if (isLive) await holds.release(db, booking.businessId, booking._id);
          throw err;
        }
        inserted++;
        if (isLive) claimed++;
      }
      console.log(`inserted ${freshBookings.length} bookings`);
    }
  }

  const levelFilter = { _id: 'demo_rest_profile', businessId: BUSINESS_ID, 'assistant.level': 0, 'adminHistory.0': { $exists: false }, 'levelHistory.0': { $exists: false } };
  if (write) {
    const raised = await db.collection('frontDeskProfiles').updateOne(levelFilter, { $set: { 'assistant.level': 1, updatedAt: now } });
    if (raised.matchedCount) console.log('raised the demo assistant to level 1');
  } else if (await db.collection('frontDeskProfiles').findOne(levelFilter, { projection: { _id: 1 } })) {
    console.log('would raise the demo assistant to level 1');
  }

  const total = plan.reduce((n, [, docs]) => n + docs.length, 0) + data.bookings.length;
  if (skipped === total) console.log('already seeded');
  else if (write) console.log(`demo seed: ${inserted} documents inserted (${claimed} bookings claimed tables), ${skipped} already there - done`);
  else console.log('demo seed: new documents found (dry run, nothing written; add --write)');
  return { inserted, skipped, claimed };
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
    await seedDemoRestaurant(db, { write: args.write, passwordHash });
  } finally {
    await client.close();
  }
}

module.exports = { seedDemoRestaurant };

if (require.main === module) {
  main().catch((err) => { console.error('[seed-demo-restaurant] failed:', err.message); process.exit(1); });
}
