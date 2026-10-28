import { getToken, clearToken } from './token';
import type { ApiErrorBody } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type Query = Record<string, string | number | undefined | null>;

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

async function request<T>(
  method: string,
  path: string,
  opts: { query?: Query; body?: unknown; auth?: boolean; signal?: AbortSignal } = {},
): Promise<T> {
  const url = new URL(path, BASE_URL);
  Object.entries(opts.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
  }

  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && opts.auth !== false) {
      clearToken();
      onUnauthorized();
    }
    const message = (data as Partial<ApiErrorBody> | null)?.message;
    throw new ApiError(res.status, message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>('POST', path, { body, auth }),
};

export const isAbortError = (e: unknown): boolean =>
  e instanceof DOMException ? e.name === 'AbortError' : (e as Error | null)?.name === 'AbortError';
