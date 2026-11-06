import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NavigationPage } from '../components/layout/Sidebar';

export function SettingsSecurityPage(_props: { onNavigate: (page: NavigationPage) => void }) {
  const { currentUser, logout } = useAuth();
  return (
    <div className="page">
      <h1 className="page-title">Account Settings</h1>
      <section className="panel p-6 max-w-2xl space-y-5">
        <h2 className="font-bold flex items-center gap-2">
          <User size={18} className="text-blue-600" />
          Doctor Account
        </h2>
        <dl className="grid sm:grid-cols-2 gap-5">
          <div>
            <dt className="text-xs text-slate-400">Name</dt>
            <dd className="text-sm mt-1">{currentUser!.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Email</dt>
            <dd className="text-sm mt-1 break-all">{currentUser!.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Role</dt>
            <dd className="text-sm mt-1">Doctor</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Account type</dt>
            <dd className="text-sm mt-1">
              {currentUser!.isDemo ? 'Demo — synthetic data only' : 'Clinic account'}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-slate-500">
          Account changes and password resets are managed by your application maintainer.
        </p>
        <button className="btn-secondary" onClick={() => void logout()}>
          <LogOut size={16} />
          Sign Out
        </button>
      </section>
    </div>
  );
}
