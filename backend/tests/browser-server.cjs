// Isolated browser-test fixture. Never connects to Atlas or seeds clinic data.
const path = require('node:path');
const fs = require('node:fs/promises');
const { randomBytes } = require('node:crypto');
require('./helpers.cjs').configureTestEnvironment();
process.env.CLIENT_URL = 'http://127.0.0.1:3107';
process.env.DOCUMENT_ENCRYPTION_KEY = randomBytes(32).toString('hex');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

(async () => {
  const mongo = await MongoMemoryServer.create();
  process.env.DATABASE_URL = mongo.getUri();
  const { createApp } = require('../dist/app');
  const { initializeModels } = require('../dist/config/initializeModels');
  const { User } = require('../dist/models/User');
  const { hashPassword } = require('../dist/services/passwordService');
  const { registerPatient } = require('../dist/services/patientService');
  await mongoose.connect(mongo.getUri());
  await initializeModels();
  const doctor = await User.create({
    name: 'Browser Test Doctor',
    email: 'browser@medivault.test',
    passwordHash: await hashPassword('Synthetic browser test password!'),
    isDemo: true,
    role: 'administrator',
  });
  for (let i = 0; i < 24; i++) {
    await registerPatient(String(doctor._id), {
      name: `Synthetic Directory ${String(i).padStart(2, '0')}`,
      dob: '1990-01-01',
      gender: 'Other',
      phone: '0000000000',
    });
  }
  const server = createApp().listen(5107, '127.0.0.1');
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
    const directory = path.resolve(process.env.UPLOAD_DIR);
    if (directory.startsWith(path.resolve(__dirname, '../.test-data') + path.sep))
      await fs.rm(directory, { recursive: true, force: true });
    process.exit(0);
  }
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
})().catch(() => {
  console.error('Isolated browser-test backend could not start.');
  process.exit(1);
});
