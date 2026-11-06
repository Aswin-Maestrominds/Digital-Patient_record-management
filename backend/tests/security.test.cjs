const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers.cjs').configureTestEnvironment();
const { encryptDocument, decryptDocument } = require('../dist/services/encryptionService');
const { hashPassword, verifyPassword } = require('../dist/services/passwordService');
const { patientInput, documentInput } = require('../dist/validators/schemas');
const { escapeRegex } = require('../dist/utils/http');

test('encryption hides plaintext, randomizes ciphertext and rejects tampering or a different record', () => {
  const data = Buffer.from('Synthetic confidential test document');
  const first = encryptDocument(data, 'document-a');
  const second = encryptDocument(data, 'document-a');
  assert.notDeepEqual(first, second);
  assert.equal(first.includes(data), false);
  assert.deepEqual(decryptDocument(first, 'document-a'), data);
  assert.throws(() => decryptDocument(first, 'document-b'));
  first[first.length - 1] ^= 1;
  assert.throws(() => decryptDocument(first, 'document-a'));
});

test('password hashes use unique salts and reject the wrong password', async () => {
  const first = await hashPassword('Example testing passphrase');
  const second = await hashPassword('Example testing passphrase');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('Example testing passphrase', first), true);
  assert.equal(await verifyPassword('Wrong password', first), false);
});

test('validation rejects impossible dates, client-assigned IDs and unsupported categories', () => {
  const patient = {
    name: 'Synthetic Patient',
    dob: '2000-02-29',
    gender: 'Other',
    phone: '0000000000',
  };
  assert.equal(patientInput.safeParse(patient).success, true);
  assert.equal(patientInput.safeParse({ ...patient, dob: '2001-02-29' }).success, false);
  assert.equal(patientInput.safeParse({ ...patient, id: 'PT-2026-001' }).success, false);
  assert.equal(patientInput.safeParse({ ...patient, doctorId: 'someone-else' }).success, false);
  assert.equal(
    documentInput.safeParse({
      patientId: 'PT-2026-001',
      title: 'Test',
      category: 'Pharmacy Bill',
      reportDate: '2020-01-01',
    }).success,
    true,
  );
  assert.equal(
    documentInput.safeParse({
      patientId: 'PT-2026-001',
      title: 'Test',
      category: 'DICOM',
      reportDate: '2020-01-01',
    }).success,
    false,
  );
  assert.equal(new RegExp(escapeRegex('A.*[test]')).test('A.*[test]'), true);
  assert.equal(new RegExp(escapeRegex('.*')).test('Any patient'), false);
});
