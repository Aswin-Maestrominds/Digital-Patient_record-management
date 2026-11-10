import { PatientCard } from "../components/common/PatientCard";

import { useAuth } from "../context/AuthContext";

import React, { useState } from "react";

import {
  Grid,
  List,
  UserPlus,
  Search,
  Phone,
  FileText,
  CreditCard,
} from "lucide-react";

import { NavigationPage } from "../components/layout/Sidebar";

import { useApiQuery, useDebouncedValue } from "../hooks/useApiQuery";

import { PatientPage } from "../api/types";

import { queryString } from "../api/client";

import { usePatientRecords } from "../context/PatientRecordContext";

import { ageFromDob, dateLabel, initials } from "../utils/display";

import {
  EmptyState,
  ErrorNotice,
  Loading,
  Pagination,
} from "../components/common/ApiState";

export function PatientsDirectoryPage({
  onNavigate,
}: {
  onNavigate: (page: NavigationPage, patientId?: string) => void;
}) {
  const { revision } = usePatientRecords();

  const { currentUser } = useAuth();

  const [gender, setGender] = useState("");

  const [from, setFrom] = useState("");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [mode, setMode] = useState<"grid" | "table">(
    currentUser?.preferences?.directoryView ?? "grid",
  );

  const term = useDebouncedValue(search.trim());

  const result = useApiQuery<PatientPage>(
    `/patients?${queryString({ search: term, gender, from, page, limit: 6 })}`,

    revision,
  );

  const patients = result.data?.patients || [];

  return (
    <div className="page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Patient Directory</h1>

          <p className="text-sm text-slate-500 mt-1">
            A clear, organized view of every patient record.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="btn-secondary"

            aria-label="Cards view"

            aria-pressed={mode === "grid"}

            onClick={() => setMode("grid")}
          >
            <Grid size={16} />
          </button>

          <button
            className="btn-secondary"

            aria-label="Table view"

            aria-pressed={mode === "table"}

            onClick={() => setMode("table")}
          >
            <List size={16} />
          </button>

          <button
            className="btn-primary"
            onClick={() => onNavigate("register")}
          >
            <UserPlus size={16} />
            Register Patient
          </button>
        </div>
      </div>

      <div className="panel p-4 flex flex-wrap items-center gap-4">
        <Search className="text-slate-400 shrink-0" size={20} />

        <input
          className="field flex-1 min-w-48"

          aria-label="Search patient directory"

          placeholder="Search by name or Patient ID"

          maxLength={100}

          value={search}

          onChange={(e) => {
            setSearch(e.target.value);

            setPage(1);
          }}
        />

        <select
          aria-label="Gender filter"
          className="field w-auto"
          value={gender}
          onChange={(e) => {
            setGender(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All genders</option>
          {["Male", "Female", "Other"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <input
          aria-label="Registered since"
          type="date"
          className="field w-auto"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <button
          className="text-blue-500 text-sm"
          onClick={() => {
            setSearch("");
            setGender("");
            setFrom("");
            setPage(1);
          }}
        >
          Clear filters
        </button>

        <span className="text-sm text-slate-500 whitespace-nowrap">
          {result.data ? `${result.data.total} patients` : "…"}
        </span>
      </div>

      {result.loading || term !== search.trim() ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice message={result.error} onRetry={result.reload} />
      ) : !patients.length ? (
        <EmptyState>
          {search
            ? "No patients match this search."
            : "No patients registered yet. Register your first patient to get started."}
        </EmptyState>
      ) : (
        <>
          {mode === "grid" ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {patients.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  onOpen={() => onNavigate("record-detail", patient.id)}
                />
              ))}
            </div>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                  <tr>
                    {["Patient", "Patient ID", "Phone", "Documents", ""].map(
                      (title, i) => (
                        <th key={i} className="p-4">
                          {title}
                        </th>
                      ),
                    )}
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

                          onClick={() =>
                            onNavigate("record-detail", patient.id)
                          }
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

          <Pagination
            limit={6}
            page={page}
            total={result.data!.total}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
