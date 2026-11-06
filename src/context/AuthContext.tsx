import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  api,
  ApiError,
  clearSession,
  errorMessage,
  SESSION_EXPIRED,
  setCsrfToken,
} from '../api/client';
import { Doctor } from '../api/types';

interface AuthState {
  currentUser: Doctor | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retrySession: () => void;
}
const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    // Remove obsolete prototype caches, including the old default-login flag.
    [
      'medivault_auth_session',
      'medivault_user_profile',
      'medivault_patients_db',
      'medivault_documents_db',
      'medivault_audits_db',
      'medivault_sessions_db',
    ].forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* Storage may be disabled. */
      }
    });
    const expire = () => {
      setCurrentUser(null);
      setError('Your session has expired. Please sign in again.');
    };
    window.addEventListener(SESSION_EXPIRED, expire);
    return () => window.removeEventListener(SESSION_EXPIRED, expire);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<{ user: Doctor; csrfToken: string }>('/auth/me', { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setCsrfToken(result.csrfToken);
          setCurrentUser(result.user);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && error.name !== 'AbortError') {
          clearSession();
          setCurrentUser(null);
          if (!(error instanceof ApiError && error.status === 401)) setError(errorMessage(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);

  const login = async (email: string, password: string) => {
    clearSession();
    const result = await api<{ user: Doctor; csrfToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setCsrfToken(result.csrfToken);
    setCurrentUser(result.user);
    setError('');
  };
  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
      clearSession();
      setCurrentUser(null);
      setError('');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        setCurrentUser(null);
        return;
      }
      // Do not pretend the server revoked a session when it could not be reached.
      setError('Could not sign out. Please try again.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        loading,
        error,
        login,
        logout,
        retrySession: () => setRetry((value) => value + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required.');
  return context;
}
