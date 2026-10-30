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
import { useT } from '@/i18n';
import styles from './Review.module.css';

/** Step 1: empty the Inbox. Anything still on your mind goes in first. */
export function StepClear({ today }: { today: Day }) {
  const { reviews, shell } = useT();
  const t = reviews.clear;
  const lookups = useTaskLookups();
  const navigate = useNavigate();
  const inbox = useLiveQuery(async () => sortForView(withCompletedOn(await tasksRepo.list()).filter((t) => inView(t, 'inbox', today)), 'inbox'), [today]);
  if (!inbox) return null;
  return (
    <Card title={t.title} meta={inbox.length ? t.toTriage(inbox.length) : t.zero} className={styles.card}>
      <p className={styles.lead}>{t.lead}</p>
      <QuickAddField
        variant="box"
        label={shell.capture.label}
        placeholder={t.placeholder}
        today={today}
        areas={lookups.areas}
        onSubmit={(text) => captureTask(text, { today, status: 'inbox' })}
      />
      {inbox.length ? (
        <InboxList tasks={inbox} today={today} lookups={lookups} onOpen={(task) => navigate(`/inbox?task=${task.id}`)} />
      ) : (
        <p className={styles.zero}>{t.zeroDone}</p>
      )}
    </Card>
  );
}
