import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui';
import { cx } from '@/components/ui/cx';
import { useIsMobile } from '@/lib/useMediaQuery';
import styles from './Review.module.css';

export type FrameStep = { title: string; hint: string };

type FrameProps = {
  /** "Weekly review", "Monthly review"… */
  title: string;
  /** What's being reviewed, e.g. "Week 43, 19 – 25 October". */
  eyebrow: string;
  /** The phone's short version, e.g. "week 43". */
  shortName: string;
  steps: readonly FrameStep[];
  step: number;
  finished: boolean;
  minutesLeft: number;
  /** The next button's label for each step but the last. */
  nextLabels: readonly string[];
  /** Extra words after "Step n of m, you can skip any step". */
  footerExtra?: string;
  onGo: (step: number) => void;
  children: ReactNode;
};

/** The shared shape of every review: a header, the steps, the step's body and Back / Next. */
export function ReviewFrame({ title, eyebrow, shortName, steps, step, finished, minutesLeft, nextLabels, footerExtra, onGo, children }: FrameProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const last = steps.length;
  const go = (n: number) => onGo(Math.min(last, Math.max(1, n)));

  if (isMobile) {
    return (
      <div className={styles.page}>
        <header className={styles.mobileTop}>
          <Link to="/reviews" className={styles.close} aria-label="Close and finish later">
            <Icon name="close" size={18} />
          </Link>
          <span className={styles.left}>{finished ? 'Saved to your journal' : `About ${minutesLeft} min left`}</span>
          <Link to="/reviews" className={styles.headerLink}>
            {finished ? 'Done' : 'Save'}
          </Link>
        </header>
        <ol className={styles.dashes} aria-label="Review steps">
          {steps.map((s, i) => (
            <li key={s.title} aria-current={i + 1 === step ? 'step' : undefined}>
              <button type="button" className={cx(styles.dash, (finished || i + 1 <= step) && styles.dashOn)} disabled={finished} onClick={() => go(i + 1)} aria-label={`Step ${i + 1}: ${s.title}`} />
            </li>
          ))}
        </ol>
        <div className={styles.mobileHeading}>
          <span className={styles.eyebrow}>
            Step {step} of {last}, {shortName}
          </span>
          <h1 className={styles.mobileTitle}>{steps[step - 1]!.title}</h1>
        </div>
        <div className={styles.body}>{children}</div>
        {!finished && (
          <footer className={styles.mobileFooter}>
            <Button disabled={step === 1} onClick={() => go(step - 1)}>
              Back
            </Button>
            {step < last && (
              <Button variant="primary" className={styles.next} onClick={() => go(step + 1)}>
                {nextLabels[step - 1]}
              </Button>
            )}
          </footer>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1 className={styles.title}>{title}</h1>
        </div>
        <div className={styles.headerSide}>
          {!finished && <span className={styles.left}>About {minutesLeft} min left</span>}
          {finished ? (
            <Link to="/reviews" className={styles.headerLink}>
              Back to Reviews
            </Link>
          ) : (
            <Button size="sm" onClick={() => navigate('/reviews')}>
              Save and finish later
            </Button>
          )}
        </div>
      </header>

      <ol className={cx(styles.steps, last === 4 && styles.steps4)} aria-label="Review steps">
        {steps.map((s, i) => {
          const n = i + 1;
          const state = finished || n < step ? 'done' : n === step ? 'current' : 'todo';
          return (
            <li key={s.title} aria-current={state === 'current' ? 'step' : undefined}>
              <button type="button" className={cx(styles.step, styles[state])} disabled={finished} onClick={() => go(n)}>
                <span className={styles.stepMark} aria-hidden="true">
                  {state === 'done' ? <Icon name="check" size={14} strokeWidth={2.4} /> : n}
                </span>
                <span className={styles.stepText}>
                  <span className={styles.stepTitle}>{s.title}</span>
                  <span className={styles.stepHint}>{state === 'done' ? `${s.hint}, done` : s.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className={styles.body}>{children}</div>

      {!finished && (
        <footer className={styles.footer}>
          <Button disabled={step === 1} onClick={() => go(step - 1)}>
            Back
          </Button>
          <span className={styles.footerNote}>
            Step {step} of {last}, you can skip any step
            {footerExtra ? `, ${footerExtra}` : ''}
          </span>
          {step < last ? (
            <Button variant="primary" onClick={() => go(step + 1)}>
              {nextLabels[step - 1]}
            </Button>
          ) : (
            <span />
          )}
        </footer>
      )}
    </div>
  );
}
