import { getToken, clearToken } from './token';
import type { ApiErrorBody } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export class ApiError extends Error {
  status: number;
  /** Seconds from the `Retry-After` header, when the server sent one */
  retryAfter?: number;

  constructor(status: number, message: string, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

type Query = Record<string, string | number | undefined | null>;

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

interface RequestOptions {
  query?: Query;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await send(method, path, opts);
  return (await res.json().catch(() => ({}))) as T;
}

/** Sends the request and throws ApiError for network failures and non-2xx responses; the body is left unread on success */
async function send(method: string, path: string, opts: RequestOptions): Promise<Response> {
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

  if (!res.ok) {
    const data: unknown = await res.json().catch(() => ({}));
    if (res.status === 401 && opts.auth !== false) {
      clearToken();
      onUnauthorized();
    }
    const message = (data as Partial<ApiErrorBody> | null)?.message;
    const retryAfter = Number(res.headers.get('Retry-After'));
    throw new ApiError(
      res.status,
      message ?? `Request failed (${res.status})`,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    );
  }
  return res;
}

export interface DownloadedFile {
  blob: Blob;
  /** From Content-Disposition, when the server sent one */
  fileName: string | null;
}

async function download(path: string, query?: Query, signal?: AbortSignal): Promise<DownloadedFile> {
  const res = await send('GET', path, { query, signal });
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const fileName = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? null;
  return { blob: await res.blob(), fileName };
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>('GET', path, { query, signal }),
  download,
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>('POST', path, { body, auth }),
};

export const isAbortError = (e: unknown): boolean =>
  e instanceof DOMException ? e.name === 'AbortError' : (e as Error | null)?.name === 'AbortError';
