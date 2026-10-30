import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { DEFAULT_REMINDER_PREFS, type ReminderPrefs } from '@/domain/reminders';
import { getReminderPrefs, setReminderPrefs } from '@/data';
import { Button, Card, Switch } from '@/components/ui';
import { useT } from '@/i18n';
import { askToNotify, notifyPermission, showNotice, type NotifyPermission } from '@/lib/notify';
import styles from './NotificationSettings.module.css';

type Message = { tone: 'success' | 'error'; text: string };

/** Settings › Notifications: local reminders for tasks, the check-in and the weekly review. */
export function NotificationSettings() {
  const { format, settings } = useT();
  const t = settings.notifications;
  const prefs = useLiveQuery(getReminderPrefs) ?? DEFAULT_REMINDER_PREFS;
  const [permission, setPermission] = useState<NotifyPermission>(notifyPermission);
  const [message, setMessage] = useState<Message | null>(null);
  const save = (patch: Partial<ReminderPrefs>) => void setReminderPrefs(patch);
  const on = prefs.enabled && permission === 'granted';

  // You may change the browser's permission elsewhere; read it again when you come back.
  useEffect(() => {
    const refresh = () => setPermission(notifyPermission());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  async function turnOn(next: boolean) {
    setMessage(null);
    if (!next) return save({ enabled: false });
    const answer = await askToNotify();
    setPermission(answer);
    if (answer === 'granted') {
      save({ enabled: true });
      setMessage({ tone: 'success', text: t.on });
    } else if (answer === 'denied') {
      setMessage({ tone: 'error', text: t.denied });
    } else if (answer === 'unsupported') {
      setMessage({ tone: 'error', text: t.unsupported });
    }
  }

  async function sendTest() {
    const shown = await showNotice({ tag: 'test', title: 'Life Dashboard', body: t.testBody, url: '/settings/notifications' }, () => undefined);
    setMessage(shown ? { tone: 'success', text: t.testSent } : { tone: 'error', text: t.testFailed });
  }

  return (
    <div className={styles.grid}>
      <Card title={t.onThisDevice}>
        <Row title={t.show} sub={t.permission[permission]}>
          {(id) => <Switch labelledBy={id} checked={on} disabled={permission === 'unsupported'} onChange={(next) => void turnOn(next)} />}
        </Row>
        <p className={styles.note}>{t.note}</p>
        <Button onClick={() => void sendTest()} disabled={!on}>
          {t.sendTest}
        </Button>
        <p role="status" className={message?.tone === 'error' ? styles.error : styles.success}>
          {message?.text}
        </p>
      </Card>

      <Card title={t.what}>
        <Row title={t.tasks} sub={t.tasksSub}>
          {(id) => <Switch labelledBy={id} checked={prefs.tasks} disabled={!on} onChange={(tasks) => save({ tasks })} />}
        </Row>
        <Row title={t.checkIn} sub={t.checkInSub}>
          {(id) => <Switch labelledBy={id} checked={prefs.checkIn.on} disabled={!on} onChange={(next) => save({ checkIn: { ...prefs.checkIn, on: next } })} />}
        </Row>
        <label className={styles.field}>
          <span>{t.checkInTime}</span>
          <input type="time" className={styles.input} value={prefs.checkIn.time} disabled={!on || !prefs.checkIn.on} onChange={(e) => e.target.value && save({ checkIn: { ...prefs.checkIn, time: e.target.value } })} />
        </label>
        <Row title={t.review} sub={t.reviewSub}>
          {(id) => <Switch labelledBy={id} checked={prefs.review.on} disabled={!on} onChange={(next) => save({ review: { ...prefs.review, on: next } })} />}
        </Row>
        <div className={styles.pair}>
          <label className={styles.field}>
            <span>{t.reviewDay}</span>
            <select className={styles.input} value={prefs.review.weekday} disabled={!on || !prefs.review.on} onChange={(e) => save({ review: { ...prefs.review, weekday: Number(e.target.value) } })}>
              {format.weekdaysLong.map((day, i) => (
                <option key={day} value={i}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>{t.reviewTime}</span>
            <input type="time" className={styles.input} value={prefs.review.time} disabled={!on || !prefs.review.on} onChange={(e) => e.target.value && save({ review: { ...prefs.review, time: e.target.value } })} />
          </label>
        </div>
      </Card>

      <Card title={t.privacy}>
        <Row title={t.hide} sub={t.hideSub}>
          {(id) => <Switch labelledBy={id} checked={prefs.hideDetails} disabled={!on} onChange={(hideDetails) => save({ hideDetails })} />}
        </Row>
        <p className={styles.note}>{t.lockedNote}</p>
      </Card>
    </div>
  );
}

function Row({ title, sub, children }: { title: string; sub: string; children: (labelId: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={styles.row}>
      <span className={styles.text}>
        <span id={id} className={styles.title}>
          {title}
        </span>
        <span className={styles.sub}>{sub}</span>
      </span>
      {children(id)}
    </div>
  );
}
