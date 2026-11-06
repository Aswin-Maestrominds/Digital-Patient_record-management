import { randomBytes } from 'crypto';
import { env } from '../config/env';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { dummyPasswordHash, verifyPassword } from './passwordService';
import { sha256 } from './encryptionService';

export async function verifyDoctor(email: string, password: string) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = await verifyPassword(password, user?.passwordHash ?? dummyPasswordHash);
  if (
    !user ||
    !user.active ||
    (env.NODE_ENV === 'production' && user.isDemo) ||
    (user.lockedUntil && user.lockedUntil > new Date())
  )
    return null;
  if (!valid) {
    const failed = await User.findByIdAndUpdate(
      user._id,
      { $inc: { failedLoginAttempts: 1 } },
      { new: true },
    );
    if (failed && failed.failedLoginAttempts >= 5) {
      await User.updateOne(
        { _id: user._id },
        { lockedUntil: new Date(Date.now() + 15 * 60 * 1000), failedLoginAttempts: 0 },
      );
    }
    return null;
  }
  await User.updateOne({ _id: user._id }, { failedLoginAttempts: 0, $unset: { lockedUntil: 1 } });
  return user;
}

export async function createSession(userId: string, credentialVersion: number) {
  const token = randomBytes(32).toString('hex');
  const csrfToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.SESSION_HOURS * 3600000);
  const session = await Session.create({
    userId,
    tokenHash: sha256(token),
    csrfToken,
    expiresAt,
    credentialVersion,
  });
  return { session, token, csrfToken, expiresAt };
}

export function publicUser(user: { _id: unknown; name: string; email: string; isDemo: boolean }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: 'doctor',
    isDemo: user.isDemo,
  };
}
