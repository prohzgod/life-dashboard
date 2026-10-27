import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { findPatterns } from '@/domain/stats';
import type { ProgressData } from '@/data';
import { Card } from '@/components/ui';
import styles from './Progress.module.css';

export function PatternsCard({ data, today }: { data: ProgressData; today: Day }) {
  const patterns = findPatterns({ today, ...data });
  return (
    <Card title="Patterns" meta="found on this device">
      {patterns.length === 0 ? (
        <p className={styles.quiet}>Patterns show up after a few weeks of check-ins, tasks and habits. Nothing is guessed from too little.</p>
      ) : (
        <ul className={styles.patterns}>
          {patterns.map((p) => (
            <li key={p.text} className={styles.pattern}>
              <p>{p.text}</p>
              <span className={styles.quiet}>{p.detail}</span>
              {p.link && (
                <Link to={p.link.to} className={styles.link}>
                  {p.link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
