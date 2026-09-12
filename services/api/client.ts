import { getApiBaseUrl } from '@/lib/apiConfig';

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiFailure = {
  success: false;
  error: string;
  details?: { field: string; message: string }[];
};

export class ApiError extends Error {
  status: number;
  details?: { field: string; message: string }[];

  constructor(message: string, status: number, details?: { field: string; message: string }[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

let authTokenProvider: (() => string | null | undefined) | null = null;

export function setApiAuthTokenProvider(provider: () => string | null | undefined) {
  authTokenProvider = provider;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = options.token ?? authTokenProvider?.() ?? null;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch {
    throw new ApiError('Unable to reach the backend. Check your network and API URL.', 0);
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null;

  if (!response.ok || !payload || payload.success === false) {
    const failure = payload && 'error' in payload ? payload : null;
    throw new ApiError(
      failure?.error ?? `Request failed (${response.status})`,
      response.status,
      failure?.details,
    );
  }

  return payload.data;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    await apiRequest<{ status: string }>('/health');
    return true;
  } catch {
    return false;
  }
}
