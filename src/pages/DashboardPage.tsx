import React from 'react';
import { Users, Files, UserPlus, Upload, ArrowRight } from 'lucide-react';
import { NavigationPage } from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { usePatientRecords } from '../context/PatientRecordContext';
import { useApiQuery } from '../hooks/useApiQuery';
import { PatientPage, DocumentPage, AuditPage } from '../api/types';
import { ErrorNotice, Loading } from '../components/common/ApiState';
import { dateLabel, initials, timestampLabel } from '../utils/display';

export function DashboardPage({
  onNavigate,
}: {
  onNavigate: (page: NavigationPage, patientId?: string, docId?: string) => void;
}) {
  const { currentUser } = useAuth();
  const { revision } = usePatientRecords();
  const patients = useApiQuery<PatientPage>('/patients?limit=5', revision);
  const documents = useApiQuery<DocumentPage>('/documents?limit=5', revision);
  const audit = useApiQuery<AuditPage>('/audit?limit=5', revision);
  return (
    <div className="page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Welcome, {currentUser!.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Your patient records at a glance.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => onNavigate('upload-doc')}>
            <Upload size={16} />
            Upload Document
          </button>
          <button className="btn-primary" onClick={() => onNavigate('register')}>
            <UserPlus size={16} />
            Register Patient
          </button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        {[
          { label: 'Registered Patients', value: patients.data?.total, icon: Users },
          { label: 'Stored Documents', value: documents.data?.total, icon: Files },
        ].map((metric) => (
          <div className="panel p-6 flex items-center justify-between" key={metric.label}>
            <div>
              <p className="text-xs uppercase font-semibold text-slate-400">{metric.label}</p>
              <p className="text-3xl font-black mt-2">{metric.value ?? '—'}</p>
            </div>
            <metric.icon className="text-blue-600 bg-blue-50 p-3 rounded-xl w-12 h-12" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="panel p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold">Recently Registered</h2>
            <button className="text-sm text-blue-600" onClick={() => onNavigate('patients')}>
              View All
            </button>
          </div>
          {patients.loading ? (
            <Loading />
          ) : patients.error ? (
            <ErrorNotice message={patients.error} onRetry={patients.reload} />
          ) : !patients.data?.patients.length ? (
            <p className="text-sm text-slate-500">No patients yet. Register your first patient.</p>
          ) : (
            patients.data.patients.map((patient) => (
              <button
                key={patient.id}
                className="w-full flex items-center gap-3 text-left py-3 border-t border-slate-100"
                onClick={() => onNavigate('record-detail', patient.id)}
              >
                <span className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center text-sm font-bold">
                  {initials(patient.name)}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{patient.name}</span>
                  <span className="block text-xs text-slate-400">{patient.id}</span>
                </span>
                <ArrowRight size={16} className="text-slate-400" />
              </button>
            ))
          )}
        </section>
        <section className="panel p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold">Latest Reports by Report Date</h2>
            <button className="text-sm text-blue-600" onClick={() => onNavigate('documents')}>
              View All
            </button>
          </div>
          {documents.loading ? (
            <Loading />
          ) : documents.error ? (
            <ErrorNotice message={documents.error} onRetry={documents.reload} />
          ) : !documents.data?.documents.length ? (
            <p className="text-sm text-slate-500">No documents uploaded yet.</p>
          ) : (
            documents.data.documents.map((document) => (
              <button
                key={document.id}
                className="w-full text-left py-3 border-t border-slate-100"
                onClick={() => onNavigate('doc-viewer', document.patientId, document.id)}
              >
                <span className="block font-semibold text-sm">{document.title}</span>
                <span className="block text-xs text-slate-400 mt-1">
                  {document.patientId} · {document.category} · {dateLabel(document.reportDate)}
                </span>
              </button>
            ))
          )}
        </section>
      </div>
      <section className="panel p-6">
        <div className="flex justify-between mb-4">
          <h2 className="font-bold">Recent Activity</h2>
          <button className="text-sm text-blue-600" onClick={() => onNavigate('audit')}>
            View Audit Logs
          </button>
        </div>
        {audit.loading ? (
          <Loading />
        ) : audit.error ? (
          <ErrorNotice message={audit.error} onRetry={audit.reload} />
        ) : (
          audit.data?.logs.map((event) => (
            <div
              key={event._id}
              className="flex flex-wrap justify-between gap-2 py-3 border-t border-slate-100 text-sm"
            >
              <span>
                {event.action.replace(/_/g, ' ')}{' '}
                <span className="text-slate-400">· {event.outcome}</span>
              </span>
              <span className="text-xs text-slate-400">{timestampLabel(event.occurredAt)}</span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
