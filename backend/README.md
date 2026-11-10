> **ARVI workspace update:** The application now supports administrators, doctors and medical staff. Existing installations must run `npm run workspace:migrate` once before using User Management. See [the backend walkthrough](docs/ARVI-redesign.md) for ownership, permissions, account endpoints, two-step verification, migration and testing. Earlier single-doctor setup notes below describe the original account/bootstrap flow.

# MediVault backend

Express + TypeScript + MongoDB API for one doctor. The code implements patient registration/search, patient profiles, private PDF/JPG/PNG uploads, document listing/viewing/downloading, doctor sessions, and persisted audit events.

The React frontend is connected to this API for authentication, patient registration/search/editing, document uploads/viewing/downloads and audit logs. It uses session cookies and in-memory state, and removes obsolete prototype caches from localStorage. See [API.md](./docs/API.md) for the integration contract and [the frontend guide](../frontend/README.md) for running both services.

## Structure

```text
src/
  config/        Environment validation, MongoDB connection and indexes
  models/        Mongoose schemas and indexes
  validators/    Allowed request fields, dates and pagination
  routes/        Endpoint declarations and middleware order
  middleware/    Authentication, CSRF, upload limits and error handling
  controllers/   HTTP input/output and audit events
  services/      Patient/document/authentication business logic
  storage/       Interchangeable local and Cloudinary adapters
  scripts/       Explicit demo and doctor-account setup commands
  utils/         Shared HTTP helpers
tests/           API, encryption, validation, production and storage tests
docs/API.md      Endpoints and integration examples
```

Controllers validate inputs and call services; services handle database operations. Storage adapters receive only encrypted bytes and random storage keys. There is no public uploads directory or public signup endpoint.

## Local setup (PowerShell)

Use Node.js 22 or later and a running MongoDB instance, or an Atlas database accessible from this machine.

```powershell
cd backend
npm ci
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the generated 64-character hexadecimal value into `DOCUMENT_ENCRYPTION_KEY` in `.env`. Set `DATABASE_URL` to your development database. The example uses `mongodb://127.0.0.1:27017/medivault_demo` and `CLIENT_URL=http://localhost:3000`, matching this project's Vite configuration. Change the origin if the frontend runs on a different port.

```powershell
npm run seed:demo
npm run dev
```

The seed command creates `doctor@medivault.test`, prints a random password once, and adds three explicitly synthetic patients. It does not reset an existing password or replace existing patients. Demo seeding and demo login are disabled in production. A demo account is not created automatically when the server starts.

The API listens on port 5000. `GET /health` returns 200 only while MongoDB is connected. Both `npm run dev` and `npm start` require the environment configuration; run commands from `backend` so relative storage paths remain consistent.

```powershell
npm test
npm run format:check
npm run build
npm start
```

Tests run against a disposable local MongoDB process with synthetic data. The first test run may download a MongoDB binary. They do not use your configured clinic database or Cloudinary account. Cloudinary adapter tests mock the SDK/network boundary; live provider uploads have not been verified.

Run `npm run format` after edits to keep TypeScript, tests and documentation consistently formatted.

## Data and access decisions

- Required patient fields: name, date of birth, gender, phone. Insurance, national health ID, vitals, emergency contacts, email, address and blood group are optional.
- Patient IDs are allocated atomically as `PT-YYYY-001`, using the calendar year in Asia/Kolkata. Sequences reset annually, can grow beyond three digits and may have gaps after failed registrations.
- Medical documents have a report date (`YYYY-MM-DD`) and a separate server-generated upload timestamp (UTC). X-ray/CT/MRI reports use `Imaging Report` with an optional `subType`.
- Records are scoped to the signed-in doctor, even though this release supports only one account. A unique doctor slot enforces that scope in MongoDB.
- The API uses opaque session tokens in HttpOnly, SameSite=Strict cookies. MongoDB stores token hashes, expiration and CSRF tokens. Logout revokes the session immediately.
- Mutations require `X-CSRF-Token`. Login/me return that token; frontend JavaScript should keep it in memory. Do not store passwords, session tokens or patient records in browser localStorage.
- Session expiry is checked on every request, independently of MongoDB's delayed TTL cleanup. Passwords use salted scrypt hashes. Failed logins have IP rate limits and a temporary account lock.
- The only patient mutation after registration is an update. Document replacement, deletion, record archival, CSV exports and hospital integrations are outside this release.

## Document storage and Cloudinary

`STORAGE_PROVIDER=local` stores encrypted `.bin` files under `UPLOAD_DIR`, outside any public static route. `STORAGE_PROVIDER=cloudinary` uses the three Cloudinary environment variables in `.env.example`.

