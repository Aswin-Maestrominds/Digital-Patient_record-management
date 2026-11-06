const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
let csrfToken = '';
let sessionVersion = 0;
export const SESSION_EXPIRED = 'medivault:session-expired';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public requestId?: string,
  ) {
    super(message);
  }
}

export function clearSession() {
  csrfToken = '';
  sessionVersion += 1;
}
export function setCsrfToken(token: string) {
  csrfToken = token;
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const version = sessionVersion;
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(options.method || 'GET') && csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  if (version !== sessionVersion) throw new DOMException('Session changed', 'AbortError');
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/me') {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED));
    }
    const issues = body.issues
      ?.map((issue: { field: string; message: string }) => `${issue.field}: ${issue.message}`)
      .join(' ');
    throw new ApiError(
      issues || body.message || `Request failed (${response.status}).`,
      response.status,
      body.requestId,
    );
  }
  return response;
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await request(path, options);
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new ApiError('The API returned an unexpected response. Check the backend URL.', 502);
  }
  return response.json();
}

export async function documentBlob(id: string, mode: 'view' | 'download', signal?: AbortSignal) {
  const response = await request(`/documents/${encodeURIComponent(id)}/${mode}`, { signal });
  if (
    !['application/pdf', 'image/jpeg', 'image/png'].includes(
      response.headers.get('content-type')?.split(';')[0] || '',
    )
  ) {
    throw new ApiError('The server did not return a supported document.', 502);
  }
  return response.blob();
}

export function queryString(values: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unable to complete the request.';
