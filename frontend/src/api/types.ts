export interface Doctor {
  id: string;
  name: string;
  email: string;
  role: 'doctor';
  isDemo: boolean;
}

export interface PatientInput {
  name: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email?: string;
  bloodGroup?: string;
  address?: { street?: string; city?: string; state?: string; zip?: string; country?: string };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
    secondaryNotes?: string;
  };
  insurance?: {
    provider?: string;
    policyNumber?: string;
    coverageAmount?: string;
    status?: string;
  };
  nationalHealthId?: string;
  vitals?: { bp?: string; bmi?: number; pulse?: number; spO2?: number };
  allergies?: string[];
  chronicConditions?: string[];
  notes?: string;
  status?: 'Active' | 'Under Review' | 'Discharged';
}

export interface Patient extends PatientInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  storedRecordsCount?: number;
}

export type PatientPatch = Omit<Partial<PatientInput>, 'bloodGroup' | 'emergencyContact'> & {
  bloodGroup?: string | null;
  emergencyContact?: Omit<NonNullable<PatientInput['emergencyContact']>, 'phone'> & {
    phone?: string | null;
  };
};

export const documentCategories = [
  'Medical History',
  'Laboratory Report',
  'Imaging Report',
  'Prescription',
  'Pharmacy Bill',
  'Hospital Invoice',
  'Discharge Summary',
] as const;
export type DocumentCategory = (typeof documentCategories)[number];

export interface DocumentInput {
  patientId: string;
  title: string;
  category: DocumentCategory;
  reportDate: string;
  subType?: string;
  notes?: string;
}

export interface MedicalDocument extends DocumentInput {
  id: string;
  uploadedAt: string;
  originalName: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  sizeBytes: number;
  sha256: string;
}

export interface AuditEvent {
  _id: string;
  actorId?: string;
  action: string;
  resourceId?: string;
  patientId?: string;
  outcome: 'success' | 'denied' | 'attempt';
  requestId: string;
  ipAddress?: string;
  occurredAt: string;
}

export interface PageResult {
  total: number;
  page: number;
  limit: number;
}
export interface PatientPage extends PageResult {
  patients: Patient[];
}
export interface DocumentPage extends PageResult {
  documents: MedicalDocument[];
}
export interface AuditPage extends PageResult {
  logs: AuditEvent[];
}
