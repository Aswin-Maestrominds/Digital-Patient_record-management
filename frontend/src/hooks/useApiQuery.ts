import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client';

// Cancel superseded searches and clear the previous record immediately when a
// key changes, so a different patient's data never flashes under the new title.
export function useApiQuery<T>(path: string | null, revision = 0) {
  const [result, setResult] = useState<{
    key: string | null;
    data?: T;
    error: string;
    loading: boolean;
  }>({ key: null, error: '', loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (!path) {
      setResult({ key: path, error: '', loading: false });
      return;
    }
    setResult({ key: path, error: '', loading: true });
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key: path, data, error: '', loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted && error.name !== 'AbortError')
          setResult({ key: path, error: errorMessage(error), loading: false });
      });
    return () => controller.abort();
  }, [path, revision, retry]);
  return {
    data: result.key === path ? result.data : undefined,
    error: result.key === path ? result.error : '',
    loading: result.key !== path || result.loading,
    reload: () => setRetry((value) => value + 1),
  };
}

export function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
