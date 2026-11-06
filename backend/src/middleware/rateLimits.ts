import { rateLimit } from 'express-rate-limit';
export const apiLimiter = rateLimit({
  windowMs: 60000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
});
export const loginLimiter = rateLimit({
  windowMs: 15 * 60000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});
export const uploadLimiter = rateLimit({
  windowMs: 60000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many uploads. Please wait a minute.' },
});
