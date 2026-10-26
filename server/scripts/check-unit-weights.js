'use strict';
/**
 * check-unit-weights.js — read-only: which saved products and recipe lines did the old "shared unit weight"
 * behavior (plan 423) possibly get wrong?
 *
 * A purchase unit's weight belongs to the product ("1 jar" of onion = 500 g, of pickles = 350 g). Before plan
 * 423 a unit's first weight was a shared default and the «:» unit of a purchase row (`uom`) was ignored by
 * every calculation. Prints three sections, one line per hit plus a count:
 *   1. uom differs                          products whose cost changes after plan 423 (they were wrong)
 *   2. copied from shared                   custom purchase units whose weight equals the shared unit weight
 *   3. recipe lines on a unit the product lacks   recipe/dish lines that fall back to the shared weight
 * Read-only; exits 0 always (it is a report, not a gate). Never prints a connection string.
 *
 * Usage:
 *   node server/scripts/check-unit-weights.js --target=local
 *   node server/scripts/check-unit-weights.js --target=atlas
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const { MongoClient } = require('mongodb');

/** Same values as SYSTEM_UNITS in src/app/core/services/unit-registry.service.ts (gram-equivalent). */
const SYSTEM_UNITS = {
  kg: 1000, liter: 1000, gram: 1, ml: 1, unit: 1, dish: 1, tablespoon: 15, teaspoon: 5, cup: 240, pinch: 1, portion: 1,
};

/** Relative tolerance when comparing two weights. */
const EPSILON = 1e-6;

const near = (a, b) => Math.abs(a - b) <= EPSILON * Math.max(1, Math.abs(a), Math.abs(b));

function line(collection, doc, detail) {
  const name = doc.nameHebrew || doc.nameEnglish || doc.name || '';
  return `  ${collection} ${doc._id} ${name} ${detail}`;
}

async function main() {
  const target = (process.argv.find(a => a.startsWith('--target=')) || '').split('=')[1];
  if (target !== 'local' && target !== 'atlas') {
    console.error('Usage: node server/scripts/check-unit-weights.js --target=local|atlas');
    process.exit(2);
  }
  const uri = target === 'local' ? process.env.MONGO_LOCAL_URI : process.env.MONGO_URI;
  if (!uri) {
    console.error(`${target === 'local' ? 'MONGO_LOCAL_URI' : 'MONGO_URI'} is not set in server/.env`);
    process.exit(2);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const uomDiffers = [];
  const copied = [];
  const missing = [];
  try {
    const db = client.db();

    // Shared unit weights (gram-equivalent), per owner: a product only sees its owner's custom units.
    const sharedByUser = new Map();
    for (const t of await db.collection('taxonomyTerms').find({ kind: 'unit' }, { projection: { userId: 1, key: 1, gramRate: 1 } }).toArray()) {
      if (!sharedByUser.has(t.userId)) sharedByUser.set(t.userId, new Map());
      sharedByUser.get(t.userId).set(t.key, t.gramRate);
    }
    const factorOf = (userId, key) => SYSTEM_UNITS[key] ?? sharedByUser.get(userId)?.get(key);

    const products = await db.collection('products')
      .find({}, { projection: { userId: 1, nameHebrew: 1, nameEnglish: 1, baseUnit: 1, purchaseOptions: 1 } }).toArray();
    const productById = new Map();
    for (const p of products) {
      productById.set(String(p._id), p);
      const base = p.baseUnit || 'gram';
      for (const o of p.purchaseOptions || []) {
        if (o.uom && o.uom !== base) {
          uomDiffers.push(line('products', p, `${o.unitSymbol}: ${o.conversionRate} : ${o.uom} (base ${base})`));
        }
        if (o.unitSymbol in SYSTEM_UNITS) continue;
        const shared = sharedByUser.get(p.userId)?.get(o.unitSymbol);
        const uomFactor = factorOf(p.userId, o.uom || base);
        if (shared && uomFactor && near(o.conversionRate * uomFactor, shared)) {
          copied.push(line('products', p, `${o.unitSymbol}: ${o.conversionRate} ${o.uom || base} = shared ${shared} g`));
        }
      }
    }

    for (const collection of ['recipes', 'dishes']) {
      const docs = await db.collection(collection)
        .find({ 'ingredients.0': { $exists: true } }, { projection: { userId: 1, nameHebrew: 1, nameEnglish: 1, ingredients: 1 } }).toArray();
      for (const d of docs) {
        for (const ing of d.ingredients || []) {
          if (ing.type !== 'product' || !ing.referenceId || !ing.unit) continue;
          if (ing.unit in SYSTEM_UNITS || !sharedByUser.get(d.userId)?.has(ing.unit)) continue;
          const p = productById.get(String(ing.referenceId));
          if (!p || ing.unit === p.baseUnit) continue;
          if ((p.purchaseOptions || []).some(o => o.unitSymbol === ing.unit)) continue;
          missing.push(line(collection, d, `line "${ing.unit}" on product ${p._id} ${p.nameHebrew || ''} lacks that unit`));
        }
      }
    }
  } finally {
    await client.close();
  }

  const section = (title, rows) => {
    console.log(`${title}: ${rows.length}`);
    for (const r of rows) console.log(r);
  };
  section('uom differs', uomDiffers);
  section('copied from shared', copied);
  section('recipe lines on a unit the product lacks', missing);
  process.exit(0);
}

main().catch(err => {
  // Never print the connection string.
  console.error('UNIT_WEIGHTS: failed —', String(err.message).replace(/mongodb(\+srv)?:\/\/\S+/g, '<uri>'));
  process.exit(2);
});
