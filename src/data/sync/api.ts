import { SYNC_ACCOUNT_HEADER, type PresignRequest, type PresignResponse, type PullResponse, type PushResponse, type SyncRow } from '@shared';
import { getMeta, META } from './meta';

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

export type UserAccount = { id: string; email: string };

async function request<T>(path: string, init?: { method: string; body: unknown }, accountId?: string): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: init?.method ?? 'GET',
    headers: { ...(init ? { 'Content-Type': 'application/json' } : {}), ...(accountId ? { [SYNC_ACCOUNT_HEADER]: accountId } : {}) },
    body: init ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  // 409 outside /auth: the session now belongs to a different account from the one this device syncs with.
  if ((response.status === 401 && !path.startsWith('/auth/login')) || (response.status === 409 && !path.startsWith('/auth/'))) throw new SyncAuthError();
  if (!response.ok) {
    const reason = (await response.json().catch(() => null)) as { message?: unknown } | null;
    throw new SyncRequestError(response.status, typeof reason?.message === 'string' ? reason.message : '');
  }
  return (await response.json()) as T;
}

function apiWith(accountId: () => Promise<string | undefined>): SyncApi {
  return {
    push: async (rows) => request('/sync/push', { method: 'POST', body: { rows, clientNow: new Date().toISOString() } }, await accountId()),
    pull: async (cursor) => request(`/sync/pull?cursor=${cursor}`, undefined, await accountId()),
    presign: async (items) => request('/files/presign', { method: 'POST', body: { items } }, await accountId()),
  };
}

/** The API, for the account this device is linked to. */
export const realApi: SyncApi = apiWith(() => getMeta<string>(META.accountId));

/** The API, for an account signing in that isn't linked yet. */
export const apiFor = (accountId: string): SyncApi => apiWith(async () => accountId);

export const accountApi = {
  register: (email: string, password: string, deviceName: string) => request<UserAccount>('/auth/register', { method: 'POST', body: { email, password, deviceName } }),
  signIn: (email: string, password: string, deviceName: string) => request<UserAccount>('/auth/login', { method: 'POST', body: { email, password, deviceName } }),
  signOut: () => request<object>('/auth/logout', { method: 'POST', body: {} }),
  me: () => request<UserAccount>('/auth/me'),
};
