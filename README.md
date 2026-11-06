# MediVault — Digital Patient Record Management Software (MVP)

> **Current status:** The MongoDB backend is implemented for a single doctor. See the [backend setup guide](backend/README.md) and [API integration contract](backend/docs/API.md).
>
> The frontend is connected to the backend with real authentication, patient APIs, document uploads/viewing/downloads and audit logs. Follow the [frontend guide](frontend/README.md) to run both services. The older UI descriptions and folder diagram below describe the original prototype; simulated security, integration and certification labels are not verified capabilities. This project makes no HIPAA, ISO or FIPS certification claim.

---

## 🌟 Executive Overview & Key Features

The original frontend prototype illustrates the following workflows. Refer to the backend guide for the implemented API scope and deployment prerequisites:

1. **Patient Registration**:
   - Auto-allocates unique Patient IDs (`PT-2026-001`, `PT-2026-002`, etc.) with SHA-256 node hash pre-allocation.
   - Comprehensive intake forms spanning demographic details, residential address, emergency contacts, clinical alerts, and statutory HIPAA consent.
   - Auto-generates a cryptographic **MediVault Health Pass** (Smart Health Card) upon intake.

2. **Digital Patient Card**:
   - Displays all registered patients as rich, clickable cards.
   - Includes quick demographic cards (Age, Gender, Blood Group), direct contact links, and stored record counts.
   - One-click trigger for the **Cryptographic Health Pass NFC/QR modal** with print and PKPASS download support.
   - Clicking opens the patient's complete electronic health record.

3. **Document Upload & Ingestion Engine**:
   - Ingests radiographic DICOMs, lab analytical panels, CT/MRIs, prescriptions, invoices, and discharge summaries.
   - Simulates HL7/FHIR sanitization, 0-threat malware scanning, and AES-256 integrity hash verification.
   - Captures clinical taxonomy, diagnostic sub-types, performing physician, facility, and triage urgency.

4. **Centralized Patient Record**:
   - Categorizes all clinical records by document type (Laboratory, Imaging, Prescriptions, Invoices, Discharge).
   - Dedicated interactive **High-Res Medical Viewer (DICOM / Radiograph / PDF)** with:
     - Invert negatives toggle
     - High contrast toggle
     - Annotated ROI bounding boxes & measurement overlays
     - Zoom & rotate controls
     - Official Radiologist Findings report with eIDAS-compliant digital PKI signature
     - Full immutable HIPAA audit trail

5. **Search & Filter Function**:
   - Global real-time search across patient names, Patient IDs, phone numbers, and localities.
   - Interactive live dropdown for instant 1-click navigation.
   - Multi-parameter filtering by gender, blood group, registration date range, and quick filter tags.

6. **Secure Login & Zero-Trust Telemetry**:
   - Clinical authentication screen featuring live federated telemetry, SLA status (99.99%), synchronized medical hubs latency monitoring, and AES-256 audit logging notice.
   - Session management, active terminal termination, and statutory compliance controls.

7. **System Audit & Compliance Logs**:
   - Append-only ledger stream tracking all ePHI access, modifications, uploads, and logins under HIPAA 45 CFR § 164.312 & 21 CFR Part 11.
   - Interactive **Inspect Payload** modal revealing the raw cryptographic JSON ledger block.
   - CSV export for regulatory reporting.

---

## 📂 Project Folder Structure

