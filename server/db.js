const mongoose = require('mongoose')
const { CLONEABLE_TYPES } = require('./constants/cloneable-types')
const { SEARCHABLE_ENTITY_TYPES } = require('./constants/searchable-entity-types')

async function connectDb() {
  const isLocal = process.env.NODE_ENV === 'development'
  const uri = isLocal ? process.env.MONGO_LOCAL_URI : process.env.MONGO_URI

  if (isLocal && !uri) throw new Error('MONGO_LOCAL_URI is not set in .env')
  if (!isLocal && !uri) throw new Error('MONGO_URI is not set in .env')
  if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET is not set in .env')
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET is not set in .env')

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, minPoolSize: 1, maxPoolSize: 10 })
  console.log(`MongoDB connected → ${uri.startsWith('mongodb+srv') ? 'Atlas' : 'local'}`)

  // Runtime visibility — the initial connect() above only guards startup. Without these,
  // a mid-session Atlas drop (network blip, IP de-allowlisted, cluster maintenance) is
  // invisible until a request happens to hit it and time out.
  mongoose.connection.on('error', err => console.error('[mongo] connection error:', err.message))
  mongoose.connection.on('disconnected', () => console.error('[mongo] disconnected'))
  mongoose.connection.on('reconnected', () => console.log('[mongo] reconnected'))

  // Ensure userId index on every entity collection.
  // createIndex is idempotent — safe to call on every startup.
  // background: true is a no-op on MongoDB 4.2+ but harmless for older drivers.
  const db = mongoose.connection.db
  await Promise.all(
    CLONEABLE_TYPES.map(type =>
      db.collection(type).createIndex({ userId: 1 }, { background: true })
    )
  )
  console.log(`userId indexes ensured for ${CLONEABLE_TYPES.length} collections`)

  // VERSION_HISTORY is not cloneable but needs a compound index for per-entity queries.
  await db.collection('VERSION_HISTORY').createIndex(
    { userId: 1, entityType: 1, entityId: 1 },
    { background: true }
  )
  console.log('VERSION_HISTORY compound index ensured (userId, entityType, entityId)')

  // Compound index for the lean prefix-match /search endpoint (plan 301, Milestone 1).
  // Supports { userId, nameHebrew: ^prefix } queries without a collection scan.
  await Promise.all(
    SEARCHABLE_ENTITY_TYPES.map(type =>
      db.collection(type).createIndex({ userId: 1, nameHebrew: 1 }, { background: true })
    )
  )
  console.log(`nameHebrew search indexes ensured for ${SEARCHABLE_ENTITY_TYPES.join(', ')}`)

  // Compound indexes for GET /:type/count filters (plan 312) — without these, the
  // lowStock/unapproved filters only use the userId prefix and scan every remaining
  // doc in memory.
  await db.collection('products').createIndex(
    { userId: 1, minStockLevel: 1 },
    { background: true }
  )
  await Promise.all(
    ['recipes', 'dishes'].map(type =>
      db.collection(type).createIndex({ userId: 1, isApproved: 1 }, { background: true })
    )
  )
  console.log('count-filter indexes ensured (products.minStockLevel, recipes/dishes.isApproved)')

  // Multikey compound index for the DELETE /:type/:id referential-integrity check (plan 312) —
  // without this, deleting a product scans every recipe/dish's ingredients array per user.
  await Promise.all(
    ['recipes', 'dishes'].map(type =>
      db.collection(type).createIndex({ userId: 1, 'ingredients.referenceId': 1 }, { background: true })
    )
  )
  console.log('ingredients.referenceId indexes ensured for recipes, dishes')

  // Plan 321 Phase 3: one term per (kind, key, owner); same names as migration 0003 so both are idempotent.
  await db.collection('taxonomyTerms').createIndex({ kind: 1, key: 1, userId: 1 }, { unique: true, name: 'kind_key_user_unique' })
  await db.collection('taxonomyTerms').createIndex({ userId: 1, kind: 1, sortOrder: 1 }, { name: 'user_kind_order' })
  console.log('taxonomyTerms indexes ensured')
}

module.exports = { connectDb }
