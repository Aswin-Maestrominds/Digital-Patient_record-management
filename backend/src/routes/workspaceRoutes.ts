import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Patient } from '../models/Patient';
import { MedicalDocument } from '../models/MedicalDocument';
import { AuditLog } from '../models/AuditLog';
import { asyncHandler, HttpError, escapeRegex } from '../utils/http';
import { requireRoles } from '../middleware/authMiddleware';
import { hashPassword, verifyPassword } from '../services/passwordService';
import { publicUser } from '../services/authService';
import { recordAudit } from '../services/auditService';
import { pagination, todayInIndia } from '../validators/schemas';
const router = Router();
const role = z.enum(['administrator', 'doctor', 'staff']);
const password = z
  .string()
  .min(12)
  .max(128)
  .regex(/[0-9]/, 'Include a number.')
  .regex(/[^a-zA-Z0-9]/, 'Include a symbol.');
const profile = z
  .object({
    name: z.string().trim().min(2).max(200),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    phone: z.string().trim().max(20).default(''),
    avatar: z
      .string()
      .max(150000)
      .regex(/^(|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$/)
      .optional(),
  })
  .strict();
const userFilter = (workspaceId: string) => ({ $or: [{ workspaceId }, { _id: workspaceId }] });
router.get(
  '/users',
  requireRoles('administrator'),
  asyncHandler(async (req, res) => {
    const q = pagination
      .extend({
        search: z.string().max(100).optional(),
        role: role.optional(),
        active: z.enum(['true', 'false']).optional(),
      })
      .strict()
      .parse(req.query);
    const filter = {
      ...userFilter(req.auth!.workspaceId),
      ...(q.role ? { role: q.role } : {}),
      ...(q.active ? { active: q.active === 'true' } : {}),
      ...(q.search
        ? {
            $and: [
              {
                $or: [
                  { name: new RegExp(escapeRegex(q.search), 'i') },
                  { email: new RegExp(escapeRegex(q.search), 'i') },
                ],
              },
            ],
          }
        : {}),
    };
    const [users, total, all] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: 1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit),
      User.countDocuments(filter),
      User.find(userFilter(req.auth!.workspaceId)).select('active role'),
    ]);
    res.json({
      success: true,
      users: users.map((u) => ({ ...publicUser(u), active: u.active, lastLogin: u.lastLogin })),
      total,
      page: q.page,
      limit: q.limit,
      stats: {
        total: all.length,
        active: all.filter((u) => u.active).length,
        roles: Object.fromEntries(
          ['administrator', 'doctor', 'staff'].map((r) => [
            r,
            all.filter((u) => u.role === r).length,
          ]),
        ),
      },
    });
  }),
);
router.post(
  '/users',
  requireRoles('administrator'),
  asyncHandler(async (req, res) => {
    const data = profile.extend({ role, password }).parse(req.body);
    const user = await User.create({
      ...data,
      password: undefined,
      passwordHash: await hashPassword(data.password),
      slot: randomUUID(),
      workspaceId: req.auth!.workspaceId,
    });
    await recordAudit(req, 'USER_CREATE', { resourceId: String(user._id) });
    res.status(201).json({ success: true, user: publicUser(user) });
  }),
);
router.patch(
  '/users/:id',
  requireRoles('administrator'),
  asyncHandler(async (req, res) => {
    const id = z
      .string()
      .regex(/^[a-f0-9]{24}$/i)
      .parse(req.params.id);
    const data = z
      .object({
        name: z.string().trim().min(2).max(200).optional(),
        role: role.optional(),
        active: z.boolean().optional(),
        password: password.optional(),
      })
      .strict()
      .parse(req.body);
    // The workspace owner remains an administrator; this also prevents concurrent last-admin removal.
    if (
      id === req.auth!.workspaceId &&
      ((data.role && data.role !== 'administrator') || data.active === false)
    )
      throw new HttpError(400, 'The workspace owner must remain an active administrator.');
    if (
      id === req.auth!.userId &&
      (data.active === false || (data.role && data.role !== 'administrator'))
    )
      throw new HttpError(400, 'You cannot deactivate or demote your own account.');
    const { password: nextPassword, ...updates } = data;
    const user = await User.findOneAndUpdate(
      { _id: id, ...userFilter(req.auth!.workspaceId) },
      {
        $set: {
          ...updates,
          ...(nextPassword
            ? {
                passwordHash: await hashPassword(nextPassword),
                failedLoginAttempts: 0,
                lockedUntil: null,
              }
            : {}),
        },
        $inc: { credentialVersion: 1 },
      },
      { new: true, runValidators: true },
    );
    if (!user) throw new HttpError(404, 'User not found.');
    await Session.deleteMany({ userId: id });
    await recordAudit(req, 'USER_UPDATE', { resourceId: id });
    res.json({ success: true, user: publicUser(user) });
  }),
);
router.patch(
  '/account/profile',
  asyncHandler(async (req, res) => {
    const data = profile.parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.auth!.userId,
      { $set: data },
      { new: true, runValidators: true },
    );
    await recordAudit(req, 'PROFILE_UPDATE');
    res.json({ success: true, user: publicUser(user!) });
  }),
);
router.post(
  '/account/password',
  asyncHandler(async (req, res) => {
    const data = z
      .object({ currentPassword: z.string().max(128), newPassword: password })
      .strict()
      .parse(req.body);
    const user = await User.findById(req.auth!.userId).select('+passwordHash');
    if (!user || !(await verifyPassword(data.currentPassword, user.passwordHash)))
      throw new HttpError(400, 'Current password is incorrect.');
    if (data.currentPassword === data.newPassword)
      throw new HttpError(400, 'Choose a different new password.');
    const updated = await User.findOneAndUpdate(
      { _id: user._id, credentialVersion: user.credentialVersion },
      {
        $set: { passwordHash: await hashPassword(data.newPassword) },
        $inc: { credentialVersion: 1 },
      },
      { new: true },
    );
    if (!updated) throw new HttpError(409, 'Account changed. Please sign in again.');
    await Session.updateOne(
      { _id: req.auth!.sessionId },
      { credentialVersion: updated.credentialVersion },
    );
    await Session.deleteMany({ userId: user._id, _id: { $ne: req.auth!.sessionId } });
    await recordAudit(req, 'PASSWORD_CHANGE');
    res.json({ success: true });
  }),
);
router.patch(
  '/account/preferences',
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        inactivityMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
        signInAlerts: z.boolean().optional(),
        language: z.literal('English').optional(),
        timeZone: z.enum(['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London']).optional(),
        dateFormat: z.enum(['DD MMM YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']).optional(),
        directoryView: z.enum(['grid', 'table']).optional(),
        registrations: z.boolean().optional(),
        uploads: z.boolean().optional(),
        changes: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.auth!.userId,
      { $set: Object.fromEntries(Object.entries(data).map(([k, v]) => ['preferences.' + k, v])) },
      { new: true, runValidators: true },
    );
    await recordAudit(req, 'PREFERENCES_UPDATE');
    res.json({ success: true, user: publicUser(user!) });
  }),
);
router.get(
  '/account/sessions',
  asyncHandler(async (req, res) => {
    const sessions = await Session.find({
      userId: req.auth!.userId,
      expiresAt: { $gt: new Date() },
    })
      .select('userAgent createdAt lastActiveAt')
      .sort({ createdAt: -1 });
    res.json({
      success: true,
      sessions: sessions.map((s) => ({
        id: String(s._id),
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        current: String(s._id) === req.auth!.sessionId,
      })),
    });
  }),
);
router.delete(
  '/account/sessions',
  asyncHandler(async (req, res) => {
    await Session.deleteMany({ userId: req.auth!.userId, _id: { $ne: req.auth!.sessionId } });
    await recordAudit(req, 'SESSIONS_REVOKED');
    res.json({ success: true });
  }),
);
router.get(
  '/workspace/stats',
  asyncHandler(async (req, res) => {
    const doctorId = req.auth!.workspaceId;
    const since = new Date(Date.now() - 7 * 86400000);
    const today = new Date(todayInIndia() + 'T00:00:00+05:30');
    const [patients, documents, recentPatients, accessed, recentDocuments, pdf, images] =
      await Promise.all([
        Patient.countDocuments({ doctorId }),
        MedicalDocument.countDocuments({ doctorId }),
        Patient.countDocuments({ doctorId, createdAt: { $gte: since } }),
        AuditLog.countDocuments({
          workspaceId: doctorId,
          action: 'PATIENT_VIEW',
          outcome: 'success',
          occurredAt: { $gte: today },
        }),
        MedicalDocument.countDocuments({ doctorId, uploadedAt: { $gte: since } }),
        MedicalDocument.countDocuments({ doctorId, mimeType: 'application/pdf' }),
        MedicalDocument.countDocuments({
          doctorId,
          mimeType: { $in: ['image/jpeg', 'image/png'] },
        }),
      ]);
    res.json({
      success: true,
      patients,
      documents,
      recentPatients,
      accessed,
      recentDocuments,
      pdf,
      images,
    });
  }),
);
router.get(
  '/account/notifications',
  asyncHandler(async (req, res) => {
    const u = await User.findById(req.auth!.userId);
    const p = u?.preferences;
    const actions = [
      ...(p?.registrations ? ['PATIENT_CREATE'] : []),
      ...(p?.uploads ? ['DOCUMENT_UPLOAD'] : []),
      ...(p?.changes ? ['PATIENT_UPDATE'] : []),
    ];
    const filters: object[] = [{ workspaceId: req.auth!.workspaceId, action: { $in: actions } }];
    if (p?.signInAlerts) filters.push({ actorId: req.auth!.userId, action: 'LOGIN' });
    const logs = await AuditLog.find({ $or: filters, outcome: 'success' })
      .sort({ occurredAt: -1 })
      .limit(10)
      .select('action occurredAt actorName patientId');
    res.json({ success: true, logs });
  }),
);
export default router;
