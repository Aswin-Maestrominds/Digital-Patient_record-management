import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { DocumentStorage } from './documentStorage';

function configure(): void {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are not configured.');
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}
function publicId(key: string): string {
  if (!/^[a-f\d-]{36}\.bin$/.test(key)) throw new Error('Invalid storage key.');
  // Cloudinary blocks .bin uploads. Keep the internal key unchanged and use
  // .dat for the encrypted raw asset on Cloudinary.
  return `medivault/${key.replace(/\.bin$/, '.dat')}`;
}
export const cloudinaryStorage: DocumentStorage = {
  async put(key, data) {
    configure();
    await new Promise<void>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          public_id: publicId(key),
          resource_type: 'raw',
          type: 'authenticated',
          overwrite: false,
          unique_filename: false,
          timeout: 60000,
        },
        (error, result) => {
          if (error || !result) reject(new Error('Cloudinary upload failed.'));
          else resolve();
        },
      );
      upload.on('error', () => reject(new Error('Cloudinary upload failed.')));
      upload.end(data);
    });
  },
  async get(key) {
    configure();
    // This signed URL remains server-side. The browser only receives decrypted
    // bytes after session authorization; no patient identifiers reach Cloudinary.
    const url = cloudinary.url(publicId(key), {
      resource_type: 'raw',
      type: 'authenticated',
      secure: true,
      sign_url: true,
    });
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
    if (!response.ok || !response.body) throw new Error('Cloudinary download failed.');
    const chunks: Buffer[] = [];
    let length = 0;
    // Allow documents uploaded under a previous configuration up to the API cap.
    for await (const chunk of response.body) {
      length += chunk.byteLength;
      if (length > 50 * 1024 * 1024 + 32) throw new Error('Stored document exceeds size limit.');
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  },
  async remove(key) {
    configure();
    const result = await cloudinary.uploader.destroy(publicId(key), {
      resource_type: 'raw',
      type: 'authenticated',
      invalidate: true,
    });
    if (!['ok', 'not found'].includes(result.result)) throw new Error('Cloudinary cleanup failed.');
  },
};
