import React from 'react';
import { Upload } from 'lucide-react';
import { NavigationPage } from '../components/layout/Sidebar';
import { DocumentList } from '../components/common/DocumentList';

export function CentralizedDocumentsPage({
  onNavigate,
}: {
  onNavigate: (page: NavigationPage, patientId?: string, docId?: string) => void;
}) {
  return (
    <div className="page">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
            Clinical Directory › Centralized Repository
          </p>
          <h1 className="page-title">All Medical Documents</h1>
          <p className="text-sm text-slate-500 mt-1">
            View and download reports organized by category and report date.
          </p>
        </div>
        <button className="btn-primary" onClick={() => onNavigate('upload-doc')}>
          <Upload size={16} />
          Upload Document
        </button>
      </div>
      <DocumentList onNavigate={onNavigate} />
    </div>
  );
}
