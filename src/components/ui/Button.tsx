import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';
import { cx } from './cx';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet';
  size?: 'md' | 'sm';
  icon?: ReactNode;
};

/** Use one primary button per screen. Secondary for the rest, quiet for link-like actions. */
export function Button({ variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={cx(styles.button, styles[variant], styles[size], className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}
