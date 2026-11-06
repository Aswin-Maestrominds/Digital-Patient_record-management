import { Counter } from '../models/Counter';
import { todayInIndia } from '../validators/schemas';
export async function generatePatientId(): Promise<string> {
  const year = todayInIndia().slice(0, 4);
  // Atomic increment remains safe under concurrent registration requests.
  const counter = await Counter.findOneAndUpdate(
    { _id: `patient-${year}` },
    { $inc: { value: 1 } },
    { upsert: true, new: true },
  );
  return `PT-${year}-${String(counter!.value).padStart(3, '0')}`;
}
