import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    // Retain the original owner slot for backwards-compatible setup.
    slot: { type: String, default: 'doctor', unique: true, required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['administrator', 'doctor', 'staff'], default: 'doctor' },
    phone: { type: String, default: '' },
    avatar: { type: String, default: '' },
    lastLogin: Date,
    preferences: {
      inactivityMinutes: { type: Number, default: 30 },
      signInAlerts: { type: Boolean, default: true },
      language: { type: String, default: 'English' },
      timeZone: { type: String, default: 'Asia/Kolkata' },
      dateFormat: { type: String, default: 'DD MMM YYYY' },
      directoryView: { type: String, default: 'grid' },
      registrations: { type: Boolean, default: true },
      uploads: { type: Boolean, default: true },
      changes: { type: Boolean, default: true },
    },
    totpSecret: { type: String, select: false },
    pendingTotpSecret: { type: String, select: false },
    pendingTotpExpires: Date,
    totpEnabled: { type: Boolean, default: false },
    lastTotpStep: { type: Number, default: -1 },
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
