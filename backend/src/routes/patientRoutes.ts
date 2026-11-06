import { Router } from 'express';
import {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  removePatient,
} from '../controllers/patientController';

const router = Router();

router.get('/', getAllPatients);
router.get('/:id', getPatientById);
router.post('/', createPatient);
router.patch('/:id', updatePatient);
router.delete('/:id', removePatient);

export default router;
