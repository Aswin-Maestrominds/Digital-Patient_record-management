import { Request } from 'express';
import { User } from '../models/User';
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
  const actor = await User.findById(details.actorId ?? req.auth?.userId).select(
    'name role workspaceId',
  );
  await AuditLog.create({
    workspaceId: req.auth?.workspaceId ?? (actor ? (actor.workspaceId ?? actor._id) : undefined),
    actorName: actor?.name,
    actorRole: actor?.role,
    actorId: details.actorId ?? req.auth?.userId,
    action,
    resourceId: details.resourceId,
    patientId: details.patientId,
    outcome: details.outcome ?? 'success',
    requestId: req.requestId,
    ipAddress: req.ip,
  });
}
