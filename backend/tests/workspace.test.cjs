const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers.cjs').configureTestEnvironment();
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../dist/app');
const { initializeModels } = require('../dist/config/initializeModels');
const { User } = require('../dist/models/User');
const { Session } = require('../dist/models/Session');
const { Patient } = require('../dist/models/Patient');
const { AuditLog } = require('../dist/models/AuditLog');
const { hashPassword } = require('../dist/services/passwordService');
const { totp, verifyTotp } = require('../dist/services/totpService');
let mongo, app, admin, owner, csrf, staff, staffCsrf, staffId, patientId;
const password = 'Synthetic password 123!';
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await initializeModels();
  owner = await User.create({
    name: 'Workspace Owner',
    email: 'owner@example.test',
    role: 'administrator',
    passwordHash: await hashPassword(password),
  });
  app = createApp();
  admin = request.agent(app);
  const r = await admin.post('/api/auth/login').send({ email: owner.email, password }).expect(200);
  csrf = r.body.csrfToken;
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
const mutate = (agent, method, url, token, body) =>
  agent[method](url).set('X-CSRF-Token', token).send(body);
test('admin creates staff with safe public fields; staff shares records but cannot manage users or delete', async () => {
  const r = await mutate(admin, 'post', '/api/users', csrf, {
    name: 'Medical Staff',
    email: 'staff@example.test',
    role: 'staff',
    password,
  }).expect(201);
  staffId = r.body.user.id;
  assert.equal(r.body.user.passwordHash, undefined);
  staff = request.agent(app);
  const login = await staff
    .post('/api/auth/login')
    .send({ email: 'staff@example.test', password })
    .expect(200);
  staffCsrf = login.body.csrfToken;
  await staff.get('/api/users').expect(403);
  await mutate(staff, 'post', '/api/users', staffCsrf, { name: 'Intruder' }).expect(403);
  const patient = await mutate(staff, 'post', '/api/patients', staffCsrf, {
    name: 'Synthetic Team Patient',
    dob: '1990-01-01',
    gender: 'Female',
    phone: '0000000000',
  }).expect(201);
  patientId = patient.body.patient.id;
  await admin.get('/api/patients/' + patientId).expect(200);
  await mutate(staff, 'delete', '/api/patients/' + patientId, staffCsrf).expect(403);
  const stats = await staff.get('/api/workspace/stats').expect(200);
  assert.equal(stats.body.patients, 1);
});
test('workspace isolation covers users, records, statistics and audits', async () => {
  const other = await User.create({
    slot: 'other',
    role: 'administrator',
    name: 'Other Owner',
    email: 'other@example.test',
    passwordHash: await hashPassword(password),
  });
  const agent = request.agent(app);
  const login = await agent
    .post('/api/auth/login')
    .send({ email: other.email, password })
    .expect(200);
  await agent.get('/api/patients/' + patientId).expect(404);
  assert.equal((await agent.get('/api/workspace/stats')).body.patients, 0);
  await mutate(agent, 'patch', '/api/users/' + staffId, login.body.csrfToken, {
    active: false,
  }).expect(404);
  const logs = await agent.get('/api/audit').expect(200);
  assert.ok(logs.body.logs.every((l) => String(l.workspaceId) === String(other._id)));
  const users = await agent.get('/api/users').expect(200);
  assert.equal(users.body.total, 1);
});
test('profile and preferences persist, unknown privileges are rejected, and password change revokes other sessions', async () => {
  await mutate(staff, 'patch', '/api/account/profile', staffCsrf, {
    name: 'Updated Staff',
    email: 'staff@example.test',
    phone: '1234567890',
  }).expect(200);
  await mutate(staff, 'patch', '/api/account/profile', staffCsrf, {
    name: 'Staff',
    email: 'staff@example.test',
    role: 'administrator',
  }).expect(400);
  await mutate(staff, 'patch', '/api/account/preferences', staffCsrf, {
    directoryView: 'table',
    inactivityMinutes: 15,
  }).expect(200);
  assert.equal((await staff.get('/api/auth/me')).body.user.preferences.directoryView, 'table');
  const second = request.agent(app);
  await second.post('/api/auth/login').send({ email: 'staff@example.test', password }).expect(200);
  await mutate(staff, 'post', '/api/account/password', staffCsrf, {
    currentPassword: 'wrong',
    newPassword: 'Updated password 456!',
  }).expect(400);
  await mutate(staff, 'post', '/api/account/password', staffCsrf, {
    currentPassword: password,
    newPassword: 'Updated password 456!',
  }).expect(200);
  await second.get('/api/auth/me').expect(401);
  await staff.get('/api/auth/me').expect(200);
});
test('owner cannot be disabled, deactivation revokes access immediately, idle sessions expire', async () => {
  await mutate(admin, 'patch', '/api/users/' + owner.id, csrf, { active: false }).expect(400);
  await mutate(admin, 'patch', '/api/users/' + staffId, csrf, { active: false }).expect(200);
  await staff.get('/api/auth/me').expect(401);
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'staff@example.test', password: 'Updated password 456!' })
    .expect(401);
  await Session.updateMany(
    { userId: owner._id },
    { lastActiveAt: new Date(Date.now() - 31 * 60000) },
  );
  await admin.get('/api/auth/me').expect(401);
  const r = await admin.post('/api/auth/login').send({ email: owner.email, password }).expect(200);
  csrf = r.body.csrfToken;
});
test('TOTP matches RFC 6238 vector and rejects reuse', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(totp(secret, 1, 8), '94287082');
  assert.equal(verifyTotp(secret, '287082', -1, 59000), 1);
  assert.equal(verifyTotp(secret, '287082', 1, 59000), null);
});
test('two-step setup encrypts the secret, requires code confirmation and login rejects missing or replayed codes', async () => {
  const setup = await mutate(admin, 'post', '/api/account/two-step/setup', csrf, {
    password,
  }).expect(200);
  const secret = setup.body.secret;
  const stored = await User.findById(owner.id).select('+pendingTotpSecret');
  assert.notEqual(stored.pendingTotpSecret, secret);
  const step = Math.floor(Date.now() / 30000);
  await mutate(admin, 'post', '/api/account/two-step/enable', csrf, {
    code: totp(secret, step),
  }).expect(200);
  const another = request.agent(app);
  await another.post('/api/auth/login').send({ email: owner.email, password }).expect(401);
  await another
    .post('/api/auth/login')
    .send({ email: owner.email, password, code: totp(secret, step) })
    .expect(401);
  await another
    .post('/api/auth/login')
    .send({ email: owner.email, password, code: totp(secret, step + 1) })
    .expect(200);
  await request(app)
    .post('/api/auth/login')
    .send({ email: owner.email, password, code: totp(secret, step + 1) })
    .expect(401);
  const me = await another.get('/api/auth/me').expect(200);
  assert.equal(me.body.user.totpSecret, undefined);
  assert.equal(me.body.user.totpEnabled, true);
});
