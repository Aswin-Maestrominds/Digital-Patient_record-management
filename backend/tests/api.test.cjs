const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
require('./helpers.cjs').configureTestEnvironment();
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../dist/app');
const { initializeModels } = require('../dist/config/initializeModels');
const { User } = require('../dist/models/User');
const { Session } = require('../dist/models/Session');
const { Patient } = require('../dist/models/Patient');
const { MedicalDocument } = require('../dist/models/MedicalDocument');
const { AuditLog } = require('../dist/models/AuditLog');
const { hashPassword } = require('../dist/services/passwordService');

let mongo, app, server, agent, csrf, patientId, documentId, doctorId;
const password = 'A synthetic testing password!';
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
const patient = {
  name: 'Synthetic Patient One',
  dob: '1990-01-01',
  gender: 'Female',
  phone: '0000000000',
};

before(
  async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await initializeModels();
    const doctor = await User.create({
      name: 'Test Doctor',
      email: 'doctor@example.test',
      passwordHash: await hashPassword(password),
    });
    doctorId = String(doctor._id);
    app = createApp();
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    agent = request.agent(server);
  },
  { timeout: 180000 },
);

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  // Cleanup only the process-specific test upload directory inside this project.
  const directory = path.resolve(process.env.UPLOAD_DIR);
  const root = path.resolve(__dirname, '../.test-data') + path.sep;
  if (!directory.startsWith(root)) throw new Error('Unsafe test cleanup path.');
  await fs.rm(directory, { force: true, recursive: true });
});

test('all patient, document and audit endpoints require authentication', async () => {
  for (const url of ['/api/patients', '/api/documents', '/api/audit', '/api/auth/me']) {
    await request(app).get(url).expect(401);
  }
  await request(app).post('/api/patients').send(patient).expect(401);
  await request(app).post('/api/documents/upload').expect(401);
});

test('login checks passwords, stores only a token hash and issues a protected cookie', async () => {
  await agent
    .post('/api/auth/login')
    .send({ email: 'doctor@example.test', password: 'wrong' })
    .expect(401);
  const response = await agent
    .post('/api/auth/login')
    .send({ email: 'doctor@example.test', password })
    .expect(200);
  csrf = response.body.csrfToken;
  assert.equal(response.body.user.role, 'doctor');
  assert.equal(response.body.user.passwordHash, undefined);
  const cookie = response.headers['set-cookie'][0];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  const token = cookie.split(';')[0].split('=')[1];
  const session = await Session.findOne();
  assert.notEqual(session.tokenHash, token);
  const me = await agent.get('/api/auth/me').expect(200);
  assert.equal(me.body.csrfToken, csrf);
});

test('writes require CSRF and requests from a foreign origin are rejected', async () => {
  await agent.post('/api/patients').send(patient).expect(403);
  await agent
    .post('/api/patients')
    .set('X-CSRF-Token', csrf)
    .set('Origin', 'https://attacker.example')
    .send(patient)
    .expect(403);
  await request(app)
    .post('/api/auth/login')
    .set('Sec-Fetch-Site', 'cross-site')
    .send({ email: 'doctor@example.test', password })
    .expect(403);
});

test('registration needs only basic details and preserves partial optional-field updates', async () => {
  const created = await agent
    .post('/api/patients')
    .set('X-CSRF-Token', csrf)
    .send(patient)
    .expect(201);
  patientId = created.body.patient.id;
  assert.match(patientId, /^PT-\d{4}-\d{3,}$/);
  assert.equal(created.body.patient.storedRecordsCount, 0);
  await agent
    .patch(`/api/patients/${patientId}`)
    .set('X-CSRF-Token', csrf)
    .send({ address: { city: 'Test City', state: 'Test State' } })
    .expect(200);
  const updated = await agent
    .patch(`/api/patients/${patientId}`)
    .set('X-CSRF-Token', csrf)
    .send({ address: { city: 'Another Test City' } })
    .expect(200);
  assert.equal(updated.body.patient.address.state, 'Test State');
  await agent
    .post('/api/patients')
    .set('X-CSRF-Token', csrf)
    .send({ ...patient, dob: '2001-02-29' })
    .expect(400);
  await agent
    .patch(`/api/patients/${patientId}`)
    .set('X-CSRF-Token', csrf)
    .send({ doctorId: 'other' })
    .expect(400);
});

test('concurrent registrations receive unique sequential patient IDs', async () => {
  const results = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      agent
        .post('/api/patients')
        .set('X-CSRF-Token', csrf)
        .send({ ...patient, name: `Concurrent Synthetic ${i}` })
        .expect(201),
    ),
  );
  const ids = results.map((r) => r.body.patient.id);
  assert.equal(new Set(ids).size, 12);
  const numbers = ids.map((id) => Number(id.split('-')[2])).sort((a, b) => a - b);
  assert.equal(numbers[11] - numbers[0], 11);
});

