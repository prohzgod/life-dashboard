import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
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

type ButtonLinkProps = LinkProps & { variant?: ButtonProps['variant']; size?: ButtonProps['size']; icon?: ReactNode };

/** A link that looks like a button, for actions that go somewhere. */
export function ButtonLink({ variant = 'secondary', size = 'md', icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cx(styles.button, styles.link, styles[variant], styles[size], className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
