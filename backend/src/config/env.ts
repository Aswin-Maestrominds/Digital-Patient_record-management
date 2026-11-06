import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().regex(/^mongodb(\+srv)?:\/\//),
  DOCUMENT_ENCRYPTION_KEY: z.string().regex(/^[a-f\d]{64}$/i),
  SESSION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  STORAGE_PROVIDER: z.enum(['local', 'cloudinary']).default('local'),
  UPLOAD_DIR: z.string().min(1).default('./uploads/clinical_vault'),
  MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(50).default(10),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const result = schema.safeParse(process.env);
if (!result.success) {
  // Never print environment values: database URLs may contain credentials.
  throw new Error(
    `Invalid configuration: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}`,
  );
}
export const env = result.data;
if (env.NODE_ENV === 'production' && !env.CLIENT_URL.startsWith('https://')) {
  throw new Error('CLIENT_URL must use HTTPS in production.');
}
if (
  env.STORAGE_PROVIDER === 'cloudinary' &&
  (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET)
) {
  throw new Error('Cloudinary storage requires cloud name, API key and API secret.');
}
