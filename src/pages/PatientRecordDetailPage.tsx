import React, { useState } from "react";
import { Upload, CreditCard, Pencil, ArrowLeft, Trash2 } from "lucide-react";
import { errorMessage } from "../api/client";
import { NavigationPage } from "../components/layout/Sidebar";
import { useApiQuery } from "../hooks/useApiQuery";
import { Patient } from "../api/types";
import { usePatientRecords } from "../context/PatientRecordContext";
import { DocumentList } from "../components/common/DocumentList";
import { ErrorNotice, Loading } from "../components/common/ApiState";
import { ageFromDob, initials, dateLabel } from "../utils/display";
import { PatientRegistrationPage } from "./PatientRegistrationPage";

export function PatientRecordDetailPage({
  patientId,
  onNavigate,
}: {
  patientId: string;
  onNavigate: (
    page: NavigationPage,
    patientId?: string,
    docId?: string,
  ) => void;
}) {
  const { revision, openDigitalCardModal, deletePatient } = usePatientRecords();
  const result = useApiQuery<{ patient: Patient }>(
    `/patients/${encodeURIComponent(patientId)}`,
    revision,
  );
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  async function removePatient() {
    if (
      !window.confirm(
        `Permanently delete ${result.data?.patient.name} (${patientId}) and ALL their documents? This cannot be undone. Audit logs will be retained.`,
      )
    )
      return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deletePatient(patientId);
      onNavigate("patients");
    } catch (error) {
      setDeleteError(
        `${errorMessage(error)} Deletion may be partially complete. Retry Delete Patient to finish cleanup.`,
      );
    } finally {
      setDeleting(false);
    }
  }
  if (result.loading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (result.error)
    return (
      <div className="page">
        <ErrorNotice message={result.error} onRetry={result.reload} />
        <button
          className="btn-secondary"
          onClick={() => onNavigate("patients")}
        >
          Back to patients
        </button>
      </div>
    );
  const patient = result.data!.patient;
  if (editing)
    return (
      <PatientRegistrationPage
        key={patient.id}
        patient={patient}
        onNavigate={onNavigate}
        onSaved={() => {
          setEditing(false);
          result.reload();
        }}
      />
    );
  const details = [
    ["Date of birth", dateLabel(patient.dob)],
    ["Phone", patient.phone],
    ["Email", patient.email],
    ["Blood group", patient.bloodGroup],
    ["National health ID", patient.nationalHealthId],
    ["Registered", dateLabel(patient.createdAt)],
  ];
  return (
    <div className="page">
      <button
        className="text-sm text-blue-600 flex items-center gap-2"
        onClick={() => onNavigate("patients")}
      >
        <ArrowLeft size={16} />
        Back to patients
      </button>
      <div className="panel p-6 flex flex-wrap justify-between gap-5">
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold">
            {initials(patient.name)}
          </div>
          <div>
            <h1 className="page-title">{patient.name}</h1>
            <p className="text-blue-600 text-sm font-mono mt-1">{patient.id}</p>
            <p className="text-sm text-slate-500 mt-1">
              {ageFromDob(patient.dob)} years · {patient.gender} ·{" "}
              {patient.status || "Active"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn-secondary text-red-600"
            disabled={deleting}
            onClick={() => void removePatient()}
          >
            <Trash2 size={16} />
            {deleting ? "Deleting..." : "Delete Patient"}
          </button>
          <button className="btn-secondary" onClick={() => setEditing(true)}>
            <Pencil size={16} />
            Edit Profile
          </button>
          <button
            className="btn-secondary"
            onClick={() => openDigitalCardModal(patient)}
          >
            <CreditCard size={16} />
            Patient Card
          </button>
          <button
            className="btn-primary"
            onClick={() => onNavigate("upload-doc", patient.id)}
          >
            <Upload size={16} />
            Upload Document
          </button>
        </div>
      </div>
      <ErrorNotice message={deleteError} />
      <div className="grid lg:grid-cols-3 gap-6">
        <section className="panel p-6 lg:col-span-2">
          <h2 className="font-bold mb-4">Patient Details</h2>
          <dl className="grid sm:grid-cols-3 gap-5">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="text-sm font-medium mt-1 break-words">
                  {value || "Not recorded"}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-400 mt-5">Address</p>
          <p className="text-sm mt-1">
            {Object.values(patient.address || {})
              .filter(Boolean)
              .join(", ") || "Not recorded"}
          </p>
        </section>
        <section className="panel p-6">
          <h2 className="font-bold mb-4">Emergency Contact</h2>
          <p className="text-sm font-medium">
            {patient.emergencyContact?.name || "Not recorded"}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            {patient.emergencyContact?.relationship}
          </p>
          <p className="text-sm mt-2">{patient.emergencyContact?.phone}</p>
        </section>
      </div>
      {(patient.notes ||
        patient.allergies?.length ||
        patient.chronicConditions?.length ||
        patient.insurance ||
        patient.vitals) && (
        <section className="panel p-6 space-y-4">
          <h2 className="font-bold">Additional Information</h2>
          {patient.notes && (
            <p className="text-sm whitespace-pre-wrap">{patient.notes}</p>
          )}
          {!!patient.allergies?.length && (
            <p className="text-sm">Allergies: {patient.allergies.join(", ")}</p>
          )}
          {!!patient.chronicConditions?.length && (
            <p className="text-sm">
              Chronic conditions: {patient.chronicConditions.join(", ")}
            </p>
          )}
          {patient.insurance &&
            Object.values(patient.insurance).some(Boolean) && (
              <div className="text-sm">
                <h3 className="font-semibold">Insurance</h3>
                {Object.entries(patient.insurance).map(
                  ([key, value]) =>
                    value && (
                      <p key={key}>
                        {key}: {value}
                      </p>
                    ),
                )}
              </div>
            )}
          {patient.vitals &&
            Object.values(patient.vitals).some(
              (value) => value !== undefined,
            ) && (
              <div className="text-sm">
                <h3 className="font-semibold">Recorded vitals</h3>
                {Object.entries(patient.vitals).map(([key, value]) => (
                  <p key={key}>
                    {key}: {value}
                  </p>
                ))}
              </div>
            )}
        </section>
      )}
      <div className="flex justify-between">
        <h2 className="text-lg font-bold">Medical Documents</h2>
        <span className="text-sm text-slate-500">
          {patient.storedRecordsCount ?? 0} files
        </span>
      </div>
      <DocumentList
        key={patient.id}
        patientId={patient.id}
        onNavigate={onNavigate}
      />
    </div>
  );
}
