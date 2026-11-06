import { User } from '../models/User';
import { Session } from '../models/Session';
import { Counter } from '../models/Counter';
import { Patient } from '../models/Patient';
import { MedicalDocument } from '../models/MedicalDocument';
import { AuditLog } from '../models/AuditLog';

export async function initializeModels(): Promise<void> {
  // Wait for unique indexes before accepting concurrent writes or setup commands.
  await Promise.all([
    User.init(),
    Session.init(),
    Counter.init(),
    Patient.init(),
    MedicalDocument.init(),
    AuditLog.init(),
  ]);
}
