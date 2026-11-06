import React, { useEffect, useRef } from 'react';
import { X, CreditCard } from 'lucide-react';
import { Patient } from '../../api/types';
import { dateLabel } from '../../utils/display';

export function DigitalHealthCardModal({
  patient,
  onClose,
}: {
  patient: Patient | null;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!patient) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButton.current?.focus();
      }
    };
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
      previous?.focus();
    };
  }, [patient, onClose]);
  if (!patient) return null;
  return (
    <div
      className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-card-title"
        className="panel w-full max-w-md p-6 space-y-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 id="patient-card-title" className="font-bold flex items-center gap-2">
            <CreditCard className="text-blue-600" />
            Digital Patient Card
          </h2>
          <button ref={closeButton} aria-label="Close patient card" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="rounded-2xl bg-blue-700 text-white p-6 space-y-4">
          <p className="text-xs uppercase tracking-widest text-blue-200">MediVault</p>
          <h3 className="text-xl font-bold">{patient.name}</h3>
          <p className="font-mono text-lg break-all">{patient.id}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p>
              <span className="block text-xs text-blue-200">Date of birth</span>
              {dateLabel(patient.dob)}
            </p>
            <p>
              <span className="block text-xs text-blue-200">Blood group</span>
              {patient.bloodGroup || 'Not recorded'}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          This card identifies the patient within your clinic.
        </p>
      </section>
    </div>
  );
}
