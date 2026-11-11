import { useAuth } from "../../context/AuthContext";

import { useDebouncedValue } from "../../hooks/useApiQuery";

import React, { useState } from "react";

import { Eye, Download, FileText, Trash2 } from "lucide-react";

import {
  DocumentPage,
  MedicalDocument,
  documentCategories,
} from "../../api/types";

import { queryString, errorMessage } from "../../api/client";

import { useApiQuery } from "../../hooks/useApiQuery";

import { usePatientRecords } from "../../context/PatientRecordContext";

import { NavigationPage } from "../layout/Sidebar";

import { ErrorNotice, Loading, EmptyState, Pagination } from "./ApiState";

import { dateLabel, fileSize } from "../../utils/display";

export function DocumentList({
  patientId,

  onNavigate,
}: {
  patientId?: string;

  onNavigate: (
    page: NavigationPage,

    patientId?: string,

    docId?: string,
  ) => void;
}) {
  const { revision, downloadDocument, deleteDocument } = usePatientRecords();

  const { currentUser } = useAuth();

  const [search, setSearch] = useState("");

  const [mimeType, setMimeType] = useState("");

  const [sort, setSort] = useState("uploaded");

  const term = useDebouncedValue(search);

  const [page, setPage] = useState(1);

  const [category, setCategory] = useState("");

  const [from, setFrom] = useState("");

  const [to, setTo] = useState("");

  const [busy, setBusy] = useState("");

  const [error, setError] = useState("");

  const invalidDates = !!from && !!to && from > to;

  const result = useApiQuery<DocumentPage>(
    invalidDates
      ? null
      : `/documents?${queryString({ patientId, category, search: term, mimeType, sort, from, to, page, limit: 6 })}`,

    revision,
  );

  async function download(document: MedicalDocument) {
    setBusy(document.id);

    setError("");

    try {
      await downloadDocument(document);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy("");
    }
  }

  async function remove(document: MedicalDocument) {
    if (
      !window.confirm(
        `Permanently delete "${document.title}" and its stored file? This cannot be undone.`,
      )
    )
      return;

    setBusy(document.id);

    setError("");

    try {
      await deleteDocument(document.id);

      setPage(1);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="space-y-4">
      <div className="panel p-4 space-y-4">
        <input
          className="field !bg-white"
          aria-label="Search documents"
          placeholder="Search document name, patient name or Patient ID..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="label">
            Document category
            <select
              className="field"

              value={category}

              onChange={(e) => {
                setCategory(e.target.value);

                setPage(1);
              }}
            >
              <option value="">All categories</option>

              {documentCategories.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>

          <label className="label">
            Report date from
            <input
              className="field"

              type="date"

              value={from}

              onChange={(e) => {
                setFrom(e.target.value);

                setPage(1);
              }}
            />
          </label>

          <label className="label">
            Report date to
            <input
              className="field"

              type="date"

              value={to}

              onChange={(e) => {
                setTo(e.target.value);

                setPage(1);
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4">
          <select
            className="field w-auto !bg-white"
            aria-label="File type"
            value={mimeType}
            onChange={(e) => {
              setMimeType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All file types</option>
            <option value="application/pdf">PDF</option>
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPEG</option>
          </select>
          <select
            className="field w-auto !bg-white"
            aria-label="Document sorting"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="uploaded">Recently uploaded</option>
            <option value="report">Document date</option>
          </select>
          <button
            className="text-sm text-blue-500"
            onClick={() => {
              setSearch("");
              setCategory("");
              setFrom("");
              setTo("");
              setMimeType("");
              setPage(1);
            }}
          >
            Clear filters
          </button>
          <span className="text-sm text-slate-500 ml-auto self-center">
            {result.data?.total ?? 0} documents
          </span>
        </div>
      </div>

      <ErrorNotice
        message={
          error ||
          (invalidDates ? "Start date must be on or before end date." : "")
        }
      />

      {!invalidDates &&
        (result.loading ? (
          <Loading text="Loading documents…" />
        ) : result.error ? (
          <ErrorNotice message={result.error} onRetry={result.reload} />
        ) : !result.data?.documents.length ? (
          <EmptyState>
            No documents found. Upload a report or change the filters.
          </EmptyState>
        ) : (
          <>
            <div className="panel overflow-x-auto">
              <table className="document-table block sm:table w-full text-left text-sm">
                <thead className="hidden sm:table-header-group bg-slate-50 text-xs text-slate-400 uppercase">
                  <tr>
                    {[
                      "Document",

                      ...(patientId ? [] : ["Patient", "Patient ID"]),

                      "Category",

                      "Report date",

                      "Uploaded",

                      "Type",

                      "Uploaded by",

                      "Actions",
                    ].map((title) => (
                      <th key={title} className="p-4 whitespace-nowrap">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="block sm:table-row-group">
                  {result.data.documents.map((document) => (
                    <tr
                      key={document.id}

                      className="grid grid-cols-2 sm:table-row border-t border-slate-100 hover:bg-slate-50/50"
                    >
                      <td className="p-4 col-span-2 sm:table-cell min-w-0">
                        <button
                          className="flex items-center gap-3 text-left"

                          onClick={() =>
                            onNavigate(
                              "doc-viewer",

                              document.patientId,

                              document.id,
                            )
                          }
                        >
                          <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                            <FileText size={20} />
                          </span>

                          <span>
                            <span className="block font-semibold text-slate-800 break-words">
                              {document.title}
                            </span>

                            <span className="block text-xs text-slate-400 mt-1">
                              {document.category} ·{" "}
                              {fileSize(document.sizeBytes)}
                            </span>
                          </span>
                        </button>
                      </td>

                      {!patientId && (
                        <td data-label="Patient" className="p-4">
                          {document.patientName ?? "Not recorded"}
                        </td>
                      )}

                      {!patientId && (
                        <td data-label="Patient ID" className="p-4 col-span-2 sm:table-cell">
                          <button
                            className="text-blue-600 font-mono text-xs"

                            onClick={() =>
                              onNavigate("record-detail", document.patientId)
                            }
                          >
                            {document.patientId}
                          </button>
                        </td>
                      )}

                      <td data-label="Category" className="p-4">{document.category}</td>

                      <td className="p-4 whitespace-nowrap">
                        <span className="block sm:hidden text-xs text-slate-400 mb-1">
                          Report date
                        </span>

                        {dateLabel(document.reportDate)}
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-500">
                        <span className="block sm:hidden text-xs text-slate-400 mb-1">
                          Uploaded
                        </span>

                        {dateLabel(document.uploadedAt)}
                      </td>

                      <td data-label="File type" className="p-4">
                        {document.mimeType === "application/pdf"
                          ? "PDF"
                          : document.mimeType === "image/png"
                            ? "PNG"
                            : "JPEG"}
                      </td>
                      <td data-label="Uploaded by" className="p-4">
                        {document.uploadedBy ?? "Not recorded"}
                      </td>

                      <td className="p-4 col-span-2 sm:table-cell">
                        <div className="flex gap-2">
                          <button
                            className="btn-secondary"

                            aria-label={`View ${document.title}`}

                            onClick={() =>
                              onNavigate(
                                "doc-viewer",

                                document.patientId,

                                document.id,
                              )
                            }
                          >
                            <Eye size={16} />
                          </button>

                          {currentUser?.role !== "staff" && (
                            <button
                              className="btn-secondary text-red-600"

                              disabled={!!busy}

                              aria-label={`Delete ${document.title}`}

                              onClick={() => void remove(document)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}

                          <button
                            className="btn-secondary"

                            disabled={!!busy}

                            aria-label={`Download ${document.title}`}

                            onClick={() => void download(document)}
                          >
                            <Download size={16} />

                            {busy === document.id ? "…" : ""}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              limit={6}

              page={page}

              total={result.data.total}

              onChange={setPage}
            />
          </>
        ))}
    </section>
  );
}
