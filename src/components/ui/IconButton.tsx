import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Icon, type IconName } from '@/components/icons/Icon';
import styles from './IconButton.module.css';
import { cx } from './cx';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconName;
  /** Every icon-only button needs a name. */
  label: string;
  /** `md` 48 (44 on phones), `sm` 40. */
  size?: 'md' | 'sm';
  /** `glass` by default; `inverse` for the strong fill, `accent` for the one add button. */
  tone?: 'glass' | 'inverse' | 'accent';
};

/** A round icon button: header actions, add buttons on habit tiles, the camera in the check-in. */
export function IconButton({ icon, label, size = 'md', tone = 'glass', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} className={cx(styles.button, styles[size], styles[tone], className)} {...rest}>
      <Icon name={icon} size={size === 'sm' ? 17 : 20} />
    </button>
  );
}

/** The round ↗ link in a card's header that opens the full screen. */
export function ArrowLink({ label, className, ...rest }: Omit<LinkProps, 'children'> & { label: string }) {
  return (
    <Link aria-label={label} className={cx(styles.button, styles.sm, styles.glass, className)} {...rest}>
      <Icon name="arrowUpRight" size={17} strokeWidth={2} />
    </Link>
  );
}
