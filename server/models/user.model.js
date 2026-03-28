const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    _id: { type: String },
    name: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    imgUrl: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Number, default: null },
  },
  { timestamps: false }
);

module.exports = model('User', userSchema);
