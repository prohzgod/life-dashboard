import { useState } from 'react';
import { areas } from '@design/tokens';
import { Icon } from '@/components/icons/Icon';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button, Card, Checkbox, CheckButton, Chip, EnergyMeter, HatchBar, IconButton, MoodPicker, PaceBar, ProgressCapsule, Segmented, StatTile, Switch, WarnNote, WeekDots, type ChipTone } from '@/components/ui';
import styles from './DevComponentsPage.module.css';

const statusTones: ChipTone[] = ['neutral', 'primary', 'success', 'warning', 'danger', 'accent'];
const periods = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const;

/** Every shared component on Dawn and on Night, side by side. Not linked from the nav (/kit or /dev/components). */
export function DevComponentsPage() {
  return (
    <>
      <PageHeader title="Glass kit" eyebrow="Glass v2, dev" subtitle="Shared components from design/v2/README.md on Dawn and on Night. Compare with design/v2/screens/glass-kit.png." />
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
  const [mood, setMood] = useState<number | null>(4);
  const [energy, setEnergy] = useState<number | null>(4);
  const [done, setDone] = useState(true);

  return (
    <section data-theme={theme} data-bg={theme === 'dark' ? 'night' : 'dawn'} className={styles.panel} aria-label={`${theme === 'light' ? 'Light' : 'Dark'} theme`}>
      <h2 className={styles.panelTitle}>{theme === 'light' ? 'Light' : 'Dark'}</h2>

      <Card title="Button" meta="primary, secondary, accent, quiet, icon">
        <div className={styles.row}>
          <Button variant="primary" size="lg" icon={<Icon name="plus" size={19} strokeWidth={2} />}>
            Quick capture
          </Button>
          <Button size="lg">Plan my day</Button>
          <Button variant="accent" size="lg">
            Save
          </Button>
          <IconButton icon="search" label="Search" />
          <IconButton icon="plus" label="Add" tone="inverse" />
        </div>
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

      <Card title="Progress" meta="capsules, hatch bar, checks, week dots">
        <div className={styles.row}>
          <ProgressCapsule label="Today" meta="2/5 tasks" percent={40} tone="accent" />
          <ProgressCapsule label="Week 44" meta="day 5/7" percent={64} tone="inverse" />
        </div>
        <div className={styles.row}>
          <ProgressCapsule label="October" meta="30/31" percent={97} tone="glass" />
          <ProgressCapsule label="2026" meta="62 days left" percent={83} tone="outline" />
        </div>
        <HatchBar value={0.6} planned={0.7} label="Run 10 km" />
        <div className={styles.row}>
          <CheckButton checked={done} onToggle={() => setDone(!done)} label="Done" size="lg" />
          <CheckButton checked={!done} onToggle={() => setDone(!done)} label="Not done" size="lg" />
          <WeekDots
            label="This week"
            days={(['done', 'done', 'done', 'missed', 'today', 'future', 'future'] as const).map((state, i) => ({ key: String(i), letter: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]!, state }))}
          />
        </div>
        <WarnNote>Half-marathon is about 4 weeks behind</WarnNote>
      </Card>

      <Card title="Panel" meta="the one dark card" variant="panel">
        <MoodPicker label="Mood" options={['Awful', 'Low', 'Okay', 'Good', 'Great']} value={mood} onChange={setMood} />
        <EnergyMeter label="Energy" options={['Drained', 'Low', 'Okay', 'Good', 'Charged']} value={energy} onChange={setEnergy} />
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
