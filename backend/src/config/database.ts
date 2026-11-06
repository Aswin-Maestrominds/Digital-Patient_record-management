import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (): Promise<void> => {
  mongoose.set('bufferCommands', false);
  await mongoose.connect(env.DATABASE_URL, { serverSelectionTimeoutMS: 10000 });
  console.info('MongoDB connected.');
};
