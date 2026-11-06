import { Schema, model } from 'mongoose';
const patientSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    deletionStarted: { type: Boolean, default: false, select: false },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    dob: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    phone: { type: String, required: true },
    email: String,
    bloodGroup: String,
    address: { street: String, city: String, state: String, zip: String, country: String },
    nationalHealthId: String,
    insurance: { provider: String, policyNumber: String, coverageAmount: String, status: String },
    emergencyContact: { name: String, relationship: String, phone: String, secondaryNotes: String },
    vitals: { bp: String, bmi: Number, pulse: Number, spO2: Number },
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    notes: String,
    status: { type: String, enum: ['Active', 'Under Review', 'Discharged'], default: 'Active' },
  },
  { timestamps: true, optimisticConcurrency: true },
);
patientSchema.index({ doctorId: 1, createdAt: -1 });
export const Patient = model('Patient', patientSchema);
