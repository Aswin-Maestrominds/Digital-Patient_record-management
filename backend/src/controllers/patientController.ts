import { MedicalDocument } from '../models/MedicalDocument';
import { deletePatient } from '../services/patientDeletionService';
import { recordAudit } from '../services/auditService';
import {
  editPatient,
  listPatients,
  registerPatient,
  requirePatient,
} from '../services/patientService';
import { asyncHandler } from '../utils/http';
import { patientId, patientInput, patientQuery, patientUpdate } from '../validators/schemas';

export const getAllPatients = asyncHandler(async (req, res) => {
  const query = patientQuery.parse(req.query);
  await recordAudit(req, query.search ? 'PATIENT_SEARCH' : 'PATIENT_LIST');
  res.json({ success: true, ...(await listPatients(req.auth!.userId, query)) });
});
export const getPatientById = asyncHandler(async (req, res) => {
  const id = patientId.parse(req.params.id);
  const patient = await requirePatient(req.auth!.userId, id, true);
  await recordAudit(req, 'PATIENT_VIEW', { patientId: id, resourceId: id });
  const storedRecordsCount = await MedicalDocument.countDocuments({
    doctorId: req.auth!.userId,
    patientId: id,
  });
  res.json({ success: true, patient: { ...patient, storedRecordsCount } });
});
export const createPatient = asyncHandler(async (req, res) => {
  const data = patientInput.parse(req.body);
  await recordAudit(req, 'PATIENT_CREATE', { outcome: 'attempt' });
  const patient = await registerPatient(req.auth!.userId, data);
  await recordAudit(req, 'PATIENT_CREATE', { patientId: patient.id, resourceId: patient.id });
  res.status(201).json({ success: true, patient: { ...patient, storedRecordsCount: 0 } });
});
export const updatePatient = asyncHandler(async (req, res) => {
  const id = patientId.parse(req.params.id);
  const data = patientUpdate.parse(req.body);
  await requirePatient(req.auth!.userId, id);
  await recordAudit(req, 'PATIENT_UPDATE', { patientId: id, resourceId: id, outcome: 'attempt' });
  const patient = await editPatient(req.auth!.userId, id, data);
  await recordAudit(req, 'PATIENT_UPDATE', { patientId: id, resourceId: id });
  res.json({ success: true, patient });
});

export const removePatient = asyncHandler(async (req, res) => {
  const id = patientId.parse(req.params.id);
  await requirePatient(req.auth!.userId, id, true);
  await recordAudit(req, 'PATIENT_DELETE', { patientId: id, resourceId: id, outcome: 'attempt' });
  await deletePatient(req.auth!.userId, id);
  await recordAudit(req, 'PATIENT_DELETE', { patientId: id, resourceId: id });
  res.json({ success: true });
});
