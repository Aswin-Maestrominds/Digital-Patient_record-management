import { Router } from 'express';
import totpRoutes from './totpRoutes';
import workspaceRoutes from './workspaceRoutes';
import authRoutes from './authRoutes';
import patientRoutes from './patientRoutes';
import documentRoutes from './documentRoutes';
import auditRoutes from './auditRoutes';
import { authenticate, requireCsrf } from '../middleware/authMiddleware';
import { env } from '../config/env';

const router = Router();

router.use('/auth', authRoutes);
router.use(authenticate, requireCsrf);
router.get('/config', (_req, res) => {
  res.json({ success: true, maxFileSizeMb: env.MAX_FILE_SIZE_MB });
});
router.use('/account/two-step', totpRoutes);
router.use(workspaceRoutes);
router.use('/patients', patientRoutes);
router.use('/documents', documentRoutes);
router.use('/audit', auditRoutes);

export default router;
