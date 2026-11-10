export interface Doctor {
  id: string;

  name: string;

  email: string;

  role: "administrator" | "doctor" | "staff";

  phone?: string;

  avatar?: string;

  createdAt?: string;

  totpEnabled?: boolean;

  preferences?: Preferences;

  isDemo: boolean;
}

export interface PatientInput {
  name: string;

  dob: string;

  gender: "Male" | "Female" | "Other";

  phone: string;

  email?: string;

  bloodGroup?: string;

  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };

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

  status?: "Active" | "Under Review" | "Discharged";
}

export interface Patient extends PatientInput {
  id: string;

  createdAt: string;

  updatedAt: string;

  storedRecordsCount?: number;
  categoryCounts?:Record<string,number>;
}

export type PatientPatch = Omit<
  Partial<PatientInput>,
  "bloodGroup" | "emergencyContact"
> & {
  bloodGroup?: string | null;

  emergencyContact?: Omit<
    NonNullable<PatientInput["emergencyContact"]>,
    "phone"
  > & {
    phone?: string | null;
  };
};

export const documentCategories = [
  "Medical History",

  "Laboratory Report",

  "Imaging Report",

  "Prescription",

  "Pharmacy Bill",

  "Hospital Invoice",

  "Discharge Summary",
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

  uploadedBy?: string;

  patientName?: string;

  originalName: string;

  mimeType: "application/pdf" | "image/jpeg" | "image/png";

  sizeBytes: number;

  sha256: string;
}

export interface AuditEvent {
  _id: string;

  actorId?: string;

  actorName?: string;

  actorRole?: string;

  action: string;

  resourceId?: string;

  patientId?: string;

  outcome: "success" | "denied" | "attempt";

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

export interface Preferences {
  inactivityMinutes: number;
  signInAlerts: boolean;
  language: string;
  timeZone: string;
  dateFormat: string;
  directoryView: "grid" | "table";
  registrations: boolean;
  uploads: boolean;
  changes: boolean;
}

export interface WorkspaceStats {
  patients: number;
  documents: number;
  recentPatients: number;
  accessed: number;
  recentDocuments: number;
  pdf: number;
  images: number;
}

export const roleLabel = (role?: string) =>
  role === "administrator"
    ? "Administrator"
    : role === "staff"
      ? "Medical Staff"
      : "Doctor";
