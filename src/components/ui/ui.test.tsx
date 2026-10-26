import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Button, Card, Checkbox, Chip, PaceBar, Segmented, StatTile, Switch } from '.';

describe('Button', () => {
  it('is a real button that defaults to type="button"', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save for later</Button>);
    const button = screen.getByRole('button', { name: 'Save for later' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies the variant and size', () => {
    render(
      <Button variant="primary" size="sm">
        Add
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('button', 'primary', 'sm');
  });
});

describe('Chip', () => {
  it('renders a tone and an optional dot', () => {
    const { container } = render(
      <Chip tone="health" dot>
        Health
      </Chip>,
    );
    expect(screen.getByText('Health')).toHaveClass('chip', 'health');
    expect(container.querySelector('.dot')).toBeInTheDocument();
  });
});

describe('Checkbox', () => {
  function Harness() {
    const [checked, setChecked] = useState(false);
    return <Checkbox checked={checked} onChange={setChecked} label="Call Mom" />;
  }

  it('toggles from its label and strikes the label once checked', async () => {
    render(<Harness />);
    const box = screen.getByRole('checkbox', { name: 'Call Mom' });
    expect(box).not.toBeChecked();
    await userEvent.click(screen.getByText('Call Mom'));
    expect(box).toBeChecked();
    expect(screen.getByText('Call Mom')).toHaveClass('done');
  });
});

describe('Switch', () => {
  it('exposes role="switch" and flips aria-checked', async () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return <Switch checked={on} onChange={setOn} label="App lock" />;
    }
    render(<Harness />);
    const toggle = screen.getByRole('switch', { name: 'App lock' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});

describe('Segmented', () => {
  const options = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ] as const;

  function Harness() {
    const [value, setValue] = useState<'week' | 'month' | 'year'>('year');
    return <Segmented label="Period" options={options} value={value} onChange={setValue} />;
  }

  it('selects on click', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('radio', { name: 'Week' }));
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Year' })).toHaveAttribute('aria-checked', 'false');
  });

  it('moves with arrow keys, wraps around, and keeps one tab stop', async () => {
    render(<Harness />);
    const year = screen.getByRole('radio', { name: 'Year' });
    expect(year).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('tabindex', '-1');

    year.focus();
    await userEvent.keyboard('{ArrowRight}');
    const week = screen.getByRole('radio', { name: 'Week' });
    expect(week).toHaveAttribute('aria-checked', 'true');
    expect(week).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Year' })).toHaveFocus();
  });
});

describe('PaceBar', () => {
  it('says "Behind pace" more than 3 points under the tick', () => {
    render(<PaceBar label="Half-marathon" progress={62} expected={75} />);
    expect(screen.getByText('Behind pace')).toHaveClass('behind');
    const bar = screen.getByRole('progressbar', { name: 'Half-marathon' });
    expect(bar).toHaveAttribute('aria-valuenow', '62');
    expect(bar).toHaveAttribute('aria-valuetext', '62%, expected 75% by today. Behind pace');
  });

  it('is on pace within 3 points and uses a custom sentence', () => {
    render(<PaceBar label="Savings" progress={72} expected={75} statusText="on pace" valueText="$400 / $600" />);
    expect(screen.getByText('on pace')).toHaveClass('onPace');
    expect(screen.getByText('$400 / $600')).toBeInTheDocument();
  });

  it('clamps the fill and tick to the track', () => {
    const { container } = render(<PaceBar label="Over" progress={140} expected={-5} />);
    expect(container.querySelector<HTMLElement>('.fill')!.style.width).toBe('100%');
    expect(container.querySelector<HTMLElement>('.tick')!.style.left).toBe('0%');
  });
});

describe('Card and StatTile', () => {
  it('renders a card heading, meta and action', () => {
    render(
      <Card title="Today’s plan" meta="2 of 6 done" action={<Button variant="quiet">All tasks</Button>}>
        body
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Today’s plan' })).toBeInTheDocument();
    expect(screen.getByText('2 of 6 done')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All tasks' })).toBeInTheDocument();
  });

  it('renders a stat tile', () => {
    render(<StatTile label="Average mood" value="3.8" unit="/ 5" caption="best month: May" />);
    expect(screen.getByText('Average mood')).toBeInTheDocument();
    expect(screen.getByText('3.8')).toBeInTheDocument();
    expect(screen.getByText('best month: May')).toBeInTheDocument();
  });
});
