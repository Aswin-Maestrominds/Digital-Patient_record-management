import { escapeRegex } from '../utils/http';
import { AuditLog } from '../models/AuditLog';
import { recordAudit } from '../services/auditService';
import { asyncHandler } from '../utils/http';
import { auditQuery } from '../validators/schemas';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, action, patientId, search, outcome, from, to, activityOnly } =
    auditQuery.parse(req.query);
  await recordAudit(req, 'AUDIT_LIST');
  const filter = {
    workspaceId: req.auth!.workspaceId,
    ...(activityOnly
      ? {
          action: {
            $nin: [
              'AUDIT_LIST',
              'PATIENT_LIST',
              'PATIENT_SEARCH',
              'DOCUMENT_LIST',
              'DOCUMENT_METADATA_VIEW',
            ],
          },
        }
      : {}),
    ...(action ? { action } : {}),
    ...(patientId ? { patientId } : {}),
    ...(outcome ? { outcome } : {}),
    ...(from || to
      ? {
          occurredAt: {
            ...(from ? { $gte: new Date(from + 'T00:00:00+05:30') } : {}),
            ...(to ? { $lte: new Date(to + 'T23:59:59.999+05:30') } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          $or: ['actorName', 'patientId', 'resourceId', 'action'].map((key) => ({
            [key]: new RegExp(escapeRegex(search), 'i'),
          })),
        }
      : {}),
  };
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ occurredAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ success: true, logs, total, page, limit });
});
