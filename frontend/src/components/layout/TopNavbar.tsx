import React, { useEffect, useRef, useState } from "react";

import { Search, Menu, Bell, ChevronDown, X } from "lucide-react";

import { NavigationPage } from "./Sidebar";

import { useAuth } from "../../context/AuthContext";

import { useApiQuery, useDebouncedValue } from "../../hooks/useApiQuery";

import { queryString } from "../../api/client";

import { PatientPage, AuditPage } from "../../api/types";

import { initials } from "../../utils/display";

export function TopNavbar({
  onNavigate,

  currentPage,

  onToggleMobileMenu,
}: {
  currentPage: NavigationPage;

  onNavigate: (
    page: NavigationPage,
    patientId?: string,
    docId?: string,
  ) => void;

  onToggleMobileMenu?: () => void;
}) {
  const { currentUser } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = useApiQuery<AuditPage>(
    showNotifications ? "/account/notifications" : null,
  );

  const titles: Record<NavigationPage, string> = {
    dashboard: "Dashboard",
    patients: "Patients",
    register: "Register Patient",
    "record-detail": "Patient Profile",
    documents: "Medical Documents",
    "upload-doc": "Upload Document",
    "doc-viewer": "Document Viewer",
    audit: "Audit Logs",
    settings: "Settings",
    users: "User Management",
  };

  const title = titles[currentPage];

  const [search, setSearch] = useState("");

  const searchArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!searchArea.current?.contains(event.target as Node)) setSearch("");
    };

    document.addEventListener("pointerdown", dismiss);

    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  const term = useDebouncedValue(search.trim());

  const results = useApiQuery<PatientPage>(
    term ? `/patients?${queryString({ search: term, limit: 5 })}` : null,
  );

  return (
    <header className="h-[88px] bg-white border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 gap-4">
      <button
        aria-label="Open navigation menu"

        className="lg:hidden p-2"

        onClick={onToggleMobileMenu}
      >
        <Menu size={20} />
      </button>

      <div className="mr-auto shrink-0">
        <p className="text-xs text-slate-500">
          {["audit", "settings", "users"].includes(currentPage)
            ? "Administration"
            : "Workspace"}{" "}
          / {title}
        </p>
        <p className="text-base font-semibold">{title}</p>
      </div>

      <div
        ref={searchArea}

        role="search"

        aria-label="Patient search"

        className="relative hidden xl:block w-64"
      >
        <Search className="absolute left-3 top-3 text-slate-400" size={16} />

        <input
          aria-label="Search all patients"

          className="field pl-10 pr-10"

          placeholder="Search patients by name or Patient ID…"

          maxLength={100}

          value={search}

          onChange={(e) => setSearch(e.target.value)}

          onKeyDown={(e) => {
            if (e.key === "Escape") setSearch("");
          }}
        />

        {search && (
          <button
            className="absolute right-3 top-3"

            aria-label="Clear search"

            onClick={() => setSearch("")}
          >
            <X size={16} />
          </button>
        )}

        {search.trim() && (
          <div className="absolute top-full mt-2 left-0 right-0 panel p-2 shadow-xl max-h-80 overflow-auto">
            {term !== search.trim() || results.loading ? (
              <p className="p-3 text-sm">Searching…</p>
            ) : results.error ? (
              <p role="alert" className="p-3 text-sm text-rose-700">
                {results.error}
              </p>
            ) : !results.data?.patients.length ? (
              <p className="p-3 text-sm text-slate-500">
                No matching patients.
              </p>
            ) : (
              <>
                {results.data.patients.map((patient) => (
                  <button
                    key={patient.id}

                    className="w-full text-left p-3 rounded-lg hover:bg-blue-50"

                    onClick={() => {
                      setSearch("");

                      onNavigate("record-detail", patient.id);
                    }}
                  >
                    <span className="font-semibold text-sm">
                      {patient.name}
                    </span>

                    <span className="block text-xs font-mono text-slate-400">
                      {patient.id}
                    </span>
                  </button>
                ))}

                <p className="p-2 text-xs text-slate-500">
                  {results.data.total} matches. Use the patient directory to see
                  all results.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          className="p-2 text-slate-500"
          aria-label="Notifications"
          aria-expanded={showNotifications}
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell size={19} strokeWidth={1.4} />
        </button>
        {showNotifications && (
          <section className="absolute right-0 top-12 w-80 max-w-[85vw] panel p-4 shadow-lg">
            <h2 className="font-semibold mb-3">Notifications</h2>
            {notifications.loading ? (
              <p className="text-sm">Loading...</p>
            ) : notifications.error ? (
              <p className="text-sm text-rose-600">{notifications.error}</p>
            ) : !notifications.data?.logs.length ? (
              <p className="text-sm text-slate-500">No recent notifications.</p>
            ) : (
              notifications.data.logs.map((event) => (
                <div
                  className="py-3 border-t border-slate-100 text-sm"
                  key={event._id}
                >
                  <p>{event.action.replace(/_/g, " ").toLowerCase()}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {event.actorName} &middot; {event.patientId}
                  </p>
                </div>
              ))
            )}
          </section>
        )}
      </div>

      <button
        className="flex items-center gap-6 text-left"
        onClick={() => onNavigate("settings")}
        aria-label="Account settings"
      >
        <span className="avatar">
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            initials(currentUser!.name)
          )}
        </span>
        <ChevronDown size={14} className="text-slate-500" />
      </button>
    </header>
  );
}
