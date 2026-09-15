const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    _id: { type: String },
    name: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    imgUrl: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    passwordHash: { type: String, default: null },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Number, default: null },
    // Master version (server/services/master-version.js) this user was last synced against.
    // POST /refresh skips syncMasterToUser when this already matches the current version.
    lastSyncedMasterVersion: { type: Number, default: 0 },
  },
  { timestamps: false }
);

module.exports = model('User', userSchema);
