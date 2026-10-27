import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { inView, sortForView } from '@/domain/tasks';
import { captureTask, tasksRepo } from '@/data';
import { QuickAddField } from '@/components/tasks/QuickAddField';
import { useTaskLookups } from '@/components/tasks/useTaskLookups';
import { Card } from '@/components/ui';
import { InboxList } from '@/screens/tasks/InboxList';
import { withCompletedOn } from '@/lib/taskView';
import { plural } from '@/lib/format';
import styles from './Review.module.css';

/** Step 1: empty the Inbox. Anything still on your mind goes in first. */
export function StepClear({ today }: { today: Day }) {
  const lookups = useTaskLookups();
  const navigate = useNavigate();
  const inbox = useLiveQuery(async () => sortForView(withCompletedOn(await tasksRepo.list()).filter((t) => inView(t, 'inbox', today)), 'inbox'), [today]);
  if (!inbox) return null;
  return (
    <Card title="Get clear" meta={inbox.length ? `${plural(inbox.length, 'item')} to triage` : 'Inbox zero'} className={styles.card}>
      <p className={styles.lead}>Write down anything still on your mind, then accept or move each Inbox item. Two minutes is plenty.</p>
      <QuickAddField
        variant="box"
        label="Capture anything"
        placeholder="Anything else on your mind?"
        today={today}
        areas={lookups.areas}
        onSubmit={(text) => captureTask(text, { today, status: 'inbox' })}
      />
      {inbox.length ? (
        <InboxList tasks={inbox} today={today} lookups={lookups} onOpen={(t) => navigate(`/inbox?task=${t.id}`)} />
      ) : (
        <p className={styles.zero}>Inbox zero. Nicely done.</p>
      )}
    </Card>
  );
}
