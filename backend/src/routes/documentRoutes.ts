import { Router } from 'express';
import {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  downloadDocument,
  viewDocument,
  removeDocument,
} from '../controllers/documentController';
import { uploadClinicalDocument } from '../middleware/uploadMiddleware';
import { uploadLimiter } from '../middleware/rateLimits';

const router = Router();

router.get('/', getAllDocuments);
router.get('/:id', getDocumentById);
router.delete('/:id', removeDocument);
router.post('/upload', uploadLimiter, uploadClinicalDocument.single('file'), uploadDocument);
router.get('/:id/download', downloadDocument);
router.get('/:id/view', viewDocument);

export default router;
