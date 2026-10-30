import { Link } from 'react-router-dom';
import type { Day } from '@/domain/days';
import { findPatterns } from '@/domain/stats';
import type { ProgressData } from '@/data';
import { Card } from '@/components/ui';
import { useT } from '@/i18n';
import styles from './Progress.module.css';

export function PatternsCard({ data, today }: { data: ProgressData; today: Day }) {
  const t = useT().progress.patterns;
  const patterns = findPatterns({ today, ...data });
  return (
    <Card title={t.title} meta={t.meta}>
      {patterns.length === 0 ? (
        <p className={styles.quiet}>{t.empty}</p>
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
