import { recordAudit } from '../services/auditService';
import {
  listDocuments,
  deleteDocument,
  readDocument,
  requireDocument,
  storeDocument,
  validateFile,
} from '../services/documentService';
import { requirePatient } from '../services/patientService';
import { asyncHandler, HttpError } from '../utils/http';
import { documentId, documentInput, documentQuery } from '../validators/schemas';

export const getAllDocuments = asyncHandler(async (req, res) => {
  const query = documentQuery.parse(req.query);
  const result = await listDocuments(req.auth!.userId, query);
  await recordAudit(req, 'DOCUMENT_LIST', { patientId: query.patientId });
  res.json({ success: true, ...result });
});
export const getDocumentById = asyncHandler(async (req, res) => {
  const document = await requireDocument(req.auth!.userId, documentId.parse(req.params.id));
  await recordAudit(req, 'DOCUMENT_METADATA_VIEW', {
    resourceId: document.id,
    patientId: document.patientId,
  });
  res.json({ success: true, document });
});
export const uploadDocument = asyncHandler(async (req, res) => {
  const data = documentInput.parse(req.body);
  if (!req.file) throw new HttpError(400, 'Attach one file using the file field.');
  await requirePatient(req.auth!.userId, data.patientId);
  validateFile(req.file);
  await recordAudit(req, 'DOCUMENT_UPLOAD', { patientId: data.patientId, outcome: 'attempt' });
  const document = await storeDocument(req.auth!.userId, data, req.file);
  await recordAudit(req, 'DOCUMENT_UPLOAD', { patientId: data.patientId, resourceId: document.id });
  res.status(201).json({ success: true, document });
});

const deliverDocument = (attachment: boolean) =>
  asyncHandler(async (req, res) => {
    const id = documentId.parse(req.params.id);
    const metadata = await requireDocument(req.auth!.userId, id);
    const action = attachment ? 'DOCUMENT_DOWNLOAD' : 'DOCUMENT_VIEW';
    await recordAudit(req, action, {
      resourceId: id,
      patientId: metadata.patientId,
      outcome: 'attempt',
    });
    const { document, bytes } = await readDocument(req.auth!.userId, id);
    await recordAudit(req, action, { resourceId: id, patientId: document.patientId });
    const extension =
      document.mimeType === 'application/pdf'
        ? 'pdf'
        : document.mimeType === 'image/png'
          ? 'png'
          : 'jpg';
    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `${attachment ? 'attachment' : 'inline'}; filename="${id}.${extension}"`,
      'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'none'",
      'Content-Length': String(bytes.length),
    });
    res.send(bytes);
  });
export const downloadDocument = deliverDocument(true);
export const viewDocument = deliverDocument(false);

export const removeDocument = asyncHandler(async (req, res) => {
  const id = documentId.parse(req.params.id);
  const document = await requireDocument(req.auth!.userId, id);
  const details = { resourceId: id, patientId: document.patientId };
  await recordAudit(req, 'DOCUMENT_DELETE', { ...details, outcome: 'attempt' });
  await deleteDocument(req.auth!.userId, id);
  await recordAudit(req, 'DOCUMENT_DELETE', details);
  res.json({ success: true });
});
