import { Router } from 'express';
import { login, getCurrentUser, logout } from '../controllers/authController';
import { authenticate, requireCsrf } from '../middleware/authMiddleware';
import { loginLimiter } from '../middleware/rateLimits';

const router = Router();

router.post('/login', loginLimiter, login);
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, requireCsrf, logout);

export default router;
