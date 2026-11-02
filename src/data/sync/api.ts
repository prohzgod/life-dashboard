import type { PresignRequest, PresignResponse, PullResponse, PushResponse, SyncRow } from '@shared';

/** A sleeping server on Render can take about a minute to wake. */
export const REQUEST_TIMEOUT_MS = 90_000;

/** The session has ended; you need to sign in again. */
export class SyncAuthError extends Error {}

/** The server refused the request, with its reason. */
export class SyncRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export type SyncApi = {
  push(rows: SyncRow[]): Promise<PushResponse>;
  pull(cursor: number): Promise<PullResponse>;
  presign(items: PresignRequest['items']): Promise<PresignResponse>;
};

export type Account = { id: string; email: string };

async function request<T>(path: string, init?: { method: string; body: unknown }): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: init?.method ?? 'GET',
    headers: init ? { 'Content-Type': 'application/json' } : undefined,
    body: init ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 401 && !path.startsWith('/auth/login')) throw new SyncAuthError();
  if (!response.ok) {
    const reason = (await response.json().catch(() => null)) as { message?: unknown } | null;
    throw new SyncRequestError(response.status, typeof reason?.message === 'string' ? reason.message : '');
  }
  return (await response.json()) as T;
}

export const realApi: SyncApi = {
  push: (rows) => request('/sync/push', { method: 'POST', body: { rows } }),
  pull: (cursor) => request(`/sync/pull?cursor=${cursor}`),
  presign: (items) => request('/files/presign', { method: 'POST', body: { items } }),
};

export const accountApi = {
  register: (email: string, password: string, deviceName: string) => request<Account>('/auth/register', { method: 'POST', body: { email, password, deviceName } }),
  signIn: (email: string, password: string, deviceName: string) => request<Account>('/auth/login', { method: 'POST', body: { email, password, deviceName } }),
  signOut: () => request<object>('/auth/logout', { method: 'POST', body: {} }),
  me: () => request<Account>('/auth/me'),
};
