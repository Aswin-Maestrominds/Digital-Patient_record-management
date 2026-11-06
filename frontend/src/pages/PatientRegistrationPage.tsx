import React, { useState } from 'react';
import { UserPlus, RotateCcw, User, MapPin, HeartHandshake } from 'lucide-react';
import { NavigationPage } from '../components/layout/Sidebar';
import { usePatientRecords } from '../context/PatientRecordContext';
import { Patient, PatientInput } from '../api/types';
import { errorMessage } from '../api/client';
import { ErrorNotice } from '../components/common/ApiState';
import { today } from '../utils/display';

interface Props {
  onNavigate: (page: NavigationPage, patientId?: string) => void;
  patient?: Patient;
  onSaved?: () => void;
}
export function PatientRegistrationPage({ onNavigate, patient, onSaved }: Props) {
  const { addPatient, updatePatient } = usePatientRecords();
  const initial = {
    name: patient?.name || '',
    dob: patient?.dob || '',
    gender: patient?.gender || ('' as '' | PatientInput['gender']),
    phone: patient?.phone || '',
    email: patient?.email || '',
    bloodGroup: patient?.bloodGroup || '',
    street: patient?.address?.street || '',
    city: patient?.address?.city || '',
    state: patient?.address?.state || '',
    zip: patient?.address?.zip || '',
    country: patient?.address?.country || 'India',
    emergencyName: patient?.emergencyContact?.name || '',
    emergencyRelationship: patient?.emergencyContact?.relationship || '',
    emergencyPhone: patient?.emergencyContact?.phone || '',
    notes: patient?.notes || '',
  };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((previous) => ({ ...previous, [key]: e.target.value })),
  });
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const input: PatientInput = {
      name: form.name.trim(),
      dob: form.dob,
      gender: form.gender as PatientInput['gender'],
      phone: form.phone.trim(),
      email: form.email.trim(),
      ...(form.bloodGroup ? { bloodGroup: form.bloodGroup } : {}),
      address: {
        street: form.street,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: form.country,
      },
      emergencyContact: {
        name: form.emergencyName,
        relationship: form.emergencyRelationship,
        ...(form.emergencyPhone.trim() ? { phone: form.emergencyPhone.trim() } : {}),
      },
      notes: form.notes,
    };
    try {
      const saved = patient
        ? await updatePatient(patient.id, {
            ...input,
            bloodGroup: form.bloodGroup || null,
            emergencyContact: {
              ...input.emergencyContact,
              phone: form.emergencyPhone.trim() || null,
            },
          })
        : await addPatient(input);
      if (onSaved) onSaved();
      else onNavigate('record-detail', saved.id);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
            Clinical Directory › Patients
          </p>
          <h1 className="page-title">
            {patient ? 'Edit Patient Profile' : 'New Patient Registration'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {patient ? patient.id : 'A unique Patient ID will be assigned when you save.'}
          </p>
        </div>
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={() => {
            setForm(initial);
            setError('');
          }}
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>
      <ErrorNotice message={error} />
      <form onSubmit={submit} className="space-y-6">
        <fieldset disabled={busy} className="space-y-6">
          <section className="panel p-5 sm:p-7">
            <h2 className="font-bold flex items-center gap-2 mb-5">
              <User size={18} className="text-blue-600" />
              Personal Details
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <label className="label">
                Full name *
                <input
                  className="field"
                  required
                  minLength={2}
                  maxLength={200}
                  {...field('name')}
                />
              </label>
              <label className="label">
                Date of birth *
                <input
                  className="field"
                  required
                  type="date"
                  min="1850-01-01"
                  max={today()}
                  {...field('dob')}
                />
              </label>
              <label className="label">
                Gender *
                <select className="field" required {...field('gender')}>
                  <option value="">Select gender</option>
                  {['Male', 'Female', 'Other'].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="label">
                Phone *
                <input className="field" type="tel" required maxLength={20} {...field('phone')} />
              </label>
              <label className="label">
                Email
                <input className="field" type="email" maxLength={254} {...field('email')} />
              </label>
              <label className="label">
                Blood group
                <select className="field" {...field('bloodGroup')}>
                  <option value="">Not recorded</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>
          <section className="panel p-5 sm:p-7">
            <h2 className="font-bold flex items-center gap-2 mb-5">
              <MapPin size={18} className="text-blue-600" />
              Address <span className="text-xs text-slate-400 font-normal">Optional</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(['street', 'city', 'state', 'zip', 'country'] as const).map((key) => (
                <label className="label capitalize" key={key}>
                  {key === 'zip' ? 'Postal code' : key}
                  <input
                    className="field"
                    maxLength={key === 'zip' ? 20 : key === 'country' ? 80 : 200}
                    {...field(key)}
                  />
                </label>
              ))}
            </div>
          </section>
          <section className="panel p-5 sm:p-7">
            <h2 className="font-bold flex items-center gap-2 mb-5">
              <HeartHandshake size={18} className="text-blue-600" />
              Emergency Contact <span className="text-xs text-slate-400 font-normal">Optional</span>
            </h2>
            <div className="grid sm:grid-cols-3 gap-5">
              <label className="label">
                Contact name
                <input className="field" maxLength={200} {...field('emergencyName')} />
              </label>
              <label className="label">
                Relationship
                <input className="field" maxLength={100} {...field('emergencyRelationship')} />
              </label>
              <label className="label">
                Contact phone
                <input className="field" type="tel" maxLength={20} {...field('emergencyPhone')} />
              </label>
            </div>
          </section>
          <section className="panel p-5 sm:p-7">
            <label className="label">
              Clinical notes (optional)
              <textarea className="field min-h-28" maxLength={5000} {...field('notes')} />
            </label>
          </section>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => (onSaved ? onSaved() : onNavigate('patients'))}
            >
              Cancel
            </button>
            <button className="btn-primary" type="submit">
              <UserPlus size={16} />
              {busy ? 'Saving…' : patient ? 'Save Changes' : 'Register Patient'}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