For Cloudinary, the API encrypts each document using AES-256-GCM, binds it to its document ID, then uploads the ciphertext as an authenticated raw asset under a random key. Patient names and original filenames are not included in Cloudinary asset identifiers. Viewing/downloading checks the session, retrieves encrypted bytes through a server-side signed URL, verifies/decrypts them and returns the original file. The API never returns a Cloudinary delivery URL. This also means Cloudinary cannot generate thumbnails or transform the encrypted contents.

Cloudinary's default upload delivery type is public; authenticated delivery protects original and derived assets. See [Cloudinary upload parameters](https://cloudinary.com/documentation/upload_parameters). Private signing alone does not make an application suitable for medical records.

For the India clinic, my preferred production direction is private object storage in a deliberately chosen India region, with managed encryption keys, access policies and tested backups. S3 is a candidate: [Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html) and [SSE-KMS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html) provide relevant controls. An S3 adapter is not included in this implementation.

If choosing Cloudinary, confirm the contracted storage/processing regions, sensitive-data terms, backup/deletion behavior and raw-file limits with the provider before real patient use. Cloudinary documents EU/AP upload data centers as an Enterprise capability; do not assume a free account stores data in India. See [upload locations](https://cloudinary.com/documentation/upload_images). Configure and verify a live account using synthetic files before switching providers.

## Preparing clinic deployment

The API is implemented and locally tested; it has not been deployed or certified for clinical use. These are concrete deployment dependencies:

1. Use a separate production database, authenticated/TLS-protected MongoDB connectivity, restricted database credentials, encrypted database volumes/backups, and a secret manager. Document encryption does **not** encrypt patient profile fields inside MongoDB.
2. Put frontend and API on the same HTTPS site (preferably `/api` behind a reverse proxy). Set `NODE_ENV=production`, an HTTPS `CLIENT_URL`, and the exact `TRUST_PROXY_HOPS`. Prevent clients from reaching the backend around that trusted proxy. CORS is restricted to the configured frontend origin; cross-site hosting is intentionally unsupported by the cookie policy.
3. Use a unique real doctor password and an independent production encryption key. Keep recoverable, access-controlled backups of that key separately from database/file backups. Changing the key without migrating existing ciphertext makes old files unreadable; automated key rotation is not implemented.
4. Configure storage and test restoration of the database, documents and encryption key together. Retain old provider credentials and files when switching providers: existing records retain their original provider. Local storage requires persistent disk and suitable operating-system permissions, including Windows ACLs.
5. Add and verify malware scanning/quarantine before accepting real-world uploads. Current checks enforce extension, MIME type, signatures and size; they are not an antivirus scan or full PDF/image parser. Uploads/downloads are buffered in memory (10 MB default, 50 MB configurable maximum), so size instance memory and proxy concurrency limits accordingly.
6. Agree the clinic's patient notice/consent, retention, correction/deletion process and provider contracts for its India deployment. This code makes no legal compliance claim. Audit records contain identifiers and IPs and also require controlled access and retention.

There is no audit edit/delete API. Audit entries are ordinary database documents, not a tamper-proof ledger; apply separate database permissions and external retention/monitoring if needed. Writes record an attempt before the operation and a success afterward. These are separate database operations: a completion-log failure may return 500 after a successful mutation. Check the request ID and existing records before retrying; automatic retry/idempotency and transactional audit commits are not implemented. A process crash during upload can leave an orphaned encrypted asset; monitor cleanup failures and reconcile storage against document metadata.

Rate limits use process memory and suit this single-instance release. Shared rate-limit storage is needed before running multiple API replicas. The repository is structured for future integrations, but does not implement FHIR, HL7, ABDM or hospital identity matching.

## Create the actual doctor account

Use an empty production database with `NODE_ENV=production`. Demo databases cannot be converted using this command. Supply setup variables through a secure environment; never commit them or send passwords in chat.

```powershell
$env:DOCTOR_NAME = 'Doctor Name'
$env:DOCTOR_EMAIL = 'doctor@your-clinic.example'
$credential = Get-Credential -UserName $env:DOCTOR_EMAIL -Message 'Enter a unique doctor password (at least 14 characters)'
$env:DOCTOR_PASSWORD = $credential.GetNetworkCredential().Password
npm run doctor:setup
Remove-Item Env:DOCTOR_PASSWORD
```

To deliberately change the existing real doctor's credentials, run the same command with `ROTATE_DOCTOR_CREDENTIALS=true`. It invalidates existing sessions. There is no self-service email reset flow in this release.
