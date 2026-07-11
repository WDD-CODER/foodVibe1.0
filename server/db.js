const mongoose = require('mongoose')
const { CLONEABLE_TYPES } = require('./constants/cloneable-types')

async function connectDb() {
  const isLocal = process.env.NODE_ENV === 'development'
  const uri = isLocal ? process.env.MONGO_LOCAL_URI : process.env.MONGO_URI

  if (isLocal && !uri) throw new Error('MONGO_LOCAL_URI is not set in .env')
  if (!isLocal && !uri) throw new Error('MONGO_URI is not set in .env')
  if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET is not set in .env')
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET is not set in .env')

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, minPoolSize: 1, maxPoolSize: 10 })
  console.log(`MongoDB connected → ${uri.startsWith('mongodb+srv') ? 'Atlas' : 'local'}`)

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
}

module.exports = { connectDb }
