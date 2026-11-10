import { Schema, model } from 'mongoose';
// No update/delete endpoint is exposed. Infrastructure must separately protect
// this collection against privileged changes; this is not an immutable ledger.
const auditSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorName: String,
    actorRole: String,
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    resourceId: String,
    patientId: String,
    outcome: { type: String, enum: ['success', 'denied', 'attempt'], required: true },
    requestId: { type: String, required: true },
    ipAddress: String,
    occurredAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false },
);
auditSchema.index({ occurredAt: -1 });
export const AuditLog = model('AuditLog', auditSchema);
