import { Session } from '../models/Session';
import { User } from '../models/User';
import { sessionCookieName, sessionCookieOptions } from '../middleware/authMiddleware';
import { createSession, publicUser, verifyDoctor } from '../services/authService';
import { recordAudit } from '../services/auditService';
import { sha256 } from '../services/encryptionService';
import { asyncHandler, HttpError } from '../utils/http';
import { loginInput } from '../validators/schemas';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginInput.parse(req.body);
  const user = await verifyDoctor(email, password);
  if (!user) {
    await recordAudit(req, 'LOGIN_FAILED', { outcome: 'denied' });
    throw new HttpError(401, 'Invalid email or password, or account temporarily unavailable.');
  }
  await recordAudit(req, 'LOGIN', { actorId: String(user._id) });
  const previous: unknown = req.cookies?.[sessionCookieName];
  if (typeof previous === 'string') await Session.deleteOne({ tokenHash: sha256(previous) });
  const { token, csrfToken, expiresAt } = await createSession(
    String(user._id),
    user.credentialVersion,
  );
  res.cookie(sessionCookieName, token, { ...sessionCookieOptions, expires: expiresAt });
  res.json({ success: true, user: publicUser(user), csrfToken, expiresAt });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth!.userId);
  if (!user) throw new HttpError(401, 'Please log in.');
  res.json({ success: true, user: publicUser(user), csrfToken: req.auth!.csrfToken });
});

export const logout = asyncHandler(async (req, res) => {
  await recordAudit(req, 'LOGOUT');
  await Session.deleteOne({ _id: req.auth!.sessionId });
  res.clearCookie(sessionCookieName, sessionCookieOptions);
  res.json({ success: true });
});
