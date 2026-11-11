import { useState } from "react";

import { Plus, Pencil, X, Users } from "lucide-react";

import { Doctor, roleLabel } from "../api/types";

import { useApiQuery, useDebouncedValue } from "../hooks/useApiQuery";

import { api, errorMessage, queryString } from "../api/client";

import {
  ErrorNotice,
  Loading,
  Pagination,
} from "../components/common/ApiState";

import { MetricCards } from "../components/common/MetricCards";

import { dateLabel, timestampLabel, initials } from "../utils/display";

interface WorkspaceUser extends Doctor {
  active: boolean;
  lastLogin?: string;
}

interface UserPage {
  users: WorkspaceUser[];
  total: number;
  stats: { total: number; active: number; roles: Record<string, number> };
}

export function UserManagementPage() {
  const [search, setSearch] = useState(""),
    [role, setRole] = useState(""),
    [active, setActive] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);

  const term = useDebouncedValue(search);

  const result = useApiQuery<UserPage>(
    `/users?${queryString({ search: term, role, active, page, limit: 6 })}`,
    revision,
  );

  const [editing, setEditing] = useState<WorkspaceUser | null | undefined>(
      undefined,
    ),
    [form, setForm] = useState({
      name: "",
      email: "",
      role: "staff",
      password: "",
      active: true,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");

  function open(user: WorkspaceUser | null) {
    setEditing(user);
    setForm({
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "staff",
      password: "",
      active: user?.active ?? true,
    });
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(editing ? `/users/${editing.id}` : "/users", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(
          editing
            ? {
                name: form.name,
                role: form.role,
                active: form.active,
                ...(form.password ? { password: form.password } : {}),
              }
            : {
                name: form.name,
                email: form.email,
                role: form.role,
                password: form.password,
              },
        ),
      });
      setEditing(undefined);
      setRevision((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage authorized access to your patient-record workspace.
          </p>
        </div>
        <button className="btn-primary" onClick={() => open(null)}>
          <Plus size={16} />
          Add User
        </button>
      </div>
      <MetricCards
        items={[
          {
            label: "Total Users",
            value: result.data?.stats.total,
            description: "Authorized workspace accounts",
            icon: Users,
          },
          {
            label: "Active Users",
            value: result.data?.stats.active,
            description: `${result.data ? result.data.stats.total - result.data.stats.active : "-"} accounts are inactive`,
          },
          {
            label: "Workspace roles",
            value: result.data
              ? `${result.data.stats.roles.administrator} Administrators`
              : "-",
            description: result.data
              ? `${result.data.stats.roles.doctor} Doctors / ${result.data.stats.roles.staff} Medical Staff`
              : "",
          },
        ]}
      />
      <div className="panel p-4 flex flex-wrap gap-4">
        <input
          aria-label="Search users"
          className="field flex-1 min-w-48"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter role"
          className="field w-auto"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          {["administrator", "doctor", "staff"].map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter status"
          className="field w-auto"
          value={active}
          onChange={(e) => {
            setActive(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button
          className="text-blue-500 text-sm"
          onClick={() => {
            setSearch("");
            setRole("");
            setActive("");
            setPage(1);
          }}
        >
          Clear filters
        </button>
      </div>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice message={result.error} onRetry={result.reload} />
      ) : (
        <>
          <div role="region" aria-label="Workspace users" tabIndex={0} className="table-scroll panel overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Name",
                    "Email",
                    "Role",
                    "Account Status",
                    "Last Login",
                    "Created Date",
                    "Actions",
                  ].map((t) => (
                    <th className="p-4" key={t}>
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data?.users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-200">
                    <td className="p-4">
                      <div className="flex gap-3 items-center whitespace-nowrap">
                        <span className="avatar">{initials(user.name)}</span>
                        {user.name}
                      </div>
                    </td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">{roleLabel(user.role)}</td>
                    <td className="p-4">
                      <span
                        className={`badge ${user.active ? "" : "!bg-slate-100 !text-slate-500"}`}
                      >
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.lastLogin
                        ? timestampLabel(user.lastLogin)
                        : "Never"}
                    </td>
                    <td className="p-4">
                      {user.createdAt ? dateLabel(user.createdAt) : "-"}
                    </td>
                    <td className="p-4">
                      <button
                        aria-label={`Edit ${user.name}`}
                        onClick={() => open(user)}
                      >
                        <Pencil size={17} className="text-blue-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            total={result.data?.total ?? 0}
            page={page}
            limit={6}
            onChange={setPage}
          />
        </>
      )}
      {editing !== undefined && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-5 flex items-center justify-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-dialog"
            className="panel p-6 w-full max-w-lg max-h-[90vh] overflow-auto"
          >
            <div className="flex justify-between mb-5">
              <h2 id="user-dialog" className="section-heading">
                {editing ? "Edit User" : "Add User"}
              </h2>
              <button
                aria-label="Close user form"
                onClick={() => setEditing(undefined)}
              >
                <X />
              </button>
            </div>
            <ErrorNotice message={error} />
            <form onSubmit={save} className="space-y-4">
              <label className="label">
                Name
                <input
                  autoFocus
                  className="field"
                  required
                  minLength={2}
                  maxLength={200}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="label">
                Email
                <input
                  className="field"
                  type="email"
                  required
                  disabled={!!editing}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="label">
                Role
                <select
                  className="field"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {["administrator", "doctor", "staff"].map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label">
                {editing ? "Reset password (optional)" : "Initial password"}
                <input
                  className="field"
                  type="password"
                  autoComplete="new-password"
                  required={!editing}
                  minLength={12}
                  maxLength={128}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
                <span className="text-xs text-slate-500">
                  At least 12 characters, a number and a symbol.
                </span>
              </label>
              {editing && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                  />
                  Active account
                </label>
              )}
              <button className="btn-primary w-full" disabled={busy}>
                {busy ? "Saving..." : "Save User"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
