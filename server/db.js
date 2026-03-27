const mongoose = require('mongoose');

/**
 * Connects to MongoDB Atlas using the MONGO_URI environment variable.
 * Throws if MONGO_URI is not set.
 * @returns {Promise<void>}
 */
async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI environment variable is required');
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

module.exports = { connectDb };
