import { randomUUID } from 'crypto';
import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimits';

export function createApp(): Application {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.set({ 'X-Request-ID': req.requestId, 'Cache-Control': 'no-store', Pragma: 'no-cache' });
    next();
  });
  app.use(helmet());
  app.use((req, res, next) => {
    if (env.NODE_ENV === 'production' && !req.secure) {
      res.status(426).json({ success: false, message: 'HTTPS is required.' });
      return;
    }
    // Origin enforcement complements SameSite cookies and the CSRF token.
    const origin = req.get('Origin');
    if (origin && origin !== new URL(env.CLIENT_URL).origin) {
      res.status(403).json({ success: false, message: 'Origin is not allowed.' });
      return;
    }
    if (req.get('Sec-Fetch-Site') === 'cross-site') {
      res.status(403).json({ success: false, message: 'Cross-site requests are not allowed.' });
      return;
    }
    next();
  });
  app.use(
    cors({
      origin: new URL(env.CLIENT_URL).origin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    }),
  );
  app.use('/api', apiLimiter);
  app.use(express.json({ limit: '192kb' }));
  app.use(cookieParser());
  app.get('/health', (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? 'UP' : 'UNAVAILABLE' });
  });
  app.use('/api', routes);
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found.' });
  });
  app.use(errorHandler);
  return app;
}