test('search matches names and Patient IDs with pagination and literal regex characters', async () => {
  let response = await agent
    .get('/api/patients')
    .query({ search: 'synthetic patient one' })
    .expect(200);
  assert.equal(response.body.total, 1);
  response = await agent
    .get('/api/patients')
    .query({ search: patientId.toLowerCase() })
    .expect(200);
  assert.equal(response.body.patients[0].id, patientId);
  response = await agent.get('/api/patients').query({ search: '.*' }).expect(200);
  assert.equal(response.body.total, 0);
  response = await agent.get('/api/patients').query({ limit: 2, page: 2 }).expect(200);
  assert.equal(response.body.patients.length, 2);
  await agent.get('/api/patients').query({ limit: 1000 }).expect(400);
  await agent.get('/api/patients?search[$ne]=x').expect(400);
});

function upload(
  bytes = pdf,
  name = 'synthetic-report.pdf',
  mime = 'application/pdf',
  id = patientId,
) {
  return agent
    .post('/api/documents/upload')
    .set('X-CSRF-Token', csrf)
    .field('patientId', id)
    .field('title', 'Synthetic report')
    .field('category', 'Laboratory Report')
    .field('reportDate', '2020-05-12')
    .attach('file', bytes, { filename: name, contentType: mime });
}

test('upload persists encrypted bytes and separate report/upload dates; retrieval returns original content', async () => {
  const response = await upload().expect(201);
  const document = response.body.document;
  documentId = document.id;
  assert.equal(document.reportDate, '2020-05-12');
  assert.ok(Date.parse(document.uploadedAt));
  assert.equal(document.storageKey, undefined);
  assert.equal(document.storageProvider, undefined);
  const stored = await MedicalDocument.findOne({ id: documentId }).select('+storageKey');
  const bytes = await fs.readFile(path.join(process.env.UPLOAD_DIR, stored.storageKey));
  assert.equal(bytes.includes(pdf), false);
  const download = await agent.get(`/api/documents/${documentId}/download`).expect(200);
  assert.deepEqual(download.body, pdf);
  assert.match(download.headers['content-disposition'], /^attachment/);
  assert.equal(download.headers['cache-control'], 'no-store');
  await agent
    .get(`/api/documents/${documentId}/view`)
    .expect(200)
    .expect('Content-Type', /application\/pdf/);
  await request(app).get(`/api/documents/${documentId}/download`).expect(401);
  const profile = await agent.get(`/api/patients/${patientId}`).expect(200);
  assert.equal(profile.body.patient.storedRecordsCount, 1);
  const list = await agent
    .get('/api/documents')
    .query({ patientId, category: 'Laboratory Report', from: '2020-01-01', to: '2020-12-31' })
    .expect(200);
  assert.equal(list.body.total, 1);
});

test('uploads reject fake files, excessive sizes, unknown patients and extra files', async () => {
  await upload(Buffer.from('not a PDF')).expect(415);
  await upload(pdf, 'malicious.exe').expect(415);
  await upload(Buffer.alloc(1024 * 1024 + 1)).expect(413);
  await upload(pdf, 'report.pdf', 'application/pdf', 'PT-2026-999999').expect(404);
  await agent
    .post('/api/documents/upload')
    .set('X-CSRF-Token', csrf)
    .field('patientId', patientId)
    .field('title', 'Test')
    .field('category', 'Laboratory Report')
    .field('reportDate', '2020-01-01')
    .attach('file', pdf, 'one.pdf')
    .attach('file', pdf, 'two.pdf')
    .expect(400);
  assert.equal(await MedicalDocument.countDocuments(), 1);
});

test('doctor ownership is enforced even if another owner has a record in the database', async () => {
  const otherId = new mongoose.Types.ObjectId();
  await Patient.create({ ...patient, id: 'PT-2026-888888', doctorId: otherId });
  await agent.get('/api/patients/PT-2026-888888').expect(404);
  await upload(pdf, 'report.pdf', 'application/pdf', 'PT-2026-888888').expect(404);
  const document = await MedicalDocument.findOne({ id: documentId });
  await MedicalDocument.updateOne({ id: documentId }, { doctorId: otherId });
  await agent.get(`/api/documents/${documentId}/download`).expect(404);
  await MedicalDocument.updateOne({ id: documentId }, { doctorId: document.doctorId });
});

test('tampered ciphertext is never delivered and errors do not expose storage details', async () => {
  const stored = await MedicalDocument.findOne({ id: documentId }).select('+storageKey');
  const file = path.join(process.env.UPLOAD_DIR, stored.storageKey);
  const original = await fs.readFile(file);
  const corrupt = Buffer.from(original);
  corrupt[corrupt.length - 1] ^= 1;
  await fs.writeFile(file, corrupt);
  const response = await agent.get(`/api/documents/${documentId}/download`).expect(500);
  assert.equal(response.body.message, 'Unable to complete the request.');
  assert.equal(JSON.stringify(response.body).includes(stored.storageKey), false);
  await fs.writeFile(file, original);
});

