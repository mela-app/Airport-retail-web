/**
 * REST client. The API is always on the same origin (Vite proxy in development, the same host in Docker and
 * on the playground), so every request uses a path under `/api`.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface RequestSpec {
  method: string;
  path: string;
  body?: unknown;
  signal?: AbortSignal | undefined;
}

/** Requests only ever go to this page's own origin, under `/api/`. */
async function send(spec: RequestSpec, init: RequestInit): Promise<Response> {
  const url = new URL(spec.path, window.location.origin);
  const allowedOrigins = new Set([window.location.origin]);
  if (allowedOrigins.has(url.origin) && url.pathname.startsWith('/api/')) {
    return fetch(url, init);
  }
  throw new Error(`not an API path: ${spec.path}`);
}

async function request<T>(spec: RequestSpec): Promise<T> {
  const init: RequestInit = {
    method: spec.method,
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  };
  if (spec.signal) init.signal = spec.signal;
  if (spec.body !== undefined) {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' };
    init.body = JSON.stringify(spec.body);
  }
  const res = await send(spec, init);
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(errorMessage(data) ?? `${res.status} ${res.statusText}`, res.status);
  return data as T;
}

function errorMessage(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('; ');
  }
  return undefined;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>({ method: 'GET', path, signal }),
  post: <T>(path: string, body?: unknown) => request<T>({ method: 'POST', path, body: body ?? {} }),
  put: <T>(path: string, body: unknown) => request<T>({ method: 'PUT', path, body }),
  patch: <T>(path: string, body: unknown) => request<T>({ method: 'PATCH', path, body }),
  delete: <T>(path: string) => request<T>({ method: 'DELETE', path }),
};

/** Query string from optional values (`undefined`/empty are dropped). */
export function qs(values: Record<string, string | number | boolean | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(values))
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  const s = params.toString();
  return s ? `?${s}` : '';
}
