import React, { useState } from "react";

import { Monitor, LogOut } from "lucide-react";

import { useAuth } from "../context/AuthContext";

import { NavigationPage } from "../components/layout/Sidebar";

import { api, errorMessage } from "../api/client";

import { Doctor, Preferences, roleLabel } from "../api/types";

import { useApiQuery } from "../hooks/useApiQuery";

import { ErrorNotice, Loading } from "../components/common/ApiState";

import { dateLabel, initials, timestampLabel } from "../utils/display";

interface AccountSession {
  id: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>
        {label}
        <small>{description}</small>
      </span>
      <input
        className="toggle"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function device(agent: string) {
  const browser = agent.includes("Edg/")
    ? "Edge"
    : agent.includes("Firefox/")
      ? "Firefox"
      : agent.includes("Chrome/")
        ? "Chrome"
        : agent.includes("Safari/")
          ? "Safari"
          : "Browser";
  return `${browser} on ${agent.includes("Windows") ? "Windows" : agent.includes("Android") ? "Android" : agent.includes("Mac") ? "macOS" : agent.includes("Linux") ? "Linux" : "this device"}`;
}

export function SettingsSecurityPage(_props: {
  onNavigate: (page: NavigationPage) => void;
}) {
  const { currentUser, updateUser, logout } = useAuth();
  const user = currentUser!;

  const [firstName, setFirstName] = useState(
    user.name.split(" ").slice(0, -1).join(" ") || user.name,
  );
  const [lastName, setLastName] = useState(
    user.name.includes(" ") ? user.name.split(" ").slice(-1).join("") : "",
  );
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    avatar: user.avatar ?? "",
  });

  const [prefs, setPrefs] = useState<Preferences>({
    inactivityMinutes: 30,
    signInAlerts: true,
    language: "English",
    timeZone: "Asia/Kolkata",
    dateFormat: "DD MMM YYYY",
    directoryView: "grid",
    registrations: true,
    uploads: true,
    changes: true,
    ...user.preferences,
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });

  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);

  const [twoStep, setTwoStep] = useState(false),
    [secret, setSecret] = useState(""),
    [securityPassword, setSecurityPassword] = useState(""),
    [code, setCode] = useState("");

  const sessions = useApiQuery<{ sessions: AccountSession[] }>(
    "/account/sessions",
    revision,
  );

  async function run(work: () => Promise<void>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setNotice(message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePrefs(keys: (keyof Preferences)[]) {
    await run(async () => {
      const result = await api<{ user: Doctor }>("/account/preferences", {
        method: "PATCH",
        body: JSON.stringify(
          Object.fromEntries(keys.map((k) => [k, prefs[k]])),
        ),
      });
      updateUser(result.user);
    }, "Preferences saved.");
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      const result = await api<{ user: Doctor }>("/account/profile", {
        method: "PATCH",
        body: JSON.stringify({
          ...profile,
          name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" "),
        }),
      });
      updateUser(result.user);
    }, "Profile saved.");
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      if (passwords.newPassword !== passwords.confirm)
        throw new Error("New passwords do not match.");
      await api("/account/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
      setRevision((v) => v + 1);
    }, "Password updated. Other sessions have been signed out.");
  }

  async function photo(file?: File) {
    if (!file) return;
    setError("");
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 100000
    ) {
      setError("Choose a PNG, JPEG or WebP photo smaller than 100 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setProfile((p) => ({ ...p, avatar: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  async function security(e: React.FormEvent) {
    e.preventDefault();
    await run(
      async () => {
        if (user.totpEnabled) {
          await api("/account/two-step/disable", {
            method: "POST",
            body: JSON.stringify({ password: securityPassword, code }),
          });
          updateUser({ ...user, totpEnabled: false });
          setTwoStep(false);
        } else if (!secret) {
          const result = await api<{ secret: string }>(
            "/account/two-step/setup",
            {
              method: "POST",
              body: JSON.stringify({ password: securityPassword }),
            },
          );
          setSecret(result.secret);
        } else {
          await api("/account/two-step/enable", {
            method: "POST",
            body: JSON.stringify({ code }),
          });
          updateUser({ ...user, totpEnabled: true });
          setTwoStep(false);
          setSecret("");
          setRevision((v) => v + 1);
        }
        setSecurityPassword("");
        setCode("");
      },
      user.totpEnabled
        ? "Two-step verification disabled."
        : secret
          ? "Two-step verification enabled."
          : "Enter this setup key in your authenticator, then verify its code.",
    );
  }

  return (
    <div className="page">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your profile, security and workspace preferences.
        </p>
      </div>
      <ErrorNotice message={error} />
      {notice && (
        <p role="status" className="panel p-4 text-sm text-blue-700">
          {notice}
        </p>
      )}
      <fieldset disabled={busy} className="settings-grid">
        <section className="panel">
          <h2>My Profile</h2>
          <div className="settings-profile-identity flex flex-wrap items-center gap-3 mb-7">
            <span className="avatar !w-14 !h-14 !text-xl">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                initials(user.name)
              )}
            </span>
            <div className="flex-1">
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                {roleLabel(user.role)}
                {user.createdAt
                  ? ` - Member since ${dateLabel(user.createdAt)}`
                  : ""}
              </p>
            </div>
            <label className="btn-secondary cursor-pointer">
              Change Photo
              <input
                aria-label="Change profile photo"
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => void photo(e.target.files?.[0])}
              />
            </label>
          </div>
          <form onSubmit={saveProfile} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="label">
                First Name
                <input
                  className="field !bg-white"
                  required
                  maxLength={100}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>
              <label className="label">
                Last Name
                <input
                  className="field !bg-white"
                  maxLength={100}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
            </div>
            <label className="label">
              Email Address
              <input
                type="email"
                className="field !bg-white"
                value={profile.email}
                required
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
              />
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="label">
                Phone Number
                <input
                  type="tel"
                  className="field !bg-white"
                  maxLength={20}
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                />
              </label>
              <label className="label">
                Role
                <input
                  className="field"
                  value={roleLabel(user.role)}
                  readOnly
                />
              </label>
            </div>
            <div className="text-right">
              <button className="btn-primary">Save Profile</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>Change Password</h2>
          <p className="text-sm text-slate-500 mb-5">
            Choose a strong password you don't use for other accounts.
          </p>
          <form onSubmit={savePassword} className="space-y-5">
            {(["currentPassword", "newPassword", "confirm"] as const).map(
              (key) => (
                <label className="label" key={key}>
                  {key === "currentPassword"
                    ? "Current Password"
                    : key === "newPassword"
                      ? "New Password"
                      : "Confirm New Password"}
                  <input
                    className="field !bg-white"
                    type="password"
                    required
                    minLength={key === "currentPassword" ? 1 : 12}
                    maxLength={128}
                    autoComplete={
                      key === "currentPassword"
                        ? "current-password"
                        : "new-password"
                    }
                    value={passwords[key]}
                    onChange={(e) =>
                      setPasswords({ ...passwords, [key]: e.target.value })
                    }
                  />
                  {key === "newPassword" && (
                    <span className="text-xs text-slate-500">
                      Use at least 12 characters, a number and a symbol.
                    </span>
                  )}
                </label>
              ),
            )}
            <div className="text-right">
              <button className="btn-primary">Update Password</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>Account Security</h2>
          <Toggle
            label="Two-step verification"
            description="Require an authenticator code at sign-in."
            checked={!!user.totpEnabled}
            onChange={() => {
              setTwoStep(!twoStep);
              setSecret("");
              setCode("");
            }}
          />
          {twoStep && (
            <form
              className="p-4 bg-slate-50 rounded-lg space-y-3"
              onSubmit={security}
            >
              {(!secret || user.totpEnabled) && (
                <label className="label">
                  Current password
                  <input
                    className="field"
                    type="password"
                    required
                    value={securityPassword}
                    onChange={(e) => setSecurityPassword(e.target.value)}
                  />
                </label>
              )}
              {secret && (
                <div className="text-sm">
                  <p>
                    Add an account in your authenticator using this setup key:
                  </p>
                  <code className="block break-all p-3 bg-white my-2">
                    {secret}
                  </code>
                  <p className="text-xs text-slate-500">
                    Time-based, 6 digits, 30 seconds. Keep this key in a secure
                    place for recovery.
                  </p>
                </div>
              )}
              {(secret || user.totpEnabled) && (
                <label className="label">
                  Authenticator code
                  <input
                    className="field"
                    inputMode="numeric"
                    required
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
              )}
              <button className="btn-secondary">
                {user.totpEnabled
                  ? "Disable two-step verification"
                  : secret
                    ? "Verify and enable"
                    : "Set up authenticator"}
              </button>
            </form>
          )}
          <div className="border-t border-slate-200">
            <Toggle
              label="New sign-in alerts"
              description="Show recent sign-ins in your notifications."
              checked={prefs.signInAlerts}
              onChange={(v) => setPrefs({ ...prefs, signInAlerts: v })}
            />
          </div>
          <label className="label border-t border-slate-200 pt-5">
            Automatic sign-out after inactivity
            <select
              className="field !bg-white"
              value={prefs.inactivityMinutes}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  inactivityMinutes: Number(e.target.value),
                })
              }
            >
              {[15, 30, 60].map((n) => (
                <option key={n} value={n}>
                  {n} minutes
                </option>
              ))}
            </select>
          </label>
          <div className="text-right mt-6">
            <button
              className="btn-primary"
              onClick={() =>
                void savePrefs(["inactivityMinutes", "signInAlerts"])
              }
            >
              Save Security Preferences
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>Session Management</h2>
          <p className="text-sm text-slate-500 mb-4">
            Active sessions for this account.
          </p>
          {sessions.loading ? (
            <Loading />
          ) : sessions.error ? (
            <ErrorNotice message={sessions.error} onRetry={sessions.reload} />
          ) : (
            sessions.data?.sessions.map((session) => (
              <div className="py-5 border-b border-slate-200" key={session.id}>
                <div className="flex gap-3">
                  <Monitor className="text-blue-500" size={22} />
                  <div>
                    <p className="text-sm">{device(session.userAgent)}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {timestampLabel(session.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="badge inline-block mt-3">
                  {session.current ? "Current session" : "Other session"}
                </span>
              </div>
            ))
          )}
          <button
            className="btn-secondary w-full mt-5"
            onClick={() =>
              void run(async () => {
                await api("/account/sessions", { method: "DELETE" });
                setRevision((v) => v + 1);
              }, "Other sessions signed out.")
            }
          >
            Sign Out Other Sessions
          </button>
        </section>

        <section className="panel">
          <h2>Application Preferences</h2>
          <div className="space-y-5">
            <label className="label">
              Language
              <select
                className="field !bg-white"
                value={prefs.language}
                onChange={(e) =>
                  setPrefs({ ...prefs, language: e.target.value })
                }
              >
                <option>English</option>
              </select>
            </label>
            <label className="label">
              Time Zone
              <select
                className="field !bg-white"
                value={prefs.timeZone}
                onChange={(e) =>
                  setPrefs({ ...prefs, timeZone: e.target.value })
                }
              >
                {[
                  "Asia/Kolkata",
                  "UTC",
                  "America/New_York",
                  "Europe/London",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Date Format
              <select
                className="field !bg-white"
                value={prefs.dateFormat}
                onChange={(e) =>
                  setPrefs({ ...prefs, dateFormat: e.target.value })
                }
              >
                {["DD MMM YYYY", "YYYY-MM-DD", "MM/DD/YYYY"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Default Patient Directory View
              <select
                className="field !bg-white"
                value={prefs.directoryView}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    directoryView: e.target.value as "grid" | "table",
                  })
                }
              >
                <option value="grid">Grid view</option>
                <option value="table">Table view</option>
              </select>
            </label>
            <div className="text-right">
              <button
                className="btn-primary"
                onClick={() =>
                  void savePrefs([
                    "language",
                    "timeZone",
                    "dateFormat",
                    "directoryView",
                  ])
                }
              >
                Save Preferences
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>Notification Preferences</h2>
          {(
            [
              {
                key: "registrations",
                label: "New patient registrations",
                description: "Updates when a new patient record is created.",
              },
              {
                key: "uploads",
                label: "Document uploads",
                description: "Updates when a document is added to a record.",
              },
              {
                key: "changes",
                label: "Record changes",
                description: "Updates when patient information is edited.",
              },
            ] as const
          ).map((item) => (
            <div className="border-b border-slate-200" key={item.key}>
              <Toggle
                label={item.label}
                description={item.description}
                checked={prefs[item.key]}
                onChange={(v) => setPrefs({ ...prefs, [item.key]: v })}
              />
            </div>
          ))}
          <p className="text-sm mt-5">Email notifications</p>
          <p className="text-xs text-slate-500 mt-2">
            Email delivery is not configured. Notifications appear in the
            workspace.
          </p>
          <div className="text-right mt-6">
            <button
              className="btn-primary"
              onClick={() =>
                void savePrefs(["registrations", "uploads", "changes"])
              }
            >
              Save Notifications
            </button>
          </div>
        </section>
      </fieldset>
      <button className="btn-secondary" onClick={() => void logout()}>
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  );
}
