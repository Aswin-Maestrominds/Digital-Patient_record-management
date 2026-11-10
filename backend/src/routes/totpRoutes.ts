import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { asyncHandler, HttpError } from '../utils/http';
import { verifyPassword } from '../services/passwordService';
import { newTotpSecret, sealSecret, openSecret, verifyTotp } from '../services/totpService';
import { recordAudit } from '../services/auditService';
import { loginLimiter } from '../middleware/rateLimits';
const router = Router();
router.use(loginLimiter);
const input = z
  .object({
    password: z.string().min(1).max(128),
    code: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .strict();
router.post(
  '/setup',
  asyncHandler(async (req, res) => {
    const data = input.parse(req.body);
    const user = await User.findById(req.auth!.userId).select('+passwordHash');
    if (!user || !(await verifyPassword(data.password, user.passwordHash)))
      throw new HttpError(400, 'Current password is incorrect.');
    if (user.totpEnabled) throw new HttpError(409, 'Two-step verification is already enabled.');
    const secret = newTotpSecret();
    await User.updateOne(
      { _id: user._id },
      {
        pendingTotpSecret: sealSecret(secret, String(user._id)),
        pendingTotpExpires: new Date(Date.now() + 600000),
      },
    );
    res.json({ success: true, secret });
  }),
);
router.post(
  '/enable',
  asyncHandler(async (req, res) => {
    const code = z
      .object({ code: z.string().regex(/^\d{6}$/) })
      .strict()
      .parse(req.body).code;
    const user = await User.findById(req.auth!.userId).select('+pendingTotpSecret');
    if (
      !user?.pendingTotpSecret ||
      !user.pendingTotpExpires ||
      user.pendingTotpExpires < new Date()
    )
      throw new HttpError(400, 'Start setup again.');
    const step = verifyTotp(openSecret(user.pendingTotpSecret, String(user._id)), code);
    if (step === null) throw new HttpError(400, 'Invalid authenticator code.');
    const updated = await User.findOneAndUpdate(
      { _id: user._id, pendingTotpSecret: user.pendingTotpSecret, totpEnabled: { $ne: true } },
      {
        $set: { totpSecret: user.pendingTotpSecret, totpEnabled: true, lastTotpStep: step },
        $unset: { pendingTotpSecret: 1, pendingTotpExpires: 1 },
        $inc: { credentialVersion: 1 },
      },
      { new: true },
    );
    if (!updated) throw new HttpError(409, 'Setup changed. Please try again.');
    await Session.updateOne(
      { _id: req.auth!.sessionId },
      { credentialVersion: updated.credentialVersion },
    );
    await Session.deleteMany({ userId: user._id, _id: { $ne: req.auth!.sessionId } });
    await recordAudit(req, 'TWO_STEP_ENABLED');
    res.json({ success: true });
  }),
);
router.post(
  '/disable',
  asyncHandler(async (req, res) => {
    const data = input.parse(req.body);
    const user = await User.findById(req.auth!.userId).select('+passwordHash +totpSecret');
    if (!user?.totpSecret || !(await verifyPassword(data.password, user.passwordHash)))
      throw new HttpError(400, 'Invalid credentials.');
    const step = verifyTotp(
      openSecret(user.totpSecret, String(user._id)),
      data.code ?? '',
      user.lastTotpStep,
    );
    if (step === null) throw new HttpError(400, 'Invalid or already used authenticator code.');
    const updated = await User.findOneAndUpdate(
      { _id: user._id, lastTotpStep: { $lt: step } },
      {
        $set: { totpEnabled: false, lastTotpStep: step },
        $unset: { totpSecret: 1 },
        $inc: { credentialVersion: 1 },
      },
      { new: true },
    );
    if (!updated) throw new HttpError(409, 'Code already used.');
    await Session.updateOne(
      { _id: req.auth!.sessionId },
      { credentialVersion: updated.credentialVersion },
    );
    await Session.deleteMany({ userId: user._id, _id: { $ne: req.auth!.sessionId } });
    await recordAudit(req, 'TWO_STEP_DISABLED');
    res.json({ success: true });
  }),
);
export default router;
