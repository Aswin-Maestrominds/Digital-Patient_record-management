import { z } from 'zod';
import { DOCUMENT_CATEGORIES } from '../models/MedicalDocument';
export const todayInIndia = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Use a valid date in YYYY-MM-DD format.');
const pastDate = calendarDate.refine(
  (value) => value <= todayInIndia(),
  'Date cannot be in the future.',
);
const text = (max = 200) => z.string().trim().max(max);
const phone = z
  .string()
  .trim()
  .regex(/^\+?[\d ()-]{7,20}$/, 'Enter a valid phone number.');
export const patientInput = z
  .object({
    name: text().min(2),
    dob: pastDate.refine((value) => value >= '1850-01-01', 'Date of birth is too early.'),
    gender: z.enum(['Male', 'Female', 'Other']),
    phone,
    email: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    address: z
      .object({ street: text(), city: text(), state: text(), zip: text(20), country: text(80) })
      .partial()
      .strict()
      .optional(),
    nationalHealthId: text(100).optional(),
    insurance: z
      .object({
        provider: text(),
        policyNumber: text(100),
        coverageAmount: text(50),
        status: z.enum(['Active', 'Pending', 'Expired']),
      })
      .partial()
      .strict()
      .optional(),
    emergencyContact: z
      .object({ name: text(), relationship: text(100), phone, secondaryNotes: text(1000) })
      .partial()
      .strict()
      .optional(),
    vitals: z
      .object({
        bp: text(30),
        bmi: z.number().positive().max(150),
        pulse: z.number().int().min(0).max(300),
        spO2: z.number().min(0).max(100),
      })
      .partial()
      .strict()
      .optional(),
    allergies: z.array(text()).max(100).optional(),
    chronicConditions: z.array(text()).max(100).optional(),
    notes: text(5000).optional(),
    status: z.enum(['Active', 'Under Review', 'Discharged']).optional(),
  })
  .strict();
export const patientUpdate = patientInput
  .partial()
  .extend({
    bloodGroup: patientInput.shape.bloodGroup.unwrap().nullable().optional(),
    emergencyContact: patientInput.shape.emergencyContact
      .unwrap()
      .extend({
        phone: phone.nullable().optional(),
      })
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Supply at least one field.');
export const pagination = z.object({
  page: z.coerce.number().int().positive().max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const patientQuery = pagination.extend({ search: text(100).optional() }).strict();
export const patientId = z.string().regex(/^PT-\d{4}-\d{3,}$/);
export const documentId = z.string().regex(/^DOC-[a-f\d-]{36}$/);
export const documentInput = z
  .object({
    patientId,
    title: text().min(1),
    category: z.enum(DOCUMENT_CATEGORIES),
    subType: text(100).optional(),
    reportDate: pastDate,
    notes: text(5000).optional(),
  })
  .strict();
export const documentQuery = pagination
  .extend({
    patientId: patientId.optional(),
    category: z.enum(DOCUMENT_CATEGORIES).optional(),
    from: calendarDate.optional(),
    to: calendarDate.optional(),
  })
  .strict()
  .refine((v) => !v.from || !v.to || v.from <= v.to, 'from must be on or before to.');
export const loginInput = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();
export const auditQuery = pagination
  .extend({ action: text(80).optional(), patientId: patientId.optional() })
  .strict();
