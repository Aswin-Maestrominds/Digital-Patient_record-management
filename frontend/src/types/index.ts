export interface Patient {
  id: string; // e.g. "PT-2026-001"
  name: string;
  dob: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  area: string;
  attendingDoctor: string;
  registeredDate: string;
  registeredTime: string;
  status: 'Active' | 'Under Review' | 'Discharged';
  initials: string;
  avatarUrl?: string;
  primaryHospital: string;
  smartCardId: string;
  nationalHealthId: string;
  maritalStatus: string;
  occupation: string;
  primaryLanguage: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    secondaryNotes?: string;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    coverageAmount: string;
    status: 'Active' | 'Pending' | 'Expired';
  };
  vitals: {
    bp: string;
    bpStatus: 'Normal' | 'Prehypertension' | 'Hypertension';
    bmi: number;
    bmiStatus: 'Normal Range' | 'Overweight' | 'Underweight';
    pulse: number;
    pulseStatus: 'Regular Sinus' | 'Arrhythmia';
    spO2: number;
    spO2Status: 'Room Air' | 'Oxygen Support';
  };
  allergies: string[];
  chronicConditions: string[];
  storedRecordsCount: number;
  summaryTags: string[];
}

export type DocumentCategory = 
  | 'Imaging Report'
  | 'Laboratory Report'
  | 'Cardiology / ECG'
  | 'Prescription'
  | 'Discharge Summary'
  | 'Hospital Invoice'
  | 'Medical History';

export type FileType = 'PDF' | 'DICOM' | 'JPG' | 'PNG';

export interface RadiologistFindings {
  clinicalIndication: string;
  observations: string;
  cardiothoracicRatio?: string;
  bonyStructures?: string;
  impression: string;
  signedBy: string;
  regNo: string;
  timestamp: string;
  pkiSig: string;
}

export interface MedicalDocument {
  id: string; // e.g. "DOC-2026-88412"
  patientId: string;
  patientName: string;
  title: string;
  category: DocumentCategory;
  subType: string;
  modality?: string;
  fileType: FileType;
  fileSize: string;
  date: string;
  timestamp: string;
  attendingPhysician: string;
  facility: string;
  priority: 'Routine' | 'Urgent / Critical' | 'Follow-up';
  integrityHash: string;
  status: 'Verified' | 'Pending Attestation' | 'Requires Review';
  notes?: string;
  rawFileName?: string;
  findings?: RadiologistFindings;
}

export interface AuditLog {
  id: string; // block sequence
  timestamp: string;
  nodeHash: string;
  actor: string;
  role: string;
  action: 'RECORD_VIEWED' | 'DOC_SIGN & ATTEST' | 'PACS_INGEST' | 'PATIENT_INTAKE' | 'LAB_SYNC' | 'USER_LOGIN' | 'KEY_ROTATION';
  actionDescription: string;
  targetedResource: string;
  ipAddress: string;
  telemetry: string;
  status: 'Verified (SHA-256)' | 'Verified (eIDAS)' | 'HL7 v2.5 Check' | 'Active Session' | 'Zero Trust Match';
  payloadDetails?: Record<string, any>;
}

export interface UserProfile {
  name: string;
  role: string;
  adminTitle: string;
  npi: string;
  id: string;
  specialization: string;
  license: string;
  licenseStatus: string;
  email: string;
  phone: string;
  hospitalNode: string;
  departments: string;
  pkiCertDate: string;
  pkiHash: string;
  avatarUrl: string;
}

export interface TerminalSession {
  id: string;
  device: string;
  location: string;
  osInfo: string;
  ip: string;
  status: string;
  isCurrent: boolean;
}
