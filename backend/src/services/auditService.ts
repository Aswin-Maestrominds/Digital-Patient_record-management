import { Request } from 'express';
import { AuditLog } from '../models/AuditLog';

export async function recordAudit(
  req: Request,
  action: string,
  details: {
    resourceId?: string;
    patientId?: string;
    actorId?: string;
    outcome?: 'success' | 'denied' | 'attempt';
  } = {},
): Promise<void> {
  await AuditLog.create({
    actorId: details.actorId ?? req.auth?.userId,
    action,
    resourceId: details.resourceId,
    patientId: details.patientId,
    outcome: details.outcome ?? 'success',
    requestId: req.requestId,
    ipAddress: req.ip,
  });
}