test('audit logs persist access and upload events without patient details or credentials', async () => {
  const response = await agent.get('/api/audit').query({ patientId, limit: 100 }).expect(200);
  assert.ok(
    response.body.logs.some((log) => log.action === 'DOCUMENT_UPLOAD' && log.outcome === 'success'),
  );
  assert.ok(response.body.logs.some((log) => log.action === 'DOCUMENT_DOWNLOAD'));
  const all = JSON.stringify(await AuditLog.find().lean());
  assert.equal(all.includes(patient.name), false);
  assert.equal(all.includes(password), false);
  assert.equal(all.includes('doctor@example.test'), false);
});

test('deletes require authentication, CSRF and ownership; documents remove stored files', async () => {
  await request(app).delete(`/api/documents/${documentId}`).expect(401);
  await request(app).delete(`/api/patients/${patientId}`).expect(401);
  await agent.delete(`/api/documents/${documentId}`).expect(403);
  await agent.delete(`/api/patients/${patientId}`).expect(403);
  await agent.delete('/api/patients/PT-2026-888888').set('X-CSRF-Token', csrf).expect(404);
  const created = await upload(pdf).expect(201);
  const id = created.body.document.id;
  const stored = await MedicalDocument.findOne({ id }).select('+storageKey');
  const otherId = new mongoose.Types.ObjectId();
  await MedicalDocument.updateOne({ id }, { doctorId: otherId });
  await agent.delete(`/api/documents/${id}`).set('X-CSRF-Token', csrf).expect(404);
  await MedicalDocument.updateOne({ id }, { doctorId });
  await agent.delete(`/api/documents/${id}`).set('X-CSRF-Token', csrf).expect(200);
  await assert.rejects(fs.access(path.join(process.env.UPLOAD_DIR, stored.storageKey)), {
    code: 'ENOENT',
  });
  await agent.get(`/api/documents/${id}/download`).expect(404);
  await agent.delete(`/api/documents/${id}`).set('X-CSRF-Token', csrf).expect(404);
  assert.ok(
    await AuditLog.exists({ action: 'DOCUMENT_DELETE', resourceId: id, outcome: 'success' }),
  );
});

test('patient deletion retries failed storage cleanup and cascades without deleting audit history', async (t) => {
  const created = await agent
    .post('/api/patients')
    .set('X-CSRF-Token', csrf)
    .send(patient)
    .expect(201);
  const id = created.body.patient.id;
  const uploaded = await upload(pdf, 'report.pdf', 'application/pdf', id).expect(201);
  const docId = uploaded.body.document.id;
  const stored = await MedicalDocument.findOne({ id: docId }).select('+storageKey');
  const { localStorage } = require('../dist/storage/localStorage');
  const mock = t.mock.method(localStorage, 'remove', async () => {
    throw new Error('Synthetic storage failure');
  });
  await agent.delete(`/api/patients/${id}`).set('X-CSRF-Token', csrf).expect(500);
  assert.ok(await Patient.exists({ id }));
  assert.ok(await MedicalDocument.exists({ id: docId }));
  await upload(pdf, 'report.pdf', 'application/pdf', id).expect(404);
  mock.mock.restore();
  await agent.delete(`/api/patients/${id}`).set('X-CSRF-Token', csrf).expect(200);
  await agent.get(`/api/patients/${id}`).expect(404);
  await agent.get(`/api/documents/${docId}/view`).expect(404);
  assert.equal(await MedicalDocument.countDocuments({ patientId: id }), 0);
  await assert.rejects(fs.access(path.join(process.env.UPLOAD_DIR, stored.storageKey)), {
    code: 'ENOENT',
  });
  assert.ok(await AuditLog.exists({ action: 'PATIENT_CREATE', patientId: id }));
  assert.ok(await AuditLog.exists({ action: 'PATIENT_DELETE', patientId: id, outcome: 'success' }));
});

test('expired sessions are rejected immediately even before MongoDB TTL cleanup', async () => {
  const session = await Session.findOne({ userId: doctorId });
  await Session.updateOne({ _id: session._id }, { expiresAt: new Date(Date.now() - 1000) });
  await agent.get('/api/patients').expect(401);
  const response = await agent
    .post('/api/auth/login')
    .send({ email: 'doctor@example.test', password })
    .expect(200);
  csrf = response.body.csrfToken;
});

test('logout revokes the session on the server, including replay of a copied cookie', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'doctor@example.test', password })
    .expect(200);
  const cookie = response.headers['set-cookie'][0].split(';')[0];
  await request(app)
    .post('/api/auth/logout')
    .set('Cookie', cookie)
    .set('X-CSRF-Token', response.body.csrfToken)
    .expect(200);
  await request(app).get('/api/patients').set('Cookie', cookie).expect(401);
});

test('repeated wrong passwords lock the account across clients', async () => {
  for (let i = 0; i < 5; i++) {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor@example.test', password: 'wrong' })
      .expect(401);
  }
  const doctor = await User.findById(doctorId);
  assert.ok(doctor.lockedUntil > new Date());
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'doctor@example.test', password })
    .expect(401);
});

test('credential rotation invalidates sessions even before session cleanup', async () => {
  await User.updateOne({ _id: doctorId }, { $inc: { credentialVersion: 1 } });
  await agent.get('/api/patients').expect(401);
});
