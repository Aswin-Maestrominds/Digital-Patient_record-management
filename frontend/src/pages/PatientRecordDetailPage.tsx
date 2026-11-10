import { ActivityFeed } from "../components/common/ActivityFeed";

import { AuditPage, DocumentPage } from "../api/types";

import { useAuth } from "../context/AuthContext";

import React, { useState } from "react";

import { Upload, CreditCard, Pencil, ArrowLeft, Trash2 } from "lucide-react";

import { errorMessage } from "../api/client";

import { NavigationPage } from "../components/layout/Sidebar";

import { useApiQuery } from "../hooks/useApiQuery";

import { Patient } from "../api/types";

import { usePatientRecords } from "../context/PatientRecordContext";

import { DocumentList } from "../components/common/DocumentList";

import {
  ErrorNotice,
  Loading,
  Pagination,
} from "../components/common/ApiState";

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

  const { currentUser } = useAuth();

  const [activityPage, setActivityPage] = useState(1);
  const [activityType, setActivityType] = useState("");
  const [tab, setTab] = useState("overview");

  const documents = useApiQuery<DocumentPage>(
    `/documents?patientId=${encodeURIComponent(patientId)}&limit=3`,
    revision,
  );

  const activity = useApiQuery<AuditPage>(
    `/audit?activityOnly=true&patientId=${encodeURIComponent(patientId)}&limit=6&page=${activityPage}&action=${encodeURIComponent(activityType)}`,
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
    ["Full name", patient.name],
    ["Date of birth", dateLabel(patient.dob)],
    ["Phone number", patient.phone],
    ["Email address", patient.email],
    ["Gender", patient.gender],
    ["Age", `${ageFromDob(patient.dob)} years`],
  ];

  return (
    <div className="page">
      <div className="panel overflow-hidden">
        <div className="p-6 flex flex-wrap justify-between items-center gap-5">
          <div className="flex items-center gap-5">
            <span className="avatar !w-[72px] !h-[72px] !text-2xl">
              {initials(patient.name)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="page-title">{patient.name}</h1>
                <span className="badge">
                  {patient.status || "Active"} record
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                {patient.id} &nbsp; &middot; &nbsp; {ageFromDob(patient.dob)}{" "}
                years &nbsp; &middot; &nbsp; {patient.gender}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Registered {dateLabel(patient.createdAt)} &nbsp; &middot; &nbsp;
                Last updated {dateLabel(patient.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              <Pencil size={16} className="text-blue-500" />
              Edit Profile
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
        <div
          className="profile-tabs px-6 overflow-x-auto"
          role="tablist"
          aria-label="Patient record sections"
        >
          {[
            { id: "overview", label: "Overview" },
            {
              id: "documents",
              label: `Medical Documents (${patient.storedRecordsCount ?? 0})`,
            },
            { id: "activity", label: "Activity History" },
          ].map((item) => (
            <button
              role="tab"
              aria-selected={tab === item.id}
              className="whitespace-nowrap"
              key={item.id}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorNotice message={deleteError} />

      {tab === "overview" && (
        <>
          <div className="grid lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] gap-6 items-start">
            <div className="space-y-6">
              {" "}
              <section className="panel p-6 ">
                <h2 className="font-bold mb-4">
                  Personal &amp; Contact Information
                </h2>

                <dl className="grid sm:grid-cols-2 gap-5">
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

                <p className="text-xs text-slate-500 mb-1">Contact name</p>
                <p className="text-sm font-medium">
                  {patient.emergencyContact?.name || "Not recorded"}
                </p>

                <p className="text-sm text-slate-500 mt-2">
                  {patient.emergencyContact?.relationship}
                </p>

                <p className="text-sm mt-2">
                  {patient.emergencyContact?.phone}
                </p>
              </section>
              <section className="panel p-6 ">
                <div className="flex justify-between mb-5">
                  <h2 className="font-semibold text-lg">Recent Documents</h2>
                  <button
                    className="text-blue-500 text-sm"
                    onClick={() => setTab("documents")}
                  >
                    View all {patient.storedRecordsCount ?? 0}
                  </button>
                </div>
                {documents.loading ? (
                  <Loading />
                ) : documents.error ? (
                  <ErrorNotice
                    message={documents.error}
                    onRetry={documents.reload}
                  />
                ) : documents.data?.documents.length ? (
                  documents.data.documents.map((doc) => (
                    <button
                      key={doc.id}
                      className="block w-full py-3 text-left"
                      onClick={() =>
                        onNavigate("doc-viewer", patient.id, doc.id)
                      }
                    >
                      <p className="text-sm">{doc.originalName}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {doc.category} &middot; {dateLabel(doc.reportDate)}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No documents uploaded yet.
                  </p>
                )}
              </section>{" "}
              {(patient.notes ||
                patient.allergies?.length ||
                patient.chronicConditions?.length ||
                patient.insurance ||
                patient.vitals) && (
                <section className="panel p-6 space-y-4">
                  <h2 className="font-bold">Additional Information</h2>

                  {patient.notes && (
                    <p className="text-sm whitespace-pre-wrap">
                      {patient.notes}
                    </p>
                  )}

                  {!!patient.allergies?.length && (
                    <p className="text-sm">
                      Allergies: {patient.allergies.join(", ")}
                    </p>
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
            </div>
            <div className="space-y-6">
              <section className="panel p-6">
                <h2 className="font-semibold text-lg mb-4">Document Summary</h2>
                <p className="text-3xl font-semibold">
                  {patient.storedRecordsCount ?? 0}
                </p>
                <p className="text-sm text-slate-500 mt-2">Medical documents</p>
                <button
                  className="text-blue-500 text-sm mt-5"
                  onClick={() => setTab("documents")}
                >
                  Browse all documents
                </button>
                <div className="border-t border-slate-200 mt-5 pt-3 space-y-5">
                  {Object.entries(patient.categoryCounts ?? {}).map(
                    ([category, count]) => (
                      <div
                        className="flex justify-between text-[13px]"
                        key={category}
                      >
                        <span className="text-slate-500">{category}</span>
                        <span>{count}</span>
                      </div>
                    ),
                  )}
                </div>
              </section>
              <section className="panel p-6">
                <h2 className="font-semibold text-lg mb-3">Recent Activity</h2>
                {activity.loading ? (
                  <Loading />
                ) : activity.error ? (
                  <ErrorNotice message={activity.error} />
                ) : (
                  <ActivityFeed
                    compact
                    logs={activity.data?.logs.slice(0, 3) ?? []}
                  />
                )}
              </section>
            </div>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-slate-500">
              Record actions
            </summary>
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                className="btn-secondary"
                onClick={() => openDigitalCardModal(patient)}
              >
                <CreditCard size={16} />
                Patient Card
              </button>
              {currentUser?.role !== "staff" && (
                <button
                  className="btn-secondary text-red-600"
                  disabled={deleting}
                  onClick={() => void removePatient()}
                >
                  <Trash2 size={16} />
                  {deleting ? "Deleting..." : "Delete Patient"}
                </button>
              )}
            </div>
          </details>
        </>
      )}

      {tab === "documents" && (
        <section className="panel p-6 space-y-5">
          <div>
            <h2 className="section-heading">Medical Documents</h2>
            <p className="text-sm text-slate-500 mt-1">
              {patient.storedRecordsCount ?? 0} documents in {patient.name}'s
              record.
            </p>
          </div>
          <DocumentList
            key={patient.id}
            patientId={patient.id}
            onNavigate={onNavigate}
          />
        </section>
      )}

      {tab === "activity" && (
        <section className="panel p-6">
          <h2 className="section-heading">Activity History</h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            A chronological record of changes and authorized access.
          </p>
          {activity.loading ? (
            <Loading />
          ) : activity.error ? (
            <ErrorNotice message={activity.error} />
          ) : (
            <>
              <select
                aria-label="Activity type"
                className="field w-auto mb-4"
                value={activityType}
                onChange={(e) => {
                  setActivityType(e.target.value);
                  setActivityPage(1);
                }}
              >
                <option value="">All activity types</option>
                {[
                  "PATIENT_CREATE",
                  "PATIENT_UPDATE",
                  "PATIENT_VIEW",
                  "DOCUMENT_UPLOAD",
                  "DOCUMENT_VIEW",
                  "DOCUMENT_DOWNLOAD",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <ActivityFeed compact logs={activity.data?.logs ?? []} />
              <Pagination
                page={activityPage}
                total={activity.data?.total ?? 0}
                limit={6}
                onChange={setActivityPage}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}
