import { z } from 'zod';
import { Types } from 'mongoose';
import { Patient } from '../models/Patient';
import { MedicalDocument } from '../models/MedicalDocument';
import { generatePatientId } from './patientIdGenerator';
import { escapeRegex, HttpError } from '../utils/http';
import { patientInput, patientQuery, patientUpdate } from '../validators/schemas';

export async function requirePatient(doctorId: string, id: string, includeDeleting = false) {
  const patient = await Patient.findOne({
    doctorId,
    id,
    ...(!includeDeleting ? { deletionStarted: { $ne: true } } : {}),
  })
    .select('-_id -__v -doctorId')
    .lean();
  if (!patient) throw new HttpError(404, 'Patient not found.');
  return patient;
}
export async function listPatients(doctorId: string, query: z.infer<typeof patientQuery>) {
  const { search, page, limit } = query;
  const filter = {
    doctorId,
    ...(search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { id: { $regex: escapeRegex(search), $options: 'i' } },
          ],
        }
      : {}),
  };
  const [patients, total] = await Promise.all([
    Patient.find(filter)
      .select('-_id -__v -doctorId')
      .sort({ createdAt: -1, id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Patient.countDocuments(filter),
  ]);
  const counts = await MedicalDocument.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        doctorId: new Types.ObjectId(doctorId),
        patientId: { $in: patients.map((p) => p.id) },
      },
    },
    { $group: { _id: '$patientId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id, c.count]));
  return {
    patients: patients.map((p) => ({ ...p, storedRecordsCount: countMap.get(p.id) ?? 0 })),
    total,
    page,
    limit,
  };
}
export async function registerPatient(doctorId: string, data: z.infer<typeof patientInput>) {
  const patient = await Patient.create({ ...data, doctorId, id: await generatePatientId() });
  return requirePatient(doctorId, patient.id);
}
export async function editPatient(
  doctorId: string,
  id: string,
  data: z.infer<typeof patientUpdate>,
) {
  // Flatten nested objects so a partial address update preserves other fields.
  const updates: Record<string, unknown> = {};
  const removals: Record<string, 1> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (nestedValue === null) removals[`${key}.${nestedKey}`] = 1;
        else updates[`${key}.${nestedKey}`] = nestedValue;
      }
    } else if (value === null) removals[key] = 1;
    else updates[key] = value;
  }
  const patient = await Patient.findOneAndUpdate(
    { doctorId, id, deletionStarted: { $ne: true } },
    { $set: updates, ...(Object.keys(removals).length ? { $unset: removals } : {}) },
    { new: true, runValidators: true },
  )
    .select('-_id -__v -doctorId')
    .lean();
  if (!patient) throw new HttpError(404, 'Patient not found.');
  return patient;
}
