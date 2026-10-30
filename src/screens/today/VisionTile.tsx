import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { year, type Day } from '@/domain/days';
import { loadVisionBoard } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { cx } from '@/components/ui/cx';
import { useT } from '@/i18n';
import { useAttachmentUrl } from '@/screens/library/editor/useAttachmentUrl';
import styles from './Today.module.css';

/** The first picture on your Vision board, with a glass chip, a round arrow and a glass caption. */
export function VisionTile({ today, className }: { today: Day; className?: string }) {
  const t = useT().today.vision;
  const board = useLiveQuery(() => loadVisionBoard(today), [today]);
  const card = board?.cards.find((c) => c.kind === 'image' && c.attachmentId) ?? board?.cards[0];
  const src = useAttachmentUrl(card?.attachmentId ? `attachment://${card.attachmentId}` : '');
  if (!board) return null;

  return (
    <section className={cx(styles.vision, !src && styles.visionPlain, className)} aria-label={t.title}>
      {src && <img src={src} alt={card?.text ?? ''} className={styles.visionImage} />}
      <span className={styles.visionChip}>{t.title}</span>
      <Link to="/vision" className={styles.visionArrow} aria-label={t.open}>
        <Icon name="arrowUpRight" size={17} strokeWidth={2} />
      </Link>
      <div className={styles.visionCaption}>
        {card ? (
          <>
            {card.goal && <span className={styles.visionEyebrow}>{t.goal(year(today))}</span>}
            <span className={styles.visionTitle}>{card.goal?.title ?? (card.text || board.word || t.title)}</span>
          </>
        ) : (
          <span className={styles.visionEmpty}>{t.empty}</span>
        )}
      </div>
    </section>
  );
}
