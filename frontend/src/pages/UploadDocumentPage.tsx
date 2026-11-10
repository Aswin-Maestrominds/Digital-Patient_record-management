import { useAuth } from "../context/AuthContext";

import { roleLabel } from "../api/types";

import { initials, ageFromDob } from "../utils/display";

import React, { useRef, useState } from "react";

import { Upload, FileText, X, Search } from "lucide-react";

import { NavigationPage } from "../components/layout/Sidebar";

import { usePatientRecords } from "../context/PatientRecordContext";

import { useApiQuery, useDebouncedValue } from "../hooks/useApiQuery";

import {
  Patient,
  PatientPage,
  DocumentCategory,
  documentCategories,
} from "../api/types";

import { errorMessage, queryString } from "../api/client";

import { ErrorNotice, Loading } from "../components/common/ApiState";

import { fileSize, today } from "../utils/display";

export function UploadDocumentPage({
  initialPatientId,

  onNavigate,
}: {
  initialPatientId?: string;

  onNavigate: (
    page: NavigationPage,
    patientId?: string,
    docId?: string,
  ) => void;
}) {
  const { currentUser } = useAuth();

  const { addDocument } = usePatientRecords();

  const [selectedId, setSelectedId] = useState(initialPatientId || "");

  const [search, setSearch] = useState("");

  const term = useDebouncedValue(search.trim());

  const choices = useApiQuery<PatientPage>(
    !selectedId
      ? `/patients?${queryString({ search: term, limit: 20 })}`
      : null,
  );

  const patient = useApiQuery<{ patient: Patient }>(
    selectedId ? `/patients/${encodeURIComponent(selectedId)}` : null,
  );

  const config = useApiQuery<{ maxFileSizeMb: number }>("/config");

  const [file, setFile] = useState<File | null>(null);

  const [title, setTitle] = useState("");

  const [category, setCategory] = useState<DocumentCategory>("Medical History");

  const [subType, setSubType] = useState("");

  const [reportDate, setReportDate] = useState("");

  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const fileInput = useRef<HTMLInputElement>(null);

  function chooseFile(chosen?: File) {
    setError("");

    if (!chosen) return;

    if (
      !/\.(pdf|jpe?g|png)$/i.test(chosen.name) ||
      !["application/pdf", "image/jpeg", "image/png"].includes(chosen.type)
    ) {
      setError("Choose a PDF, JPG or PNG file.");

      return;
    }

    if (config.data && chosen.size > config.data.maxFileSizeMb * 1024 * 1024) {
      setError(`The file must be ${config.data.maxFileSizeMb} MB or smaller.`);

      return;
    }

    setFile(chosen);

    if (!title) setTitle(chosen.name.replace(/\.[^.]+$/, "").slice(0, 200));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (busy) return;

    if (!file || !patient.data) {
      setError("Select a patient and a file before uploading.");

      return;
    }

    setBusy(true);

    setError("");

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

      onNavigate("doc-viewer", document.patientId, document.id);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div>
        <h1 className="page-title">Upload Document</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add a document to the correct patient's record.
        </p>
      </div>
      <ErrorNotice message={error} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-6">
          <section className="panel p-6 space-y-5">
            <h2 className="text-lg font-semibold">Patient</h2>
            {selectedId ? (
              patient.loading ? (
                <Loading />
              ) : patient.error ? (
                <>
                  <ErrorNotice
                    message={patient.error}
                    onRetry={patient.reload}
                  />
                  <button
                    className="btn-secondary"
                    onClick={() => setSelectedId("")}
                  >
                    Choose another patient
                  </button>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="label">Search and select patient *</span>
                    <button
                      className="text-sm text-blue-500"
                      disabled={busy}
                      onClick={() => setSelectedId("")}
                    >
                      Change Patient
                    </button>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-3">
                    <span className="avatar">
                      {initials(patient.data!.patient.name)}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">
                        {patient.data!.patient.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {ageFromDob(patient.data!.patient.dob)} years &middot;{" "}
                        {patient.data!.patient.gender}
                      </p>
                    </div>
                    <span className="text-xs text-blue-500">Selected</span>
                  </div>
                  <label className="label">
                    Patient ID
                    <input className="field" readOnly value={selectedId} />
                  </label>
                </>
              )
            ) : (
              <>
                <label className="label">
                  Search and select patient *
                  <input
                    className="field !bg-white"
                    placeholder="Search by name or Patient ID"
                    value={search}
                    maxLength={100}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                {choices.loading ? (
                  <Loading />
                ) : choices.error ? (
                  <ErrorNotice
                    message={choices.error}
                    onRetry={choices.reload}
                  />
                ) : (
                  <div className="max-h-60 overflow-auto space-y-2">
                    {choices.data?.patients.map((p) => (
                      <button
                        className="w-full text-left rounded-lg border border-slate-200 p-3 hover:bg-blue-50"
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                      >
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="block text-xs text-slate-500 mt-1">
                          {p.id}
                        </span>
                      </button>
                    ))}
                    {!choices.data?.patients.length && (
                      <p className="text-sm text-slate-500">
                        No patients found. Register a patient first.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
          <form onSubmit={submit} className="panel p-6">
            <fieldset disabled={busy} className="space-y-5">
              <h2 className="text-lg font-semibold">Document Details</h2>
              <input
                ref={fileInput}
                aria-label="Document file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={(e) => chooseFile(e.target.files?.[0])}
              />
              <div
                className="rounded-xl border border-dashed border-teal-400 bg-slate-50 py-7 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!busy) chooseFile(e.dataTransfer.files[0]);
                }}
              >
                <span className="inline-flex p-3 rounded-xl bg-blue-50 text-blue-500 mb-3">
                  <Upload size={24} />
                </span>
                <p className="font-medium">Drag and drop your file here</p>
                <p className="text-xs text-slate-500 my-3">
                  PDF, JPG, JPEG or PNG{" "}
                  {config.data
                    ? `- Maximum ${config.data.maxFileSizeMb} MB per file`
                    : ""}
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => fileInput.current?.click()}
                >
                  Browse Files
                </button>
              </div>
              {file && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-4">
                  <FileText className="text-blue-500" size={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {fileSize(file.size)} &middot; Ready to upload
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove selected file"
                    onClick={() => {
                      setFile(null);
                      if (fileInput.current) fileInput.current.value = "";
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
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
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="label">
                  Category *
                  <select
                    className="field"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as DocumentCategory)
                    }
                  >
                    {documentCategories.map((v) => (
                      <option key={v}>{v}</option>
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
              </div>
              <label className="label">
                Description (optional)
                <textarea
                  className="field min-h-24"
                  maxLength={5000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-500">
                  Additional details
                </summary>
                <label className="label mt-3">
                  Report type (optional)
                  <input
                    className="field"
                    maxLength={100}
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                  />
                </label>
              </details>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    onNavigate(
                      selectedId ? "record-detail" : "documents",
                      selectedId,
                    )
                  }
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!file || !patient.data || busy}
                >
                  <Upload size={16} />
                  {busy ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </fieldset>
          </form>
        </div>
        <aside className="space-y-6">
          <section className="panel p-6 space-y-5">
            <h2 className="text-lg font-semibold">Before you upload</h2>
            <p className="text-sm text-slate-500">
              Confirm the patient's name and ID before adding any file.
            </p>
            <div className="border-t border-slate-200 pt-5 space-y-5 text-[13px]">
              <p>Choose the category that best describes the document.</p>
              <p>Use the date printed on the report, not the upload date.</p>
              <p>Upload clear, complete pages without password protection.</p>
            </div>
          </section>
          <section className="panel p-6">
            <h2 className="text-lg font-semibold mb-5">Record destination</h2>
            <dl className="space-y-5 text-sm">
              <div>
                <dt className="text-xs text-slate-500 mb-1">Patient</dt>
                <dd>{patient.data?.patient.name ?? "Select a patient"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 mb-1">Patient ID</dt>
                <dd>{selectedId || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 mb-1">Uploaded by</dt>
                <dd>
                  {currentUser!.name} &middot; {roleLabel(currentUser!.role)}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
