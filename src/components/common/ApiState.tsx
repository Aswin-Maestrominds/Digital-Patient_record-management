import React from 'react';
export const Loading = ({ text = 'Loading records…' }: { text?: string }) => (
  <div role="status" className="panel p-8 text-center text-slate-500">
    {text}
  </div>
);
export const ErrorNotice = ({ message, onRetry }: { message?: string; onRetry?: () => void }) =>
  message ? (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
    >
      {message}{' '}
      {onRetry && (
        <button type="button" className="ml-3 font-bold underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  ) : null;
export const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <div className="panel p-10 text-center text-slate-500">{children}</div>
);
export function Pagination({
  page,
  total,
  limit = 20,
  onChange,
}: {
  page: number;
  total: number;
  limit?: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
      <span>
        {total === 0
          ? '0 results'
          : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
      </span>
      <div className="flex items-center gap-3">
        <button className="btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          className="btn-secondary"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
