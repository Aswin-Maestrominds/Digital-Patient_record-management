import { Schema, model } from 'mongoose';
export const DOCUMENT_CATEGORIES = [
  'Medical History',
  'Laboratory Report',
  'Imaging Report',
  'Prescription',
  'Pharmacy Bill',
  'Hospital Invoice',
  'Discharge Summary',
] as const;
const documentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    patientId: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, enum: DOCUMENT_CATEGORIES, required: true },
    subType: String,
    reportDate: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: Date.now },
    notes: String,
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, required: true },
    storageProvider: { type: String, enum: ['local', 'cloudinary'], required: true, select: false },
    storageKey: { type: String, required: true, select: false },
  },
  { timestamps: true },
);
documentSchema.index({ doctorId: 1, patientId: 1, reportDate: -1, uploadedAt: -1 });
export const MedicalDocument = model('MedicalDocument', documentSchema);
