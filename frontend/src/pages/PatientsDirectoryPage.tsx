import React, { useState } from 'react';
import { Grid, List, UserPlus, Search, Phone, FileText, CreditCard } from 'lucide-react';
import { NavigationPage } from '../components/layout/Sidebar';
import { useApiQuery, useDebouncedValue } from '../hooks/useApiQuery';
import { PatientPage } from '../api/types';
import { queryString } from '../api/client';
import { usePatientRecords } from '../context/PatientRecordContext';
import { ageFromDob, dateLabel, initials } from '../utils/display';
import { EmptyState, ErrorNotice, Loading, Pagination } from '../components/common/ApiState';

export function PatientsDirectoryPage({
  onNavigate,
}: {
  onNavigate: (page: NavigationPage, patientId?: string) => void;
}) {
  const { revision, openDigitalCardModal } = usePatientRecords();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'grid' | 'table'>('grid');
  const term = useDebouncedValue(search.trim());
  const result = useApiQuery<PatientPage>(
    `/patients?${queryString({ search: term, page, limit: 20 })}`,
    revision,
  );
  const patients = result.data?.patients || [];
  return (
    <div className="page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
            Clinical Directory › Master Records
          </p>
          <h1 className="page-title">Patients Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Find a patient and open their complete record.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            aria-label="Cards view"
            aria-pressed={mode === 'grid'}
            onClick={() => setMode('grid')}
          >
            <Grid size={16} />
          </button>
          <button
            className="btn-secondary"
            aria-label="Table view"
            aria-pressed={mode === 'table'}
            onClick={() => setMode('table')}
          >
            <List size={16} />
          </button>
          <button className="btn-primary" onClick={() => onNavigate('register')}>
            <UserPlus size={16} />
            Register Patient
          </button>
        </div>
      </div>
      <div className="panel p-4 flex items-center gap-4">
        <Search className="text-slate-400 shrink-0" size={20} />
        <input
          className="field"
          aria-label="Search patient directory"
          placeholder="Search by name or Patient ID"
          maxLength={100}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <span className="text-sm text-slate-500 whitespace-nowrap">
          {result.data ? `${result.data.total} patients` : '…'}
        </span>
      </div>
      {result.loading || term !== search.trim() ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice message={result.error} onRetry={result.reload} />
      ) : !patients.length ? (
        <EmptyState>
          {search
            ? 'No patients match this search.'
            : 'No patients registered yet. Register your first patient to get started.'}
        </EmptyState>
      ) : (
        <>
          {mode === 'grid' ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {patients.map((patient) => (
                <article
                  key={patient.id}
                  className="panel overflow-hidden hover:border-blue-300 transition-colors"
                >
                  <button
                    className="p-5 text-left w-full hover:bg-blue-50/30"
                    aria-label={`Open record for ${patient.name}`}
                    onClick={() => onNavigate('record-detail', patient.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-11 h-11 shrink-0 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                        {initials(patient.name)}
                      </span>
                      <div className="min-w-0">
                        <h2 className="font-bold text-slate-900 truncate">{patient.name}</h2>
                        <p className="font-mono text-xs text-slate-400 mt-1">{patient.id}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 bg-slate-50 rounded-xl my-4 p-3 text-center text-sm">
                      <div>
                        <p className="text-[10px] uppercase text-slate-400">Age</p>
                        {ageFromDob(patient.dob)} years
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400">Gender</p>
                        {patient.gender}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400">Blood</p>
                        {patient.bloodGroup || '—'}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <Phone size={14} />
                      {patient.phone}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Registered {dateLabel(patient.createdAt)}
                    </p>
                    <p className="mt-3 rounded-lg bg-blue-50 p-2 text-xs font-semibold text-blue-700">
                      {patient.storedRecordsCount ?? 0} stored documents ·{' '}
                      {patient.status || 'Active'}
                    </p>
                  </button>
                  <div className="flex gap-2 p-3 bg-slate-50 border-t border-slate-100">
                    <button
                      className="btn-primary flex-1"
                      onClick={() => onNavigate('record-detail', patient.id)}
                    >
                      <FileText size={14} />
                      View Record
                    </button>
                    <button
                      className="btn-secondary"
                      aria-label={`Patient card for ${patient.name}`}
                      onClick={() => openDigitalCardModal(patient)}
                    >
                      <CreditCard size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                  <tr>
                    {['Patient', 'Patient ID', 'Phone', 'Documents', ''].map((title, i) => (
                      <th key={i} className="p-4">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id} className="border-t border-slate-100">
                      <td className="p-4 font-semibold">{patient.name}</td>
                      <td className="p-4 font-mono text-xs">{patient.id}</td>
                      <td className="p-4">{patient.phone}</td>
                      <td className="p-4">{patient.storedRecordsCount ?? 0}</td>
                      <td className="p-4">
                        <button
                          className="btn-secondary"
                          onClick={() => onNavigate('record-detail', patient.id)}
                        >
                          View Record
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} total={result.data!.total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
