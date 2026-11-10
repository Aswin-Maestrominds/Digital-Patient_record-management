import { randomUUID } from 'crypto';
import path from 'path';
import { z } from 'zod';
import { env } from '../config/env';
import { MedicalDocument } from '../models/MedicalDocument';
import { getStorage } from '../storage';
import { decryptDocument, encryptDocument, sha256 } from './encryptionService';
import { requirePatient } from './patientService';
import { Patient } from '../models/Patient';
import { HttpError, escapeRegex } from '../utils/http';
import { documentInput, documentQuery } from '../validators/schemas';

export function validateFile(file: Express.Multer.File): void {
  const bytes = file.buffer;
  const extension = path.extname(file.originalname).toLowerCase();
  const isPdf =
    bytes.subarray(0, 5).toString('ascii') === '%PDF-' &&
    bytes.subarray(Math.max(0, bytes.length - 1024)).includes(Buffer.from('%%EOF'));
  const isPng =
    bytes.length >= 20 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const valid =
    (file.mimetype === 'application/pdf' && extension === '.pdf' && isPdf) ||
    (file.mimetype === 'image/png' && extension === '.png' && isPng) ||
    (file.mimetype === 'image/jpeg' && ['.jpg', '.jpeg'].includes(extension) && isJpeg);
  if (!valid)
    throw new HttpError(
      415,
      'File contents, filename and content type must match PDF, JPG or PNG.',
    );
}

export async function listDocuments(doctorId: string, query: z.infer<typeof documentQuery>) {
  if (query.patientId) await requirePatient(doctorId, query.patientId);
  const { page, limit, patientId, category, from, to } = query;
  const matchedPatients = query.search
    ? await Patient.find({ doctorId, name: new RegExp(escapeRegex(query.search), 'i') })
        .select('id')
        .lean()
    : [];
  const filter = {
    doctorId,
    ...(query.search
      ? {
          $or: [
            { title: new RegExp(escapeRegex(query.search), 'i') },
            { patientId: new RegExp(escapeRegex(query.search), 'i') },
            { patientId: { $in: matchedPatients.map((p) => p.id) } },
          ],
        }
      : {}),
    ...(query.mimeType ? { mimeType: query.mimeType } : {}),
    ...(patientId ? { patientId } : {}),
    ...(category ? { category } : {}),
    ...(from || to
      ? { reportDate: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } }
      : {}),
  };
  const [documents, total] = await Promise.all([
    MedicalDocument.find(filter)
      .select('-_id -__v -doctorId')
      .sort(
        query.sort === 'uploaded'
          ? { uploadedAt: -1, id: -1 }
          : { reportDate: -1, uploadedAt: -1, id: -1 },
      )
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    MedicalDocument.countDocuments(filter),
  ]);
  const names = await Patient.find({ doctorId, id: { $in: documents.map((d) => d.patientId) } })
    .select('id name')
    .lean();
  return {
    documents: documents.map((d) => ({
      ...d,
      patientName: names.find((p) => p.id === d.patientId)?.name,
    })),
    total,
    page,
    limit,
  };
}

export async function requireDocument(doctorId: string, id: string) {
  const document = await MedicalDocument.findOne({ doctorId, id })
    .select('-_id -__v -doctorId')
    .lean();
  if (!document) throw new HttpError(404, 'Document not found.');
  return document;
}

export async function storeDocument(
  doctorId: string,
  data: z.infer<typeof documentInput>,
  file: Express.Multer.File,
  uploadedBy?: string,
) {
  await requirePatient(doctorId, data.patientId);
  validateFile(file);
  const id = `DOC-${randomUUID()}`;
  const storageKey = `${randomUUID()}.bin`;
  const storage = getStorage(env.STORAGE_PROVIDER);
  const encrypted = encryptDocument(file.buffer, id);
  try {
    await storage.put(storageKey, encrypted);
    await MedicalDocument.create({
      ...data,
      uploadedBy,
      id,
      doctorId,
      storageProvider: env.STORAGE_PROVIDER,
      storageKey,
      originalName:
        path
          .basename(file.originalname)
          .replace(/[\x00-\x1f\x7f]/g, '')
          .slice(0, 200) || 'document',
      mimeType: file.mimetype,
      sizeBytes: file.size,
      sha256: sha256(file.buffer),
    });
    // A patient deletion may have started while the remote upload was running.
    await requirePatient(doctorId, data.patientId);
  } catch (error) {
    // A failed database insert must not knowingly leave an orphaned file.
    try {
      await storage.remove(storageKey);
      await MedicalDocument.deleteOne({ doctorId, id });
    } catch {
      console.error(JSON.stringify({ event: 'storage_cleanup_failed', storageKey }));
    }
    throw error;
  }
  return requireDocument(doctorId, id);
}

export async function deleteDocument(doctorId: string, id: string) {
  const document = await MedicalDocument.findOne({ doctorId, id }).select(
    '+storageProvider +storageKey',
  );
  if (!document) throw new HttpError(404, 'Document not found.');
  // Keep metadata if storage fails, so the doctor can retry cleanup.
  await getStorage(document.storageProvider).remove(document.storageKey);
  await MedicalDocument.deleteOne({ doctorId, id });
}

export async function readDocument(doctorId: string, id: string) {
  const document = await MedicalDocument.findOne({ doctorId, id }).select(
    '+storageProvider +storageKey',
  );
  if (!document) throw new HttpError(404, 'Document not found.');
  const encrypted = await getStorage(document.storageProvider).get(document.storageKey);
  const bytes = decryptDocument(encrypted, id);
  if (bytes.length !== document.sizeBytes || sha256(bytes) !== document.sha256) {
    throw new Error('Document integrity verification failed.');
  }
  return { document, bytes };
}
