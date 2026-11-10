import { timingSafeEqual } from 'crypto';
import { RequestHandler } from 'express';
import { env } from '../config/env';
import { Session } from '../models/Session';
import { User } from '../models/User';
import { sha256 } from '../services/encryptionService';
import { recordAudit } from '../services/auditService';
import { asyncHandler, HttpError } from '../utils/http';

export const sessionCookieName =
  env.NODE_ENV === 'production' ? '__Host-medivault_session' : 'medivault_session';
export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token: unknown = req.cookies?.[sessionCookieName];
  const session =
    typeof token === 'string' && /^[a-f\d]{64}$/.test(token)
      ? await Session.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } })
      : null;
  const user = session ? await User.findById(session.userId) : null;
  if (
    !session ||
    !user ||
    !user.active ||
    session.credentialVersion !== user.credentialVersion ||
    Date.now() - new Date(session.lastActiveAt ?? session.createdAt).getTime() >
      (user.preferences?.inactivityMinutes ?? 30) * 60000 ||
    (env.NODE_ENV === 'production' && user.isDemo)
  ) {
    await recordAudit(req, 'ACCESS_DENIED', { outcome: 'denied' });
    throw new HttpError(401, 'Please log in.');
  }
  req.auth = {
    userId: String(user._id),
    workspaceId: String(user.workspaceId ?? user._id),
    role: user.role,
    sessionId: String(session._id),
    csrfToken: session.csrfToken,
  };
  await Session.updateOne({ _id: session._id }, { lastActiveAt: new Date() });
  next();
});

export const requireCsrf: RequestHandler = asyncHandler(async (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  const supplied = Buffer.from(req.get('X-CSRF-Token') ?? '');
  const expected = Buffer.from(req.auth?.csrfToken ?? '');
  if (
    !expected.length ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    await recordAudit(req, 'CSRF_REJECTED', { outcome: 'denied' });
    throw new HttpError(403, 'Invalid CSRF token.');
  }
  next();
});

export const requireRoles = (...roles: string[]): RequestHandler =>
  asyncHandler(async (req, _res, next) => {
    if (!roles.includes(req.auth!.role)) {
      await recordAudit(req, 'ACCESS_DENIED', { outcome: 'denied' });
      throw new HttpError(403, 'Your role does not permit this action.');
    }
    next();
  });
