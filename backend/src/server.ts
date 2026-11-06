import mongoose from 'mongoose';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { initializeModels } from './config/initializeModels';

async function startServer(): Promise<void> {
  await connectDatabase();
  await initializeModels();
  const server = createApp().listen(env.PORT, () =>
    console.info(`MediVault API listening on port ${env.PORT}.`),
  );
  server.requestTimeout = 60000;
  server.headersTimeout = 65000;
  const shutdown = () => {
    server.close(() => {
      void mongoose.disconnect().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
startServer().catch(() => {
  console.error('Startup failed. Check environment settings and MongoDB connectivity.');
  process.exit(1);
});
