import { getApiBaseUrl } from '@/lib/apiConfig';

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiFailure = {
  success: false;
  error: string;
  code?: string;
  details?: { field: string; message: string }[];
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: { field: string; message: string }[];

  constructor(
    message: string,
    status: number,
    details?: { field: string; message: string }[],
    code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
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
  const token = options.token === undefined ? (authTokenProvider?.() ?? null) : options.token;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  // Allow a Render cold start without indefinite waits or automatic write retries.
  const timeout = setTimeout(abort, 90_000);
  let response: Response;
  let payload: ApiSuccess<T> | ApiFailure | null;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    payload = await response.json().catch(() => null);
  } catch {
    throw new ApiError('Unable to reach the backend. Check your network and API URL.', 0);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }

  if (!response.ok || !payload || payload.success === false) {
    const failure = payload && 'error' in payload ? payload : null;
    throw new ApiError(
      failure?.error ?? `Request failed (${response.status})`,
      response.status,
      failure?.details,
      failure?.code,
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

let lastWakeVerifiedAt = 0;
let pendingWake: Promise<boolean> | null = null;
const WAKE_REUSE_WINDOW_MS = 15_000;

/**
 * Best-effort `/health` ping so a sleeping Render instance starts warming up.
 * Returns true when the backend answers (or was verified very recently).
 */
export async function wakeBackend(): Promise<boolean> {
  if (Date.now() - lastWakeVerifiedAt < WAKE_REUSE_WINDOW_MS) return true;
  if (!pendingWake)
    pendingWake = checkBackendHealth()
      .then((awake) => {
        if (awake) lastWakeVerifiedAt = Date.now();
        return awake;
      })
      .finally(() => {
        pendingWake = null;
      });
  return pendingWake;
}

/**
 * Backend-backed providers all share one Render instance that sleeps when idle.
 * A first request can therefore fail purely because the instance is cold.
 *
 * On a cold-start-shaped failure (network error / 502-504) we ping `/health` to
 * trigger the wake-up and retry exactly once. A sleeping backend is never
 * mistaken for a broken source, and a provider is never permanently disabled
 * because the first Render request timed out.
 */
export async function apiRequestWithWake<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  try {
    return await apiRequest<T>(path, options);
  } catch (error) {
    if (options.signal?.aborted || (options.method && options.method !== 'GET')) throw error;
    // A structured source failure proves the gateway is awake; repeating it will not warm Render.
    if (error instanceof ApiError && error.code) throw error;
    const status = error instanceof ApiError ? error.status : -1;
    const looksLikeColdStart = status === 0 || status === 502 || status === 503 || status === 504;
    if (!looksLikeColdStart) throw error;
    const awake = await wakeBackend();
    if (!awake) throw error;
    return apiRequest<T>(path, options);
  }
}
