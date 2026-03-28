const mongoose = require('mongoose')

async function connectDb() {
  // LOCAL  → NODE_ENV is unset or 'development' → Compass (localhost)
  // REMOTE → NODE_ENV === 'production'           → Atlas
  // On Render: set NODE_ENV=production in the service environment variables.
  const isProduction = process.env.NODE_ENV === 'production'
  const target = isProduction ? 'Atlas' : 'Compass (local)'
  const uri = isProduction
    ? process.env.MONGO_REMOTE_URI
    : process.env.MONGO_LOCAL_URI

  if (!uri) {
    const missing = isProduction ? 'MONGO_REMOTE_URI' : 'MONGO_LOCAL_URI'
    throw new Error(`${missing} is not set in .env`)
  }
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set in .env')

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  console.log(`MongoDB connected → ${target}`)
}

module.exports = { connectDb }
