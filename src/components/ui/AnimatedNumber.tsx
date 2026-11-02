import { useEffect, useRef, useState } from 'react';
import { canAnimate } from '@/lib/motion';

const DURATION = 480;

type AnimatedNumberProps = {
  value: number;
  /** How to show the number, e.g. as money. Rounds to the value's own decimals by default. */
  format?: (value: number) => string;
  className?: string;
};

const decimalsOf = (n: number) => (Number.isInteger(n) ? 0 : Math.min(2, String(n).split('.')[1]?.length ?? 0));

/** A number that counts to its new value when it changes. It starts on the value it is given, without counting. */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return;
    if (!canAnimate()) {
      setShown(value);
      return;
    }
    const decimals = Math.max(decimalsOf(start), decimalsOf(value));
    const began = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - began) / DURATION);
      const eased = 1 - (1 - t) ** 3;
      const at = t === 1 ? value : Number((start + (value - start) * eased).toFixed(decimals));
      from.current = at;
      setShown(at);
      if (t < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  // Where nothing animates, show the value itself rather than wait a render for it.
  const display = canAnimate() ? shown : value;
  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {format ? format(display) : display}
    </span>
  );
}
