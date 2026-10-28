import { useState } from 'react';
import { areas } from '@design/tokens';
import { Icon } from '@/components/icons/Icon';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button, Card, Checkbox, Chip, PaceBar, Segmented, StatTile, Switch, type ChipTone } from '@/components/ui';
import styles from './DevComponentsPage.module.css';

const statusTones: ChipTone[] = ['neutral', 'primary', 'success', 'warning', 'danger', 'accent'];
const periods = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const;

/** Every base component in both themes, side by side. Not linked from the sidebar. */
export function DevComponentsPage() {
  return (
    <>
      <PageHeader title="Components" eyebrow="Grid, dev" subtitle="Base components from docs/DESIGN.md in the light and the dark theme." />
      <div className={styles.columns}>
        <ThemePanel theme="light" />
        <ThemePanel theme="dark" />
      </div>
    </>
  );
}

function ThemePanel({ theme }: { theme: 'light' | 'dark' }) {
  const [task, setTask] = useState(true);
  const [other, setOther] = useState(false);
  const [sync, setSync] = useState(true);
  const [lock, setLock] = useState(false);
  const [period, setPeriod] = useState<(typeof periods)[number]['value']>('year');

  return (
    <section data-theme={theme} className={styles.panel} aria-label={`${theme === 'light' ? 'Light' : 'Dark'} theme`}>
      <h2 className={styles.panelTitle}>{theme === 'light' ? 'Light' : 'Dark'}</h2>

      <Card title="Button" meta="primary, secondary, quiet">
        <div className={styles.row}>
          <Button variant="primary">Add to plan</Button>
          <Button>Save for later</Button>
          <Button variant="quiet">Edit budgets</Button>
        </div>
        <div className={styles.row}>
          <Button variant="primary" size="sm" icon={<Icon name="plus" size={14} strokeWidth={2.2} />}>
            Small
          </Button>
          <Button size="sm">Small</Button>
          <Button size="sm" disabled>
            Disabled
          </Button>
        </div>
      </Card>

      <Card title="Chip" meta="status tones, life areas">
        <div className={styles.row}>
          {statusTones.map((tone) => (
            <Chip key={tone} tone={tone}>
              {tone === 'success' ? 'On pace' : tone === 'warning' ? 'Behind ~2 weeks' : tone === 'danger' ? 'Over budget' : tone === 'primary' ? 'Repeats monthly' : tone === 'accent' ? 'Word of the year' : 'Someday'}
            </Chip>
          ))}
        </div>
        <div className={styles.row}>
          {areas.map((area) => (
            <Chip key={area} tone={area} dot>
              {area[0]!.toUpperCase() + area.slice(1)}
            </Chip>
          ))}
        </div>
      </Card>

      <Card title="Checkbox, Switch, Segmented">
        <div className={styles.stack}>
          <Checkbox checked={task} onChange={setTask} label="Morning run: 5 km easy" />
          <Checkbox checked={other} onChange={setOther} label="Book dentist appointment" />
        </div>
        <div className={styles.row}>
          <Switch checked={sync} onChange={setSync} label="Sync between devices" />
          <Switch checked={lock} onChange={setLock} label="App lock" />
          <Segmented label="Period" options={periods} value={period} onChange={setPeriod} />
        </div>
      </Card>

      <Card title="PaceBar">
        <PaceBar label="Run a half-marathon" area="health" progress={62} expected={75} statusText="Behind by about 2 weeks" />
        <PaceBar label="Save $600 this month" area="finance" progress={67} expected={65} valueText="$400 / $600" />
      </Card>

      <div className={styles.stats}>
        <StatTile label="Tasks completed" value="1,184" caption="about 4.4 per day" />
        <StatTile label="Average mood" value="3.8" unit="/ 5" caption="best month: May" tone="sunken" />
      </div>
    </section>
  );
}
