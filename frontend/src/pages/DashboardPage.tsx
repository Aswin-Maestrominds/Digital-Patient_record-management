import { Users, Files, UserPlus, FolderOpen, ArrowRight } from "lucide-react";

import { NavigationPage } from "../components/layout/Sidebar";

import { useAuth } from "../context/AuthContext";

import { usePatientRecords } from "../context/PatientRecordContext";

import { useApiQuery } from "../hooks/useApiQuery";

import { PatientPage, AuditPage, WorkspaceStats } from "../api/types";

import { ErrorNotice, Loading } from "../components/common/ApiState";

import { PatientCard } from "../components/common/PatientCard";

import { MetricCards } from "../components/common/MetricCards";

import { ActivityFeed } from "../components/common/ActivityFeed";

import { dateLabel, today } from "../utils/display";

export function DashboardPage({
  onNavigate,
}: {
  onNavigate: (
    page: NavigationPage,
    patientId?: string,
    docId?: string,
  ) => void;
}) {
  const { currentUser } = useAuth();
  const { revision } = usePatientRecords();

  const patients = useApiQuery<PatientPage>("/patients?limit=3", revision);
  const stats = useApiQuery<WorkspaceStats>("/workspace/stats", revision);
  const audit = useApiQuery<AuditPage>(
    "/audit?activityOnly=true&limit=4&outcome=success",
    revision,
  );

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: currentUser?.preferences?.timeZone ?? "Asia/Kolkata",
    }).format(new Date()),
  );

  return (
    <div className="page">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="page-title">
            Good {hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"},{" "}
            {currentUser!.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here's an overview of your patient records.
          </p>
        </div>
        <button className="btn-primary" onClick={() => onNavigate("register")}>
          + Register Patient
        </button>
      </div>
      <ErrorNotice message={stats.error} onRetry={stats.reload} />
      <MetricCards
        items={[
          {
            label: "Total Patients",
            value: stats.data?.patients,
            description: "Across your workspace",
            icon: Users,
          },
          {
            label: "Documents Stored",
            value: stats.data?.documents,
            description: "Organized patient records",
            icon: Files,
          },
          {
            label: "Recently Added",
            value: stats.data?.recentPatients,
            description: "Patients registered this week",
            icon: UserPlus,
          },
          {
            label: "Records Accessed Today",
            value: stats.data?.accessed,
            description: "By authorized team members",
            icon: FolderOpen,
          },
        ]}
      />
      <div className="flex justify-between items-center">
        <h2 className="section-heading">Recent Patients</h2>
        <button
          className="btn-secondary border-transparent"
          onClick={() => onNavigate("patients")}
        >
          <ArrowRight size={16} className="text-blue-500" />
          View all patients
        </button>
      </div>
      {patients.loading ? (
        <Loading />
      ) : patients.error ? (
        <ErrorNotice message={patients.error} onRetry={patients.reload} />
      ) : !patients.data?.patients.length ? (
        <div className="panel p-8 text-slate-500">
          No patients yet. Register your first patient.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {patients.data.patients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              recent
              onOpen={() => onNavigate("record-detail", patient.id)}
            />
          ))}
        </div>
      )}
      <section className="panel p-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <span className="badge">Today &middot; {dateLabel(today())}</span>
        </div>
        {audit.loading ? (
          <Loading />
        ) : audit.error ? (
          <ErrorNotice message={audit.error} onRetry={audit.reload} />
        ) : (
          <ActivityFeed logs={audit.data?.logs ?? []} />
        )}
      </section>
    </div>
  );
}
