import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { exportAllAsJson, tasksRepo } from '@/data';
import { freshDatabase } from '@/data/testing';
import { PrivacySettings } from './PrivacySettings';

beforeEach(async () => {
  await freshDatabase();
  URL.createObjectURL = vi.fn(() => 'blob:export');
  URL.revokeObjectURL = vi.fn();
});

describe('Settings › Privacy & data', () => {
  it('shows what is stored on this device', async () => {
    render(<PrivacySettings />);
    const goals = screen.getByText('Goals');
    await waitFor(() => expect(goals.nextElementSibling).toHaveTextContent('2'));
    expect(screen.getByText('Habits and logs').nextElementSibling).toHaveTextContent('3');
  });

  it('downloads a dated JSON export', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<PrivacySettings />);
    await userEvent.click(screen.getByRole('button', { name: /Everything, structured/ }));

    expect(await screen.findByText('Export saved to your downloads.')).toBeInTheDocument();
    const link = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(link.download).toMatch(/^life-dashboard-\d{4}-\d\d-\d\d\.json$/);
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0]![0] as Blob;
    expect(blob.type).toBe('application/json');
  });

  it('asks before replacing, then restores the export', async () => {
    const json = await exportAllAsJson();
    await tasksRepo.create({
      areaId: null, goalId: null, keyResultId: null, parentTaskId: null, title: 'Made after the export', notes: '',
      status: 'inbox', priority: null, doOn: null, dueAt: null, estimateMin: null, rrule: null, reminderAt: null,
      completedAt: null, sortKey: 'a1',
    });

    render(<PrivacySettings />);
    await userEvent.upload(screen.getByLabelText('Choose an export file'), new File([json], 'backup.json', { type: 'application/json' }));

    const dialog = await screen.findByRole('dialog', { name: 'Replace everything on this device?' });
    expect(within(dialog).getByText('backup.json')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Replace everything' }));

    expect(await screen.findByText(/Imported \d+ records from backup\.json\./)).toBeInTheDocument();
    expect((await tasksRepo.list()).map((t) => t.title)).toEqual(['Weekly review']);
  });

  it('explains a file that is not an export, and changes nothing', async () => {
    render(<PrivacySettings />);
    await userEvent.upload(screen.getByLabelText('Choose an export file'), new File(['{"hi":1}'], 'notes.json', { type: 'application/json' }));
    expect(await screen.findByText('That file isn’t a Life Dashboard export.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await tasksRepo.count()).toBe(1);
  });
});
