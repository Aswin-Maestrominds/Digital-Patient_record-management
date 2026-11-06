import React, { useEffect, useRef, useState } from 'react';
import { Search, Menu, Settings, X } from 'lucide-react';
import { NavigationPage } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery, useDebouncedValue } from '../../hooks/useApiQuery';
import { queryString } from '../../api/client';
import { PatientPage } from '../../api/types';
import { initials } from '../../utils/display';

export function TopNavbar({
  onNavigate,
  onToggleMobileMenu,
}: {
  onNavigate: (page: NavigationPage, patientId?: string, docId?: string) => void;
  onToggleMobileMenu?: () => void;
}) {
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const searchArea = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!searchArea.current?.contains(event.target as Node)) setSearch('');
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const term = useDebouncedValue(search.trim());
  const results = useApiQuery<PatientPage>(
    term ? `/patients?${queryString({ search: term, limit: 5 })}` : null,
  );
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 gap-4">
      <button
        aria-label="Open navigation menu"
        className="lg:hidden p-2"
        onClick={onToggleMobileMenu}
      >
        <Menu size={20} />
      </button>
      <div
        ref={searchArea}
        role="search"
        aria-label="Patient search"
        className="relative flex-1 max-w-xl"
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
            if (e.key === 'Escape') setSearch('');
          }}
        />
        {search && (
          <button
            className="absolute right-3 top-3"
            aria-label="Clear search"
            onClick={() => setSearch('')}
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
              <p className="p-3 text-sm text-slate-500">No matching patients.</p>
            ) : (
              <>
                {results.data.patients.map((patient) => (
                  <button
                    key={patient.id}
                    className="w-full text-left p-3 rounded-lg hover:bg-blue-50"
                    onClick={() => {
                      setSearch('');
                      onNavigate('record-detail', patient.id);
                    }}
                  >
                    <span className="font-semibold text-sm">{patient.name}</span>
                    <span className="block text-xs font-mono text-slate-400">{patient.id}</span>
                  </button>
                ))}
                <p className="p-2 text-xs text-slate-500">
                  {results.data.total} matches. Use the patient directory to see all results.
                </p>
              </>
            )}
          </div>
        )}
      </div>
      <button
        className="flex items-center gap-3 text-left"
        onClick={() => onNavigate('settings')}
        aria-label="Account settings"
      >
        <span className="bg-blue-50 text-blue-700 rounded-full w-9 h-9 flex items-center justify-center text-xs font-bold">
          {initials(currentUser!.name)}
        </span>
        <span className="hidden sm:block">
          <span className="block text-sm font-semibold">{currentUser!.name}</span>
          <span className="block text-xs text-slate-400">Doctor</span>
        </span>
        <Settings size={16} className="text-slate-400" />
      </button>
    </header>
  );
}
