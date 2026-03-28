const mongoose = require('mongoose')

async function connectDb() {
  const uri = process.env.MONGO_URI
  if (!uri) throw new Error('MONGO_URI is not set in .env')
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set in .env')

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  console.log(`MongoDB connected → ${uri.startsWith('mongodb+srv') ? 'Atlas' : 'local'}`)
}

module.exports = { connectDb }
