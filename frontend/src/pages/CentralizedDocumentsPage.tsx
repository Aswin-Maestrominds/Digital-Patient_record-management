import { useApiQuery } from "../hooks/useApiQuery";

import { WorkspaceStats } from "../api/types";

import { MetricCards } from "../components/common/MetricCards";

import { ErrorNotice } from "../components/common/ApiState";

import React from "react";

import { Upload } from "lucide-react";

import { NavigationPage } from "../components/layout/Sidebar";

import { DocumentList } from "../components/common/DocumentList";

export function CentralizedDocumentsPage({
  onNavigate,
}: {
  onNavigate: (
    page: NavigationPage,
    patientId?: string,
    docId?: string,
  ) => void;
}) {
  const stats = useApiQuery<WorkspaceStats>("/workspace/stats");

  return (
    <div className="page">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="page-title">Medical Document Library</h1>

          <p className="text-sm text-slate-500 mt-1">
            Every document, organized around the patient.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => onNavigate("upload-doc")}
        >
          <Upload size={16} />
          Upload Document
        </button>
      </div>

      <ErrorNotice message={stats.error} onRetry={stats.reload} />
      <MetricCards
        items={[
          {
            label: "Total Documents",
            value: stats.data?.documents,
            description: "Across all patient records",
          },
          {
            label: "Recently Uploaded",
            value: stats.data?.recentDocuments,
            description: "In the last 7 days",
          },
          {
            label: "PDF Files",
            value: stats.data?.pdf,
            description: "Reports and clinical documents",
          },
          {
            label: "Image Files",
            value: stats.data?.images,
            description: "JPG, JPEG and PNG",
          },
        ]}
      />

      <DocumentList onNavigate={onNavigate} />
    </div>
  );
}
