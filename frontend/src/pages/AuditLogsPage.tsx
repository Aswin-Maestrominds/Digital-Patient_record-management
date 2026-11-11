import { roleLabel } from "../api/types";

import { activityLabel } from "../components/common/ActivityFeed";

import React, { useState } from "react";

import { NavigationPage } from "../components/layout/Sidebar";

import { useApiQuery, useDebouncedValue } from "../hooks/useApiQuery";

import { AuditPage } from "../api/types";

import { queryString } from "../api/client";

import { timestampLabel } from "../utils/display";

import {
  EmptyState,
  ErrorNotice,
  Loading,
  Pagination,
} from "../components/common/ApiState";

export function AuditLogsPage(_props: {
  onNavigate: (page: NavigationPage) => void;
}) {
  const [search, setSearch] = useState("");

  const [outcome, setOutcome] = useState("");

  const [from, setFrom] = useState("");

  const [to, setTo] = useState("");

  const term = useDebouncedValue(search);

  const [page, setPage] = useState(1);

  const [action, setAction] = useState("");

  const [patient, setPatient] = useState("");

  const patientId = useDebouncedValue(patient.trim());

  const validId = !patientId || /^PT-\d{4}-\d{3,}$/.test(patientId);

  const result = useApiQuery<AuditPage>(
    validId
      ? `/audit?${queryString({ page, limit: 8, action, patientId, search: term, outcome, from, to })}`
      : null,
  );

  return (
    <div className="page">
      <div>
        <h1 className="page-title">Audit Logs</h1>

        <p className="text-sm text-slate-500 mt-1">
          A traceable history of authorized access and changes.
        </p>
      </div>

      <div className="panel p-4 grid sm:grid-cols-3 gap-4">
        <label className="label">
          Search activity
          <input
            className="field"
            placeholder="Search user, patient ID or action..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>

        <label className="label">
          Action
          <select
            className="field"

            value={action}

            onChange={(e) => {
              setAction(e.target.value);

              setPage(1);
            }}
          >
            <option value="">All actions</option>

            {[
              "LOGIN",

              "LOGIN_FAILED",

              "LOGOUT",

              "PATIENT_CREATE",

              "PATIENT_UPDATE",

              "PATIENT_DELETE",

              "PATIENT_VIEW",

              "PATIENT_SEARCH",

              "DOCUMENT_UPLOAD",

              "DOCUMENT_VIEW",

              "DOCUMENT_DOWNLOAD",

              "DOCUMENT_DELETE",

              "ACCESS_DENIED",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>

        <label className="label">
          Patient ID
          <input
            className="field"

            value={patient}

            placeholder="PT-2026-001"

            onChange={(e) => {
              setPatient(e.target.value);

              setPage(1);
            }}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="label">
          From
          <input
            type="date"
            className="field w-auto"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="label">
          To
          <input
            type="date"
            className="field w-auto"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="label">
          Outcome
          <select
            className="field w-auto"
            value={outcome}
            onChange={(e) => {
              setOutcome(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All outcomes</option>
            <option value="success">Success</option>
            <option value="denied">Denied</option>
            <option value="attempt">Attempt</option>
          </select>
        </label>
      </div>

      {!validId ? (
        <ErrorNotice message="Enter a complete Patient ID, such as PT-2026-001." />
      ) : result.loading ? (
        <Loading text="Loading audit logs…" />
      ) : result.error ? (
        <ErrorNotice message={result.error} onRetry={result.reload} />
      ) : !result.data?.logs.length ? (
        <EmptyState>No audit events match these filters.</EmptyState>
      ) : (
        <>
          <div role="region" aria-label="Audit events" tabIndex={0} className="table-scroll panel overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
                <tr>
                  {[
                    "Timestamp",

                    "User",

                    "Role",

                    "Action",

                    "Patient / resource",

                    "Outcome",

                    "Request",
                  ].map((title) => (
                    <th className="p-4" key={title}>
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {result.data.logs.map((event) => (
                  <tr className="border-t border-slate-100" key={event._id}>
                    <td className="p-4 whitespace-nowrap">
                      {timestampLabel(event.occurredAt)}
                    </td>

                    <td className="p-4">{event.actorName ?? "Unknown user"}</td>
                    <td className="p-4">
                      {event.actorRole ? roleLabel(event.actorRole) : "-"}
                    </td>
                    <td className="p-4" title={event.action}>
                      {activityLabel(event.action)}
                    </td>

                    <td className="p-4 font-mono text-xs break-all">
                      {event.patientId || event.resourceId || "—"}
                    </td>

                    <td className="p-4">
                      <span
                        className={
                          event.outcome === "denied"
                            ? "text-rose-600"
                            : event.outcome === "success"
                              ? "text-emerald-700"
                              : "text-slate-500"
                        }
                      >
                        {event.outcome}
                      </span>
                    </td>

                    <td className="p-4">
                      <details>
                        <summary className="cursor-pointer text-blue-600">
                          Details
                        </summary>

                        <div className="text-xs break-all mt-2 space-y-1">
                          <p>Request: {event.requestId}</p>

                          <p>IP: {event.ipAddress || "—"}</p>

                          <p>Actor: {event.actorId || "Unauthenticated"}</p>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            limit={8}

            page={page}

            total={result.data.total}

            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
