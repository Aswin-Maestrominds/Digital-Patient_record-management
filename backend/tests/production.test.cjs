const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers.cjs').configureTestEnvironment();
process.env.NODE_ENV = 'production';
process.env.CLIENT_URL = 'https://clinic.example.test';
process.env.TRUST_PROXY_HOPS = '1';
const request = require('supertest');
const { createApp } = require('../dist/app');
const { sessionCookieName, sessionCookieOptions } = require('../dist/middleware/authMiddleware');

test('production rejects unencrypted requests and uses secure host-only cookies', async () => {
  const app = createApp();
  await request(app).get('/health').expect(426);
  // No database is connected, so HTTPS reaches health and reports unavailable.
  await request(app).get('/health').set('X-Forwarded-Proto', 'https').expect(503);
  assert.equal(sessionCookieName, '__Host-medivault_session');
  assert.equal(sessionCookieOptions.secure, true);
  assert.equal(sessionCookieOptions.httpOnly, true);
  assert.equal(sessionCookieOptions.domain, undefined);
});
