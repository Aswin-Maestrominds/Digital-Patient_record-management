import { Patient } from '../models/Patient';
import { MedicalDocument } from '../models/MedicalDocument';
import { deleteDocument } from './documentService';
import { HttpError } from '../utils/http';

export async function deletePatient(doctorId: string, id: string) {
  // Persist the deletion state so failed cleanup can be retried after a restart.
  // New uploads and profile edits are blocked once deletion begins.
  const patient = await Patient.findOneAndUpdate(
    { doctorId, id },
    { $set: { deletionStarted: true } },
  );
  if (!patient) throw new HttpError(404, 'Patient not found.');
  const documents = MedicalDocument.find({ doctorId, patientId: id }).select('id').cursor();
  for await (const document of documents) {
    try {
      await deleteDocument(doctorId, document.id);
    } catch (error) {
      // Concurrent deletes of the same document are harmless.
      if (!(error instanceof HttpError && error.status === 404)) throw error;
    }
  }
  await Patient.deleteOne({ doctorId, id });
}
