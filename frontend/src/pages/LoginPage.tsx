import React, { useState } from "react";

import logo from "../assets/arvi-logo.png";

import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  FileText,
  Users,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

import { errorMessage } from "../api/client";

import { ErrorNotice } from "../components/common/ApiState";

export function LoginPage() {
  const { login, error: sessionError, retrySession } = useAuth();

  const [code, setCode] = useState("");

  const [needsCode, setNeedsCode] = useState(false);

  const [remember, setRemember] = useState(false);

  const [recovery, setRecovery] = useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);

    setError("");

    try {
      await login(email, password, code, remember);
    } catch (error) {
      setError(errorMessage(error));

      if (errorMessage(error).toLowerCase().includes("authenticator"))
        setNeedsCode(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-layout">
      <aside className="login-story">
        <div className="login-story-logo">
          <img src={logo} alt="ARVI Healthcare Intelligence" />
        </div>
        <div className="flex gap-1.5 mb-5">
          <span className="h-1 w-12 bg-teal-400 rounded" />
          <span className="h-1 w-6 bg-emerald-300 rounded" />
        </div>
        <h1 className="text-[32px] font-semibold leading-tight">
          Patient records.
          <br />
          One clear workspace.
        </h1>
        <p className="text-sm text-slate-300 mt-5 mb-10">
          A focused record-management workspace for hospitals, clinics and
          authorized care teams.
        </p>
        <div className="space-y-6">
          {[
            {
              icon: Users,
              title: "Patient records",
              description: "Organized around each patient.",
            },
            {
              icon: FileText,
              title: "Medical documents",
              description: "Clinical files, clearly categorized.",
            },
            {
              icon: ShieldCheck,
              title: "Access accountability",
              description: "Role-aware records and activity history.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 items-center">
              <item.icon
                size={21}
                className="text-teal-400"
                strokeWidth={1.5}
              />
              <div className="text-sm">
                {item.title}
                <p className="text-xs text-slate-300 mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="login-form">
        <p className="text-xs text-blue-500 font-semibold mb-2">
          ARVI HEALTHCARE INTELLIGENCE
        </p>
        <h2 className="text-[32px] font-semibold">Welcome back</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Sign in to your clinical workspace.
        </p>
        <ErrorNotice
          message={error || sessionError}
          onRetry={sessionError && !error ? retrySession : undefined}
        />
        <form onSubmit={submit} className="space-y-6">
          <label className="label">
            Email Address
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-3.5 text-slate-500"
              />
              <input
                className="field pl-9"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </label>
          <label className="label">
            Password
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-3.5 text-slate-500"
              />
              <input
                className="field pl-10 pr-12"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="absolute right-3 top-3 text-slate-400"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </label>

          {needsCode && (
            <label className="label">
              Authenticator code
              <input
                className="field"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
          )}

          <div className="flex justify-between text-[13px]">
            <label className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-blue-600"
              />
              Remember me
            </label>
            <button
              type="button"
              className="text-blue-500"
              onClick={() => setRecovery(!recovery)}
            >
              Forgot password?
            </button>
          </div>
          {recovery && (
            <p role="status" className="text-sm text-slate-500">
              Contact your workspace administrator to reset your password.
              Workspace owners can use the account recovery command on the
              server.
            </p>
          )}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
