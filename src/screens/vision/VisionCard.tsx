import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { wordsFontSize } from '@/domain/vision';
import type { VisionCardView } from '@/data';
import { Icon } from '@/components/icons/Icon';
import { cx } from '@/components/ui/cx';
import { useAttachmentUrl } from '@/screens/library/editor/useAttachmentUrl';
import styles from './Vision.module.css';

type Props = {
  card: VisionCardView;
  phone?: boolean;
  onEdit: () => void;
  className?: string;
  style?: CSSProperties;
};

/** One card on the board: words set large, or a picture with its caption; a pinned goal shows its progress. */
export function VisionCard({ card, phone = false, onEdit, className, style }: Props) {
  const tone = card.area?.color;
  const toneStyle = (card.bold ? {} : tone ? { '--card-bg': `var(--${tone}-soft)`, '--card-ink': `var(--${tone}-ink)` } : {}) as CSSProperties;
  const goal = card.goal && (
    <Link to={`/goals/${card.goal.id}`} className={styles.goalChip}>
      {phone ? shortTitle(card.goal.title) : card.goal.title}
      {card.goal.percent !== null && ` · ${Math.round(card.goal.percent)}%`}
    </Link>
  );
  const label = card.kind === 'words' ? `Edit “${card.text}”` : `Edit ${card.text ? `“${card.text}”` : 'picture'}`;

  return (
    <article
      className={cx(styles.card, card.kind === 'image' ? styles.imageCard : styles.wordsCard, card.bold && styles.bold, card.size === 'L' && styles.tall, phone && styles.cardPhone, className)}
      style={{ ...toneStyle, ...style }}
      aria-label={card.kind === 'words' ? card.text : card.text || 'Picture'}
    >
      {card.kind === 'image' ? <Picture card={card} /> : null}
      {card.kind === 'words' && (
        <>
          <div className={styles.cardTop}>
            {card.area && <span className={styles.areaLabel}>{card.area.name}</span>}
            {goal}
          </div>
          <p className={styles.words} style={{ fontSize: wordsFontSize(card.text, card.size, phone) }}>
            {card.text}
          </p>
        </>
      )}
      {card.kind === 'image' && (
        <>
          {goal && <div className={styles.cardTop}>{goal}</div>}
          {card.text && <span className={styles.caption}>{card.text}</span>}
        </>
      )}
      <button type="button" className={styles.editButton} aria-label={label} onClick={onEdit}>
        <Icon name="more" size={16} />
      </button>
    </article>
  );
}

function Picture({ card }: { card: VisionCardView }) {
  const src = useAttachmentUrl(card.attachmentId ? `attachment://${card.attachmentId}` : '');
  return src ? (
    <img className={styles.picture} src={src} alt={card.text || 'A picture on your vision board'} draggable={false} />
  ) : (
    <span className={styles.picturePlaceholder} aria-hidden="true">
      <Icon name="image" size={28} />
    </span>
  );
}

/** Phones have narrow chips: "Run a half-marathon" → "Half-marathon", "Visit Japan with family" → "Visit Japan". */
function shortTitle(title: string): string {
  if (title.length <= 18) return title;
  const words = title.split(' ');
  const last = words.at(-1)!;
  return last.length >= 8 ? last.charAt(0).toUpperCase() + last.slice(1) : words.slice(0, 2).join(' ');
}
