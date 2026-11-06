const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
require('./helpers.cjs').configureTestEnvironment();
process.env.CLOUDINARY_CLOUD_NAME = 'synthetic-test-cloud';
process.env.CLOUDINARY_API_KEY = 'synthetic-key';
process.env.CLOUDINARY_API_SECRET = 'synthetic-secret';
const { v2: cloudinary } = require('cloudinary');
const { cloudinaryStorage } = require('../dist/storage/cloudinaryStorage');
const key = '12345678-1234-1234-1234-123456789abc.bin';

test('Cloudinary uploads opaque raw assets with authenticated access and no overwrites', async (t) => {
  let options, received;
  t.mock.method(cloudinary.uploader, 'upload_stream', (input, callback) => {
    options = input;
    const stream = new PassThrough();
    const chunks = [];
    stream.on('data', (data) => chunks.push(data));
    stream.on('end', () => {
      received = Buffer.concat(chunks);
      callback(null, { public_id: input.public_id });
    });
    return stream;
  });
  await cloudinaryStorage.put(key, Buffer.from('opaque encrypted bytes'));
  assert.equal(options.resource_type, 'raw');
  assert.equal(options.type, 'authenticated');
  assert.equal(options.overwrite, false);
  assert.equal(options.public_id, `medivault/${key.replace(/\.bin$/, '.dat')}`);
  assert.deepEqual(received, Buffer.from('opaque encrypted bytes'));
});

test('Cloudinary retrieval uses a server-side signed URL and returns bytes', async (t) => {
  let requestedUrl;
  t.mock.method(globalThis, 'fetch', async (url) => {
    requestedUrl = url;
    return new Response(Buffer.from('encrypted bytes'));
  });
  const data = await cloudinaryStorage.get(key);
  assert.match(
    requestedUrl,
    /^https:\/\/res\.cloudinary\.com\/synthetic-test-cloud\/raw\/authenticated\/s--/,
  );
  assert.equal(data.toString(), 'encrypted bytes');
  await assert.rejects(() => cloudinaryStorage.get('../private'), /Invalid storage key/);
});

test('Cloudinary errors fail closed and cleanup uses the same protected delivery type', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Denied', { status: 403 }));
  await assert.rejects(() => cloudinaryStorage.get(key), /download failed/);
  let removed;
  t.mock.method(cloudinary.uploader, 'destroy', async (id, options) => {
    removed = { id, options };
    return { result: 'ok' };
  });
  await cloudinaryStorage.remove(key);
  assert.equal(removed.id, `medivault/${key.replace(/\.bin$/, '.dat')}`);
  assert.equal(removed.options.type, 'authenticated');
  assert.equal(removed.options.resource_type, 'raw');
});
