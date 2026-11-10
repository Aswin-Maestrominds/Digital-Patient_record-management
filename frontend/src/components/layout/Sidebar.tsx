import React from "react";

import {
  LayoutDashboard,
  Users,
  Files,
  ClipboardList,
  Settings,
  LogOut,
  X,
  ChevronDown,
  UserRoundCog,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import { initials } from "../../utils/display";

import { roleLabel } from "../../api/types";

import logo from "../../assets/arvi-logo.png";

export type NavigationPage =
  | "dashboard"
  | "patients"
  | "register"
  | "record-detail"
  | "documents"
  | "upload-doc"
  | "doc-viewer"
  | "audit"
  | "settings"
  | "users";

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (
    page: NavigationPage,
    patientId?: string,
    docId?: string,
  ) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentUser, logout } = useAuth();

  const navigate = (page: NavigationPage) => {
    onNavigate(page);
    onCloseMobile?.();
  };

  const groups = [
    {
      label: "WORKSPACE",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "patients", label: "Patients", icon: Users },
        { id: "documents", label: "Medical Documents", icon: Files },
      ],
    },

    {
      label: "ADMINISTRATION",
      items: [
        { id: "users", label: "User Management", icon: UserRoundCog },
        { id: "audit", label: "Audit Logs", icon: ClipboardList },
        { id: "settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  const active = ["register", "record-detail"].includes(currentPage)
    ? "patients"
    : ["upload-doc", "doc-viewer"].includes(currentPage)
      ? "documents"
      : currentPage;

  const content = (
    <div className="arvi-sidebar">
      <div className="sidebar-brand">
        <img src={logo} alt="ARVI Healthcare Intelligence" />
        <button
          className="lg:hidden"
          aria-label="Close menu"
          onClick={onCloseMobile}
        >
          <X size={20} />
        </button>
      </div>

      <nav aria-label="Main navigation">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.items
              .filter(
                (item) =>
                  item.id !== "users" || currentUser?.role === "administrator",
              )
              .map((item) => (
                <button
                  key={item.id}
                  aria-current={active === item.id ? "page" : undefined}
                  className={`nav-link ${active === item.id ? "active" : ""}`}
                  onClick={() => navigate(item.id as NavigationPage)}
                >
                  <item.icon size={19} strokeWidth={1.6} />
                  {item.label}
                </button>
              ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-account">
        <button
          className="flex items-center gap-3 flex-1 text-left"
          onClick={() => navigate("settings")}
        >
          <span className="avatar">{initials(currentUser!.name)}</span>
          <span>
            <strong className="block text-[13px]">{currentUser!.name}</strong>
            <span className="text-xs text-slate-500">
              {roleLabel(currentUser?.role)}
            </span>
          </span>
          <ChevronDown size={14} className="ml-auto" />
        </button>
        <button
          className="logout-button"
          title="Sign out"
          aria-label="Sign out"
          onClick={() => void logout()}
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[240px] h-screen sticky top-0 shrink-0 z-30 border-r border-slate-200">
        {content}
      </aside>
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
          />
          <aside className="absolute inset-y-0 left-0 w-[260px] shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
