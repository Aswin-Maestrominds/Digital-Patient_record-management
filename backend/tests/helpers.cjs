const path = require('node:path');
const { randomBytes } = require('node:crypto');

function configureTestEnvironment() {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'mongodb://127.0.0.1:27017/medivault_test';
  process.env.DOCUMENT_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  process.env.CLIENT_URL = 'http://localhost:3000';
  process.env.STORAGE_PROVIDER = 'local';
  process.env.UPLOAD_DIR = path.resolve(__dirname, '../.test-data', `uploads-${process.pid}`);
  process.env.MAX_FILE_SIZE_MB = '1';
  process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '../.test-data/mongodb-binaries');
}
module.exports = { configureTestEnvironment };
