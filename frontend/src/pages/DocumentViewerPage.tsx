import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { NavigationPage } from '../components/layout/Sidebar';
import { useApiQuery } from '../hooks/useApiQuery';
import { MedicalDocument } from '../api/types';
import { documentBlob, errorMessage } from '../api/client';
import { usePatientRecords } from '../context/PatientRecordContext';
import { ErrorNotice, Loading } from '../components/common/ApiState';
import { dateLabel, fileSize, timestampLabel } from '../utils/display';

export function DocumentViewerPage({
  docId,
  onNavigate,
}: {
  patientId: string;
  docId: string;
  onNavigate: (page: NavigationPage, patientId?: string, docId?: string) => void;
}) {
  const metadata = useApiQuery<{ document: MedicalDocument }>(
    `/documents/${encodeURIComponent(docId)}`,
  );
  const { downloadDocument } = usePatientRecords();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setUrl('');
    setLoading(true);
    setError('');
    setZoom(1);
    setRotation(0);
    documentBlob(docId, 'view', controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((error) => {
        if (!controller.signal.aborted && error.name !== 'AbortError')
          setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId, retry]);
  async function download() {
    if (!metadata.data || busy) return;
    setBusy(true);
    setError('');
    try {
      await downloadDocument(metadata.data.document);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (metadata.loading)
    return (
      <div className="page">
        <Loading text="Loading document…" />
      </div>
    );
  if (metadata.error)
    return (
      <div className="page">
        <ErrorNotice message={metadata.error} onRetry={metadata.reload} />
      </div>
    );
  const document = metadata.data!.document;
  return (
    <div className="page">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <button
            className="text-sm text-blue-600 flex items-center gap-2 mb-3"
            onClick={() => onNavigate('record-detail', document.patientId)}
          >
            <ArrowLeft size={16} />
            Back to Patient Record
          </button>
          <h1 className="page-title break-words">{document.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {document.category} · {document.patientId}
          </p>
        </div>
        <button className="btn-primary self-center" disabled={busy} onClick={() => void download()}>
          <Download size={16} />
          {busy ? 'Downloading…' : 'Download Original'}
        </button>
      </div>
      <ErrorNotice message={error} onRetry={() => setRetry((value) => value + 1)} />
      <div className="grid lg:grid-cols-12 gap-6">
        <section className="panel lg:col-span-8 overflow-hidden">
          {document.mimeType !== 'application/pdf' && (
            <div className="p-3 border-b border-slate-200 flex justify-end gap-2">
              <button
                className="btn-secondary"
                aria-label="Zoom out"
                onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
              >
                <ZoomOut size={16} />
              </button>
              <button
                className="btn-secondary"
                aria-label="Zoom in"
                onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
              >
                <ZoomIn size={16} />
              </button>
              <button
                className="btn-secondary"
                aria-label="Rotate image"
                onClick={() => setRotation((value) => value + 90)}
              >
                <RotateCw size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <Loading text="Opening original document…" />
          ) : (
            url && (
              <div className="bg-slate-100 min-h-96 overflow-auto flex items-center justify-center">
                {document.mimeType === 'application/pdf' ? (
                  <iframe
                    title="Medical document PDF"
                    src={url}
                    className="w-full h-[70vh] bg-white"
                  />
                ) : (
                  <img
                    src={url}
                    alt={document.title}
                    className="max-w-full max-h-[70vh] object-contain transition-transform"
                    style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                  />
                )}
              </div>
            )
          )}
          <p className="p-3 text-xs text-slate-500">
            If your browser cannot display this file, use Download Original.
          </p>
        </section>
        <aside className="panel lg:col-span-4 p-6 space-y-5">
          <h2 className="font-bold">Document Details</h2>
          {[
            ['Report date', dateLabel(document.reportDate)],
            ['Uploaded', timestampLabel(document.uploadedAt)],
            ['File name', document.originalName],
            ['Size', fileSize(document.sizeBytes)],
            ['Report type', document.subType || 'Not recorded'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-sm mt-1 break-words">{value}</p>
            </div>
          ))}
          {document.notes && (
            <div>
              <p className="text-xs text-slate-400">Notes</p>
              <p className="text-sm whitespace-pre-wrap mt-1">{document.notes}</p>
            </div>
          )}
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer">File checksum</summary>
            <p className="font-mono break-all mt-2">{document.sha256}</p>
          </details>
        </aside>
      </div>
    </div>
  );
}
