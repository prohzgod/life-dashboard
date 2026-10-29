import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collectDueReminders, markRemindersFired } from '@/data';
import { notifyPermission, showNotice } from '@/lib/notify';
import { lockIsOn, useLocked } from './lock';

const CHECK_MS = 30_000;

/**
 * Shows due reminders as local notifications while the app is open: every 30 seconds, and as
 * soon as you come back to it. While the app is locked, a reminder never names what it's about.
 */
export function useReminders() {
  const locked = useLocked() && lockIsOn();
  const navigate = useNavigate();
  const lockedRef = useRef(locked);
  const running = useRef(false);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    async function check() {
      if (running.current || notifyPermission() !== 'granted') return;
      running.current = true;
      try {
        const due = await collectDueReminders(new Date(), lockedRef.current);
        const shown: string[] = [];
        for (const reminder of due) {
          if (await showNotice({ tag: reminder.key, title: reminder.title, body: reminder.body, url: reminder.url }, (url) => navigate(url))) shown.push(reminder.key);
        }
        if (shown.length) await markRemindersFired(shown);
      } catch {
        // A reminder that can't show now is tried again on the next check.
      } finally {
        running.current = false;
      }
    }
    void check();
    const timer = window.setInterval(() => void check(), CHECK_MS);
    const onVisible = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [navigate]);
}
