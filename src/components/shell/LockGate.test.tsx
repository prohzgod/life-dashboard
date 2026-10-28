import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setPasscode } from '@/data';
import { freshDatabase } from '@/data/testing';
import { lockNow, rememberLockIsOn, resetLockForTests } from './lock';
import { LockGate } from './LockGate';

beforeEach(async () => {
  await freshDatabase();
  localStorage.clear();
  resetLockForTests(true);
});

const app = () => <p>Your plans</p>;

describe('LockGate', () => {
  it('shows the app straight away when no lock is set', async () => {
    render(<LockGate>{app()}</LockGate>);
    expect(screen.getByText('Your plans')).toBeInTheDocument();
  });

  it('starts locked with a passcode, refuses a wrong one, opens with the right one, and locks again', async () => {
    await setPasscode('2468', 1000);
    rememberLockIsOn(true);
    render(<LockGate>{app()}</LockGate>);
    expect(screen.getByRole('heading', { name: 'Life Dashboard is locked' })).toBeInTheDocument();
    expect(screen.queryByText('Your plans')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Passcode'), '1357');
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText('That passcode isn’t right.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Passcode'), '2468');
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText('Your plans')).toBeInTheDocument();

    lockNow();
    expect(await screen.findByRole('heading', { name: 'Life Dashboard is locked' })).toBeInTheDocument();
  });

  it('makes you wait after five wrong tries', async () => {
    await setPasscode('2468', 1000);
    rememberLockIsOn(true);
    render(<LockGate>{app()}</LockGate>);
    for (let i = 0; i < 5; i++) {
      await userEvent.type(screen.getByLabelText('Passcode'), '0000');
      await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    }
    expect(await screen.findByText(/Try again in \d+ seconds/)).toBeInTheDocument();
    expect(screen.getByLabelText('Passcode')).toBeDisabled();
  });
});
