import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { Session } from '../models/Session';
async function migrate() {
  await connectDatabase();
  const owner = await User.findOne({ slot: 'doctor' });
  if (!owner) throw new Error('Configure the initial account first.');
  await User.updateOne(
    { _id: owner._id },
    { $set: { role: 'administrator' }, $inc: { credentialVersion: 1 } },
  );
  await Session.deleteMany({ userId: owner._id });
  await AuditLog.updateMany(
    {
      workspaceId: { $exists: false },
      $or: [{ actorId: owner._id }, { actorId: { $exists: false } }],
    },
    { $set: { workspaceId: owner._id } },
  );
  console.info(
    'Workspace owner promoted to administrator. Existing patient IDs and files preserved. Owner must sign in again.',
  );
}
migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
