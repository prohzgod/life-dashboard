import { useEffect, useState } from 'react';
import { toDay, type Day } from '@/domain/days';

/** Today's local day, updating at midnight (and when the device wakes up on a new day). */
export function useToday(): Day {
  const [today, setToday] = useState(() => toDay(new Date()));
  useEffect(() => {
    const check = () => setToday(toDay(new Date()));
    const timer = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}
