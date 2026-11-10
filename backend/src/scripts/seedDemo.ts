import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import { connectDatabase } from '../config/database';
import { initializeModels } from '../config/initializeModels';
import { env } from '../config/env';
import { User } from '../models/User';
import { Patient } from '../models/Patient';
import { hashPassword } from '../services/passwordService';
import { registerPatient } from '../services/patientService';

async function seed(): Promise<void> {
  if (env.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production.');
  await connectDatabase();
  await initializeModels();
  let doctor = await User.findOne({ slot: 'doctor' });
  if (doctor && !doctor.isDemo)
    throw new Error('Refusing to seed demo data into an existing doctor account.');
  if (!doctor) {
    const password = randomBytes(18).toString('base64url');
    doctor = await User.create({
      name: 'Demo Doctor',
      email: 'doctor@medivault.test',
      isDemo: true,
      role: 'administrator',
      passwordHash: await hashPassword(password),
    });
    console.info(`Demo email: doctor@medivault.test\nOne-time password output: ${password}`);
  } else console.info('Demo account already exists; its password has not changed.');
  if ((await Patient.countDocuments({ doctorId: doctor._id })) === 0) {
    for (const data of [
      {
        name: 'Synthetic Patient Alpha',
        dob: '1990-01-15',
        gender: 'Female' as const,
        phone: '0000000000',
      },
      {
        name: 'Synthetic Patient Beta',
        dob: '1985-06-20',
        gender: 'Male' as const,
        phone: '0000000000',
      },
      {
        name: 'Synthetic Patient Gamma',
        dob: '2000-09-10',
        gender: 'Other' as const,
        phone: '0000000000',
      },
    ])
      await registerPatient(String(doctor._id), {
        ...data,
        notes: 'Synthetic test record. Not a real patient.',
      });
  }
  console.info('Demo setup complete.');
}
seed()
  .catch((error) => {
    console.error(
      error instanceof Error && !('code' in error) ? error.message : 'Demo setup failed.',
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
