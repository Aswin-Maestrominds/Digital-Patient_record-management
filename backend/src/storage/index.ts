import { DocumentStorage } from './documentStorage';
import { localStorage } from './localStorage';
import { cloudinaryStorage } from './cloudinaryStorage';
export function getStorage(provider: string): DocumentStorage {
  if (provider === 'local') return localStorage;
  if (provider === 'cloudinary') return cloudinaryStorage;
  throw new Error('Unknown storage provider.');
}