```
medivault-patient-records/
├── README.md                          # Master documentation & deployment guide
├── frontend/                          # React + TypeScript Frontend
│   ├── package.json                   # Dependencies: React 18/19, Lucide, Tailwind CSS
│   ├── vite.config.ts                 # Vite bundler configuration
│   ├── tailwind.config.js             # Clinical color palettes & design tokens
│   ├── tsconfig.json                  # TypeScript compiler settings
│   ├── index.html                     # Application shell with Inter font
│   └── src/
│       ├── main.tsx                   # React root entry
│       ├── App.tsx                    # Master layout & router dispatcher
│       ├── index.css                  # Tailwind styles & clinical theme
│       ├── types/
│       │   └── index.ts               # Complete TypeScript interfaces
│       ├── mock/
│       │   └── mockData.ts            # High-fidelity synthetic EHR dataset
│       ├── context/
│       │   ├── AuthContext.tsx        # Authentication & staff profile state
│       │   └── PatientRecordContext.tsx # Centralized CRUD, search & audit state
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx        # Clinical navigation sidebar
│       │   │   └── TopNavbar.tsx      # Universal search, alerts & profile
│       │   └── common/
│       │       ├── DigitalHealthCardModal.tsx # Smart Health Pass modal
│       │       └── AuditPayloadModal.tsx      # Cryptographic block inspector
│       └── pages/
│           ├── LoginPage.tsx                  # Page 1: Login & Telemetry
│           ├── DashboardPage.tsx              # Page 2: Executive Clinical Dashboard
│           ├── PatientsDirectoryPage.tsx      # Page 3: Digital Patient Cards Grid
│           ├── PatientRegistrationPage.tsx    # Page 4: New Patient Intake Form
│           ├── PatientRecordDetailPage.tsx    # Page 5: Patient Complete Record View
│           ├── UploadDocumentPage.tsx         # Page 6: Clinical Document Ingestion
│           ├── DocumentViewerPage.tsx         # Page 7: High-Res Medical Viewer
│           ├── CentralizedDocumentsPage.tsx   # Page 8: Centralized Repository
│           ├── AuditLogsPage.tsx              # Page 9: System Audit & Compliance Logs
│           └── SettingsSecurityPage.tsx       # Page 10: Account & Security Settings
└── backend/                           # Node.js + Express Backend Structure
    ├── package.json                   # Dependencies: Express, Mongoose, Multer, JWT
    ├── tsconfig.json                  # TypeScript settings
    ├── .env.example                   # Environment configuration template
    ├── README.md                      # Backend teammate developer guide
    └── src/
        ├── server.ts                  # Server entry point
        ├── app.ts                     # Express app setup & middleware
        ├── config/
        │   ├── database.ts            # Database connection
        │   └── security.ts            # FIPS 140-2 crypto config
        ├── controllers/
        │   ├── authController.ts      # Auth & session logic
        │   ├── patientController.ts   # Patient CRUD handlers
        │   ├── documentController.ts  # Ingestion & streaming handlers
        │   └── auditController.ts     # Ledger & CSV export handlers
        ├── middleware/
        │   ├── authMiddleware.ts      # JWT validation
        │   ├── auditLogger.ts         # HIPAA request logger
        │   ├── uploadMiddleware.ts    # Multer clinical file filter
        │   └── errorHandler.ts        # Global error boundary
        ├── models/
        │   ├── User.ts                # Staff schema
        │   ├── Patient.ts             # Patient schema
        │   ├── MedicalDocument.ts     # Document & findings schema
        │   └── AuditLog.ts            # Audit ledger schema
        ├── routes/
        │   ├── index.ts               # Master router
        │   ├── authRoutes.ts          # /api/auth
        │   ├── patientRoutes.ts       # /api/patients
        │   ├── documentRoutes.ts      # /api/documents
        │   └── auditRoutes.ts         # /api/audit
        └── services/
            ├── encryptionService.ts   # AES-256-GCM cipher
            └── patientIdGenerator.ts  # PT-YYYY-XXX ID generator
```

---

## 🚀 Running the Application

### Prerequisites
- Node.js 22 or later for the backend
- npm or yarn

### 1. Launch Frontend
```bash
cd frontend
npm install
npm run dev
```
Open your browser at **`http://localhost:3000`** (or the port displayed in your terminal).

To run a production build:
```bash
npm run build
npm run preview
```

### 2. Backend Setup

Follow [backend/README.md](backend/README.md) to configure MongoDB and the encryption key, create the demo account, and start the API. Follow [frontend/README.md](frontend/README.md) to start the connected UI and run browser integration tests.

---

## 🏥 Design Highlights & Solved Misalignments
- **Pixel-Perfect Fidelity**: Matches all 10 pages of the clinical PDF design specification.
- **Enhanced Visual Accessibility**: Improved contrast on radiograph overlays, balanced button heights, refined typography hierarchy, and smooth modal animations.
- **Persistent Local Mock DB**: Changes made in the UI (e.g. adding new patients, uploading files, or changing settings) persist in the browser's `localStorage` while retaining default synthetic data matching the PDF.
- **Interactive Medical Radiograph Viewer**: Enables live negative inversion, high contrast filtering, ROI annotations toggle, and zoom scaling.
# Digital-Patient-Record-Management-Software
