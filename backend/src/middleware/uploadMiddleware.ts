import multer from 'multer';
import { env } from '../config/env';
import { HttpError } from '../utils/http';

// Authenticate and rate-limit before buffering a single bounded upload.
export const uploadClinicalDocument = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
    fields: 8,
    parts: 9,
    fieldSize: 12000,
  },
  fileFilter: (_req, file, callback) => {
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)) {
      callback(new HttpError(415, 'Only PDF, JPG and PNG files are supported.'));
      return;
    }
    callback(null, true);
  },
});
