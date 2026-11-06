import { AuditLog } from '../models/AuditLog';
import { recordAudit } from '../services/auditService';
import { asyncHandler } from '../utils/http';
import { auditQuery } from '../validators/schemas';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, action, patientId } = auditQuery.parse(req.query);
  await recordAudit(req, 'AUDIT_LIST');
  // This is a single-doctor application; include anonymous denied-login events.
  const filter = { ...(action ? { action } : {}), ...(patientId ? { patientId } : {}) };
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
