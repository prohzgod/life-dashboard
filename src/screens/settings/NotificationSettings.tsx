import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { DEFAULT_REMINDER_PREFS, type ReminderPrefs } from '@/domain/reminders';
import { getReminderPrefs, setReminderPrefs } from '@/data';
import { Button, Card, Switch } from '@/components/ui';
import { askToNotify, notifyPermission, showNotice, type NotifyPermission } from '@/lib/notify';
import styles from './NotificationSettings.module.css';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const permissionText: Record<NotifyPermission, string> = {
  granted: 'Allowed in this browser',
  default: 'Your browser will ask once',
  denied: 'Blocked in this browser',
  unsupported: 'This browser can’t show notifications',
};

type Message = { tone: 'success' | 'error'; text: string };

/** Settings › Notifications: local reminders for tasks, the check-in and the weekly review. */
export function NotificationSettings() {
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
      setMessage({ tone: 'success', text: 'Reminders are on for this device.' });
    } else if (answer === 'denied') {
      setMessage({ tone: 'error', text: 'Your browser is blocking notifications for this app. Allow them in the site settings, then try again.' });
    } else if (answer === 'unsupported') {
      setMessage({ tone: 'error', text: 'This browser can’t show notifications. Installing the app usually helps.' });
    }
  }

  async function sendTest() {
    const shown = await showNotice({ tag: 'test', title: 'Life Dashboard', body: 'Your reminders will look like this.', url: '/settings/notifications' }, () => undefined);
    setMessage(shown ? { tone: 'success', text: 'Sent. It should appear in a moment.' } : { tone: 'error', text: 'It couldn’t be shown. Check that notifications are allowed.' });
  }

  return (
    <div className={styles.grid}>
      <Card title="On this device">
        <Row title="Show reminders" sub={permissionText[permission]}>
          {(id) => <Switch labelledBy={id} checked={on} disabled={permission === 'unsupported'} onChange={(next) => void turnOn(next)} />}
        </Row>
        <p className={styles.note}>
          Reminders come from this device, with no server. They arrive while Life Dashboard is open, in a tab or installed. If it was closed, you get them the
          next time you open it, up to a day late.
        </p>
        <Button onClick={() => void sendTest()} disabled={!on}>
          Send a test notification
        </Button>
        <p role="status" className={message?.tone === 'error' ? styles.error : styles.success}>
          {message?.text}
        </p>
      </Card>

      <Card title="What to remind you of">
        <Row title="Task reminders" sub="At the reminder time you set on a task">
          {(id) => <Switch labelledBy={id} checked={prefs.tasks} disabled={!on} onChange={(tasks) => save({ tasks })} />}
        </Row>
        <Row title="Daily check-in" sub="Skipped on days you've already checked in">
          {(id) => <Switch labelledBy={id} checked={prefs.checkIn.on} disabled={!on} onChange={(next) => save({ checkIn: { ...prefs.checkIn, on: next } })} />}
        </Row>
        <label className={styles.field}>
          <span>Check-in time</span>
          <input type="time" className={styles.input} value={prefs.checkIn.time} disabled={!on || !prefs.checkIn.on} onChange={(e) => e.target.value && save({ checkIn: { ...prefs.checkIn, time: e.target.value } })} />
        </label>
        <Row title="Weekly review" sub="Until that week's review is done">
          {(id) => <Switch labelledBy={id} checked={prefs.review.on} disabled={!on} onChange={(next) => save({ review: { ...prefs.review, on: next } })} />}
        </Row>
        <div className={styles.pair}>
          <label className={styles.field}>
            <span>Review day</span>
            <select className={styles.input} value={prefs.review.weekday} disabled={!on || !prefs.review.on} onChange={(e) => save({ review: { ...prefs.review, weekday: Number(e.target.value) } })}>
              {WEEKDAYS.map((day, i) => (
                <option key={day} value={i}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Review time</span>
            <input type="time" className={styles.input} value={prefs.review.time} disabled={!on || !prefs.review.on} onChange={(e) => e.target.value && save({ review: { ...prefs.review, time: e.target.value } })} />
          </label>
        </div>
      </Card>

      <Card title="Privacy">
        <Row title="Hide what a reminder is about" sub={'Shows "You have a reminder" instead of the task'}>
          {(id) => <Switch labelledBy={id} checked={prefs.hideDetails} disabled={!on} onChange={(hideDetails) => save({ hideDetails })} />}
        </Row>
        <p className={styles.note}>While the app is locked, reminders never say what they’re about.</p>
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
