import type { SVGProps } from 'react';
import { iconPaths, type IconName } from './iconPaths';

export type { IconName };

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** Give a label only when the icon carries meaning on its own; otherwise it is hidden from screen readers. */
  label?: string;
};

export function Icon({ name, size = 18, strokeWidth = 1.8, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}
