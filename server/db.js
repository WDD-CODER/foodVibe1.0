const mongoose = require('mongoose')

async function connectDb() {
  const isProduction = process.env.NODE_ENV === 'production'
  const uri = isProduction
    ? process.env.MONGO_REMOTE_URI
    : process.env.MONGO_LOCAL_URI

  if (!uri) {
    const missing = isProduction ? 'MONGO_REMOTE_URI' : 'MONGO_LOCAL_URI'
    throw new Error(`${missing} is not set in .env`)
  }
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set in .env')

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  console.log(`MongoDB connected [${isProduction ? 'Atlas' : 'Compass'}]`)
}

module.exports = { connectDb }
