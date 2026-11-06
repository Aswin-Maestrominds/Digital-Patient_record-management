import React, { useRef, useState } from 'react';
import { Upload, FileText, X, Search } from 'lucide-react';
import { NavigationPage } from '../components/layout/Sidebar';
import { usePatientRecords } from '../context/PatientRecordContext';
import { useApiQuery, useDebouncedValue } from '../hooks/useApiQuery';
import { Patient, PatientPage, DocumentCategory, documentCategories } from '../api/types';
import { errorMessage, queryString } from '../api/client';
import { ErrorNotice, Loading } from '../components/common/ApiState';
import { fileSize, today } from '../utils/display';

export function UploadDocumentPage({
  initialPatientId,
  onNavigate,
}: {
  initialPatientId?: string;
  onNavigate: (page: NavigationPage, patientId?: string, docId?: string) => void;
}) {
  const { addDocument } = usePatientRecords();
  const [selectedId, setSelectedId] = useState(initialPatientId || '');
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim());
  const choices = useApiQuery<PatientPage>(
    !selectedId ? `/patients?${queryString({ search: term, limit: 20 })}` : null,
  );
  const patient = useApiQuery<{ patient: Patient }>(
    selectedId ? `/patients/${encodeURIComponent(selectedId)}` : null,
  );
  const config = useApiQuery<{ maxFileSizeMb: number }>('/config');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Medical History');
  const [subType, setSubType] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  function chooseFile(chosen?: File) {
    setError('');
    if (!chosen) return;
    if (
      !/\.(pdf|jpe?g|png)$/i.test(chosen.name) ||
      !['application/pdf', 'image/jpeg', 'image/png'].includes(chosen.type)
    ) {
      setError('Choose a PDF, JPG or PNG file.');
      return;
    }
    if (config.data && chosen.size > config.data.maxFileSizeMb * 1024 * 1024) {
      setError(`The file must be ${config.data.maxFileSizeMb} MB or smaller.`);
      return;
    }
    setFile(chosen);
    if (!title) setTitle(chosen.name.replace(/\.[^.]+$/, '').slice(0, 200));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!file || !patient.data) {
      setError('Select a patient and a file before uploading.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const document = await addDocument(
        {
          patientId: patient.data.patient.id,
          title: title.trim(),
          category,
          reportDate,
          subType,
          notes,
        },
        file,
      );
      onNavigate('doc-viewer', document.patientId, document.id);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">
          Clinical Directory › Medical Records
        </p>
        <h1 className="page-title">Upload Medical Document</h1>
        <p className="text-sm text-slate-500 mt-1">
          Attach a report to the correct patient profile.
        </p>
      </div>
      <ErrorNotice message={error} />
      {selectedId ? (
        patient.loading ? (
          <Loading text="Loading selected patient…" />
        ) : patient.error ? (
          <>
            <ErrorNotice message={patient.error} onRetry={patient.reload} />
            <button className="btn-secondary" onClick={() => setSelectedId('')}>
              Choose another patient
            </button>
          </>
        ) : (
          <div className="panel p-5 flex justify-between items-center gap-3">
            <div>
              <h2 className="font-bold">{patient.data?.patient.name}</h2>
              <p className="text-xs font-mono text-blue-600 mt-1">{patient.data?.patient.id}</p>
            </div>
            <button className="btn-secondary" disabled={busy} onClick={() => setSelectedId('')}>
              Change Patient
            </button>
          </div>
        )
      ) : (
        <section className="panel p-5 space-y-3">
          <h2 className="font-bold">Select Patient</h2>
          <label className="label">
            Find patient
            <div className="flex items-center gap-2">
              <Search size={18} />
              <input
                className="field"
                maxLength={100}
                placeholder="Search by name or Patient ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
          {choices.loading ? (
            <Loading text="Finding patients…" />
          ) : choices.error ? (
            <ErrorNotice message={choices.error} onRetry={choices.reload} />
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {choices.data?.patients.map((patient) => (
                  <button
                    key={patient.id}
                    className="text-left rounded-xl p-3 border border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => setSelectedId(patient.id)}
                  >
                    <span className="text-sm font-semibold">{patient.name}</span>
                    <span className="block text-xs font-mono text-slate-400 mt-1">
                      {patient.id}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                {choices.data?.total
                  ? `Showing up to 20 of ${choices.data.total} matches. Refine the search to find your patient.`
                  : 'No patients found. Register a patient first.'}
              </p>
            </>
          )}
        </section>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="grid lg:grid-cols-2 gap-6">
          <section className="panel p-6 space-y-5">
            <h2 className="font-bold">Document File</h2>
            <input
              ref={fileInput}
              aria-label="Document file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="block w-full text-sm"
              onChange={(e) => chooseFile(e.target.files?.[0])}
            />
            <div
              className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-8 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!busy) chooseFile(e.dataTransfer.files[0]);
              }}
            >
              <Upload className="mx-auto text-blue-600 mb-3" size={32} />
              <p className="text-sm font-semibold">Drop a PDF or image here</p>
              <p className="text-xs text-slate-500 mt-2">
                PDF, JPG and PNG{config.data ? ` · Maximum ${config.data.maxFileSizeMb} MB` : ''}
              </p>
            </div>
            {file && (
              <div className="flex gap-3 items-center rounded-xl border border-slate-200 p-4">
                <FileText className="text-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold break-all">{file.name}</p>
                  <p className="text-xs text-slate-400">{fileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  aria-label="Remove selected file"
                  onClick={() => {
                    setFile(null);
                    if (fileInput.current) fileInput.current.value = '';
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <p className="text-xs text-slate-500">
              The upload time is saved automatically. Enter the date printed on the report
              separately.
            </p>
          </section>
          <section className="panel p-6 space-y-5">
            <h2 className="font-bold">Document Details</h2>
            <label className="label">
              Title *
              <input
                className="field"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="label">
              Category *
              <select
                className="field"
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              >
                {documentCategories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Report date *
              <input
                className="field"
                type="date"
                required
                max={today()}
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </label>
            <label className="label">
              Report type (optional)
              <input
                className="field"
                maxLength={100}
                placeholder="For example, X-ray, CT or MRI"
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
              />
            </label>
            <label className="label">
              Notes (optional)
              <textarea
                className="field min-h-24"
                maxLength={5000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={!file || !patient.data || busy}
            >
              <Upload size={16} />
              {busy ? 'Uploading…' : 'Upload and View Document'}
            </button>
          </section>
        </fieldset>
      </form>
    </div>
  );
}
