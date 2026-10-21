'use strict';
/**
 * time-business-stats.js - read-only: how long do the dashboard aggregations (plan 447) take on real data?
 *
 * For every business and every period (30, 90, all) it runs the same two pipelines as
 * GET /api/v1/stats/business, prints "<businessId> <period> <ms>" and the first stage of each query plan,
 * and exits 1 when any run takes 500 ms or more, or a first stage is a full collection scan.
 * Point it at a restored copy of the live data, never at production.
 *
 * Usage:
 *   node server/scripts/time-business-stats.js --target=local
 *   node server/scripts/time-business-stats.js --target=local --db=foodvibe_scratch_447
 *   node server/scripts/time-business-stats.js --target=atlas   (read-only, only on explicit request)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const { MongoClient } = require('mongodb');
const { periodBounds, eventsPipeline, usagePipeline } = require('../services/business-stats');
const { jerusalemDate } = require('../middleware/usage');

const LIMIT_MS = 500;
const DAY_MS = 86400000;
const PERIODS = ['30', '90', 'all'];

const arg = name => (process.argv.find(a => a.startsWith(`--${name}=`)) || '').split('=')[1];

/** Names the first stage of a query plan, e.g. "IXSCAN(business_date)" or "COLLSCAN". */
function firstStage(explain) {
  const plan = explain?.queryPlanner?.winningPlan ?? explain?.stages?.[0]?.$cursor?.queryPlanner?.winningPlan;
  let node = plan;
  while (node && !node.indexName && node.stage !== 'COLLSCAN' && node.inputStage) node = node.inputStage;
  if (!node) return 'UNKNOWN';
  // DISTINCT_SCAN is also an index walk.
  return node.indexName ? `IXSCAN(${node.indexName})` : node.stage;
}

async function main() {
  const target = arg('target');
  if (target !== 'local' && target !== 'atlas') {
    console.error('Usage: node server/scripts/time-business-stats.js --target=local|atlas [--db=<name>]');
    process.exit(2);
  }
  const uri = target === 'local' ? process.env.MONGO_LOCAL_URI : process.env.MONGO_URI;
  if (!uri) {
    console.error(`${target === 'local' ? 'MONGO_LOCAL_URI' : 'MONGO_URI'} is not set in server/.env`);
    process.exit(2);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  let slow = 0;
  let scans = 0;
  try {
    const db = arg('db') ? client.db(arg('db')) : client.db();
    const businesses = await db.collection('businesses').find({}, { projection: { _id: 1, createdAt: 1 } }).toArray();
    const now = Date.now();
    const todayIL = jerusalemDate(now);
    const plus14IL = jerusalemDate(now + 14 * DAY_MS);
    console.log(`businesses: ${businesses.length}`);

    for (const business of businesses) {
      const scope = { businessId: business._id };
      for (const period of PERIODS) {
        const bounds = periodBounds(period, now, business.createdAt);
        const events = eventsPipeline(scope, bounds, todayIL, plus14IL, now);
        const usage = usagePipeline(scope, bounds, todayIL);
        const started = Date.now();
        await Promise.all([
          db.collection('menuEvents').aggregate(events).toArray(),
          db.collection('usageDays').aggregate(usage).toArray(),
        ]);
        const ms = Date.now() - started;
        if (ms >= LIMIT_MS) slow += 1;
        console.log(`${business._id} ${period} ${ms}`);
      }
      const [eventsPlan, usagePlan] = await Promise.all([
        db.collection('menuEvents').aggregate(eventsPipeline(scope, periodBounds('30', now, business.createdAt), todayIL, plus14IL, now)).explain(),
        db.collection('usageDays').aggregate(usagePipeline(scope, periodBounds('30', now, business.createdAt), todayIL)).explain(),
      ]);
      const stages = { menuEvents: firstStage(eventsPlan), usageDays: firstStage(usagePlan) };
      if (Object.values(stages).some(s => s === 'COLLSCAN')) scans += 1;
      console.log(`${business._id} plan menuEvents=${stages.menuEvents} usageDays=${stages.usageDays}`);
    }
  } finally {
    await client.close();
  }
  const ok = slow === 0 && scans === 0;
  console.log(ok ? `TIMING: ok (every run under ${LIMIT_MS} ms, no collection scan)` : `TIMING: ${slow} run(s) at ${LIMIT_MS} ms or more, ${scans} business(es) with a collection scan`);
  process.exit(ok ? 0 : 1);
}

main().catch(err => {
  // Never print the connection string.
  console.error('TIMING: failed -', String(err.message).replace(/mongodb(\+srv)?:\/\/\S+/g, '<uri>'));
  process.exit(2);
});
