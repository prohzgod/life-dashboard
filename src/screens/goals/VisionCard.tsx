import { useState } from 'react';
import { Link } from 'react-router-dom';
import { saveVision, type Goal } from '@/data';
import { year, type Day } from '@/domain/days';
import { Button } from '@/components/ui';
import styles from './Goals.module.css';

/** The year's vision statement and word of the year, edited in place. */
export function VisionCard({ today, vision }: { today: Day; vision: Goal | null }) {
  const [editing, setEditing] = useState(false);
  const statement = vision?.title ?? '';

  return (
    <section className={styles.vision} aria-label={`${year(today)} vision`}>
      <div className={styles.visionText}>
        <span className={styles.eyebrow}>{year(today)} vision</span>
        {editing ? (
          <textarea
            className={styles.visionInput}
            aria-label="Vision statement"
            defaultValue={statement}
            autoFocus
            rows={2}
            placeholder="Who do you want to be by the end of this year?"
            onBlur={async (e) => {
              await saveVision(today, { statement: e.target.value });
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          />
        ) : statement ? (
          <button type="button" className={styles.visionStatement} onClick={() => setEditing(true)} aria-label={`Vision: ${statement}. Edit`}>
            {statement}
          </button>
        ) : (
          <Button size="sm" onClick={() => setEditing(true)}>
            Write your vision for {year(today)}
          </Button>
        )}
      </div>
      <label className={styles.word}>
        <span className={styles.wordLabel}>Word of the year</span>
        <input
          key={vision?.wordOfYear ?? ''}
          className={styles.wordInput}
          aria-label="Word of the year"
          placeholder="One word"
          defaultValue={vision?.wordOfYear ?? ''}
          size={Math.max(6, (vision?.wordOfYear ?? '').length + 1)}
          onBlur={(e) => e.target.value.trim() !== (vision?.wordOfYear ?? '') && void saveVision(today, { word: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </label>
      <Link to="/vision" className={styles.link}>
        Vision board
      </Link>
    </section>
  );
}
