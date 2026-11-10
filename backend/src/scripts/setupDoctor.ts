import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDatabase } from '../config/database';
import { initializeModels } from '../config/initializeModels';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { AuditLog } from '../models/AuditLog';
import { randomUUID } from 'crypto';
import { hashPassword } from '../services/passwordService';

async function setup(): Promise<void> {
  const input = z
    .object({
      DOCTOR_NAME: z.string().trim().min(2).max(200),
      DOCTOR_EMAIL: z
        .string()
        .email()
        .max(254)
        .transform((v) => v.toLowerCase()),
      DOCTOR_PASSWORD: z.string().min(14).max(128),
    })
    .safeParse(process.env);
  if (!input.success)
    throw new Error('Set DOCTOR_NAME, DOCTOR_EMAIL and DOCTOR_PASSWORD (at least 14 characters).');
  await connectDatabase();
  await initializeModels();
  const existing = await User.findOne({ slot: 'doctor' });
  if (existing?.isDemo)
    throw new Error('Use a separate empty production database; do not convert the demo database.');
  if (existing && process.env.ROTATE_DOCTOR_CREDENTIALS !== 'true') {
    throw new Error(
      'Doctor already exists. To deliberately rotate credentials, set ROTATE_DOCTOR_CREDENTIALS=true.',
    );
  }
  const values = {
    name: input.data.DOCTOR_NAME,
    email: input.data.DOCTOR_EMAIL,
    passwordHash: await hashPassword(input.data.DOCTOR_PASSWORD),
    isDemo: false,
    role: 'administrator',
    active: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
  };
  // A version change also invalidates sessions created by an in-flight old login.
  const doctor = await User.findOneAndUpdate(
    { slot: 'doctor' },
    { $set: values, $inc: { credentialVersion: 1 } },
    { upsert: true, new: true, runValidators: true },
  );
  await Session.deleteMany({ userId: doctor!._id });
  await AuditLog.create({
    actorId: doctor!._id,
    action: existing ? 'DOCTOR_CREDENTIAL_ROTATION' : 'DOCTOR_SETUP',
    outcome: 'success',
    requestId: randomUUID(),
  });
  console.info('Doctor account configured. Existing sessions revoked.');
}
setup()
  .catch(() => {
    console.error(
      'Doctor setup failed. Verify setup variables, database connectivity and the existing account. Demo databases cannot be converted; existing accounts require ROTATE_DOCTOR_CREDENTIALS=true.',
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
