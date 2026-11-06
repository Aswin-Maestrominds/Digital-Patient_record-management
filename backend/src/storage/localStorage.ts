import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import { DocumentStorage } from './documentStorage';

function filePath(key: string): string {
  // Storage keys are generated on the server and can never contain path segments.
  if (!/^[a-f\d-]{36}\.bin$/.test(key)) throw new Error('Invalid storage key.');
  return path.join(path.resolve(env.UPLOAD_DIR), key);
}
export const localStorage: DocumentStorage = {
  async put(key, data) {
    await mkdir(path.resolve(env.UPLOAD_DIR), { recursive: true, mode: 0o700 });
    await writeFile(filePath(key), data, { flag: 'wx', mode: 0o600 });
  },
  async get(key) {
    return readFile(filePath(key));
  },
  async remove(key) {
    try {
      await unlink(filePath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  },
};
