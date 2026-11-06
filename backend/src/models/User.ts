import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    // A unique fixed slot enforces the single-doctor scope during concurrent setup.
    slot: { type: String, enum: ['doctor'], default: 'doctor', unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    isDemo: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    credentialVersion: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
  },
  { timestamps: true },
);
export const User = model('User', userSchema);
