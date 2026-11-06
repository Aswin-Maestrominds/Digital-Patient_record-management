import React, { useState } from 'react';
import { Cross, Lock, Eye, EyeOff, ArrowRight, FileText, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import { ErrorNotice } from '../components/common/ApiState';

export function LoginPage() {
  const { login, error: sessionError, retrySession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-5xl w-full grid lg:grid-cols-12 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="lg:col-span-7 p-7 sm:p-12 space-y-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-3 rounded-xl">
              <Cross className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">MediVault</h1>
              <p className="text-xs text-slate-400">Patient Records</p>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold">Welcome Back</h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to manage your patients and medical documents.
            </p>
          </div>
          <ErrorNotice
            message={error || sessionError}
            onRetry={sessionError && !error ? retrySession : undefined}
          />
          <form onSubmit={submit} className="space-y-5">
            <label className="label">
              Work Email Address
              <input
                className="field"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="label">
              Password
              <div className="relative">
                <input
                  className="field pr-12"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="absolute right-3 top-3 text-slate-400"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Lock size={14} />
            Access is limited to your clinic’s doctor account.
          </p>
        </div>
        <aside className="lg:col-span-5 bg-blue-950 text-white p-8 sm:p-12 flex flex-col justify-center gap-8">
          <h2 className="text-3xl font-bold leading-tight">
            Your patients.
            <br />
            Their complete record.
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed">
            Keep patient profiles, reports and prescriptions organized in one place.
          </p>
          <div className="flex items-center gap-3 text-sm">
            <Users />
            Find patients by name or ID
          </div>
          <div className="flex items-center gap-3 text-sm">
            <FileText />
            View reports and download originals
          </div>
        </aside>
      </div>
    </div>
  );
}
