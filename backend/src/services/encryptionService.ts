import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { env } from '../config/env';
const MAGIC = Buffer.from('MV01');
const key = () => Buffer.from(env.DOCUMENT_ENCRYPTION_KEY, 'hex');
export function encryptDocument(plaintext: Buffer, documentId: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(documentId));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}
export function decryptDocument(encrypted: Buffer, documentId: string): Buffer {
  if (encrypted.length < 32 || !encrypted.subarray(0, 4).equals(MAGIC))
    throw new Error('Invalid encrypted document.');
  const decipher = createDecipheriv('aes-256-gcm', key(), encrypted.subarray(4, 16));
  decipher.setAAD(Buffer.from(documentId));
  decipher.setAuthTag(encrypted.subarray(16, 32));
  return Buffer.concat([decipher.update(encrypted.subarray(32)), decipher.final()]);
}
export const sha256 = (data: Buffer | string): string =>
  createHash('sha256').update(data).digest('hex');
