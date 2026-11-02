import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { tasksRepo, type Task } from '@/data';
import { db } from '@/data/db';
import { freshDatabase } from '@/data/testing';
import { getMeta, META, setMeta } from '@/data/sync/meta';
import { setSyncState } from '@/data/sync/state';
import { setLocale } from '@/i18n/locale';
import { useSavedLabel } from '@/lib/useSyncStatus';
import { SyncSettings } from './SyncSettings';

const me = { id: 'me', email: 'me@example.com' };
const remoteRow = { table: 'areas', id: 'remote', updatedAt: '2026-10-01T00:00:00.000Z', deletedAt: null, payload: { id: 'remote', name: 'Remote', updatedAt: '2026-10-01T00:00:00.000Z', deletedAt: null } };

/** Answers the app's API calls. `rows` is what the account holds on the server. */
function serve({ rows = [] as unknown[], login = { status: 200, body: me as object } } = {}) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(String(url));
      const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
      if (String(url).includes('/auth/login') || String(url).includes('/auth/register')) return json(login.status, login.body);
      if (String(url).includes('/auth/logout')) return json(200, {});
      if (String(url).includes('/sync/pull')) return json(200, { rows: String(url).endsWith('cursor=0') ? rows : [], cursor: rows.length, hasMore: false });
      if (String(url).includes('/sync/push')) return json(201, { accepted: (JSON.parse(String(init?.body)) as { rows: { id: string }[] }).rows.map((r) => r.id), winners: [] });
      return json(404, {});
    }),
  );
  return calls;
}

const addOwnTask = () =>
  tasksRepo.create({ areaId: null, goalId: null, keyResultId: null, parentTaskId: null, title: 'Mine', notes: '', status: 'open', priority: null, doOn: null, time: null, dueAt: null, estimateMin: null, rrule: null, reminderAt: null, completedAt: null, sortKey: 'a0', repeatOfId: null } as Parameters<typeof tasksRepo.create>[0] & Partial<Task>);

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Email'), 'me@example.com');
  await user.type(screen.getByLabelText('Password'), 'correct horse battery');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

beforeEach(async () => {
  await freshDatabase();
  setSyncState('off');
});
afterEach(() => vi.unstubAllGlobals());

describe('Settings › Account and sync', () => {
  it('shows a sign-in form when signed out, and makes no request', async () => {
    const calls = serve();
    render(<SyncSettings />);
    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText(/You can use the app without an account/)).toBeInTheDocument();
    expect(calls).toEqual([]);
  });

  it('signs in and shows the account', async () => {
    serve();
    const user = userEvent.setup();
    render(<SyncSettings />);
    await signIn(user);
    expect(await screen.findByText('me@example.com')).toBeInTheDocument();
    await waitFor(async () => expect(await getMeta(META.accountId)).toBe('me'));
  });

  it('says plainly when the password is wrong', async () => {
    serve({ login: { status: 401, body: {} } });
    const user = userEvent.setup();
    render(<SyncSettings />);
    await signIn(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('That email and password don’t match.');
    expect(await getMeta(META.accountId)).toBeUndefined();
  });

  it('asks what to do when both have data, and changes nothing until you pick', async () => {
    await setMeta('seededAt', new Date(Date.now() - 3_600_000).toISOString());
    const task = await addOwnTask();
    serve({ rows: [remoteRow] });
    const user = userEvent.setup();
    render(<SyncSettings />);
    await signIn(user);
    const dialog = await screen.findByRole('dialog');
    expect(await db.tasks.get(task.id)).toBeDefined();
    expect(await getMeta(META.accountId)).toBeUndefined();
    await user.click(within(dialog).getByRole('button', { name: 'Keep both' }));
    await waitFor(async () => expect(await getMeta(META.accountId)).toBe('me'));
    expect(await db.tasks.get(task.id)).toBeDefined();
  });

  it("warns before another account replaces this device's data", async () => {
    await setMeta(META.ownerId, 'someone else');
    const task = await addOwnTask();
    serve();
    const user = userEvent.setup();
    render(<SyncSettings />);
    await signIn(user);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/belongs to another account/)).toBeInTheDocument();
    expect(await db.tasks.get(task.id)).toBeDefined();
    await user.click(within(dialog).getByRole('button', { name: 'Replace it' }));
    await waitFor(async () => expect(await db.tasks.get(task.id)).toBeUndefined());
    expect(await getMeta(META.ownerId)).toBe('me');
  });

  it('cancelling the warning signs out and leaves everything alone', async () => {
    await setMeta(META.ownerId, 'someone else');
    const task = await addOwnTask();
    const calls = serve();
    const user = userEvent.setup();
    render(<SyncSettings />);
    await signIn(user);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(calls.some((c) => c.includes('/auth/logout'))).toBe(true));
    expect(await db.tasks.get(task.id)).toBeDefined();
    expect(await getMeta(META.ownerId)).toBe('someone else');
  });

  describe('when signed in', () => {
    beforeEach(async () => {
      await setMeta(META.accountId, 'me');
      await setMeta(META.ownerId, 'me');
      await setMeta(META.email, 'me@example.com');
    });

    it('says what each status means', async () => {
      render(<SyncSettings />);
      await screen.findByText('me@example.com');
      act(() => setSyncState('offline'));
      expect(screen.getByText(/It will sync when you’re back online/)).toBeInTheDocument();
      act(() => setSyncState('needsSignIn'));
      expect(screen.getByText(/Sign in again to keep syncing/)).toBeInTheDocument();
      expect(await screen.findByLabelText('Password')).toBeInTheDocument();
      act(() => setSyncState('failed'));
      expect(screen.getByText(/Couldn’t reach the server/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });

    it('sign out offers removing the data from this device, or keeping it', async () => {
      serve();
      const user = userEvent.setup();
      render(<SyncSettings />);
      await user.click(await screen.findByRole('button', { name: 'Sign out' }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByRole('button', { name: 'Keep it on this device' })).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Remove it from this device' }));
      await waitFor(async () => expect(await getMeta(META.ownerId)).toBeUndefined());
    });

    it('warns when removing would lose changes it could not send', async () => {
      await addOwnTask();
      vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
      const user = userEvent.setup();
      render(<SyncSettings />);
      await user.click(await screen.findByRole('button', { name: 'Sign out' }));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Remove it from this device' }));
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/haven’t synced/);
      expect(await getMeta(META.accountId)).toBe('me');
    });
  });

  it('tells the truth about the server, in both languages', async () => {
    const { unmount } = render(<SyncSettings />);
    expect(await screen.findByText(/The server can read it/)).toBeInTheDocument();
    unmount();
    setLocale('vi');
    render(<SyncSettings />);
    expect(await screen.findByText(/Máy chủ có thể đọc/)).toBeInTheDocument();
  });
});

describe('where we say your data is saved', () => {
  it('stays "on this device" until you sign in', async () => {
    const { result } = renderHook(() => useSavedLabel());
    await waitFor(() => expect(result.current).toBe('Saved on this device'));
    await act(async () => {
      await setMeta(META.accountId, 'me');
    });
    await waitFor(() => expect(result.current).toBe('Saved'));
  });
});
