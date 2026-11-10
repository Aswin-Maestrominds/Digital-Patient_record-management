import { Schema, model } from 'mongoose';
const sessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userAgent: { type: String, default: '' },
    lastActiveAt: { type: Date, default: Date.now },
    csrfToken: { type: String, required: true },
    credentialVersion: { type: Number, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);
export const Session = model('Session', sessionSchema);
