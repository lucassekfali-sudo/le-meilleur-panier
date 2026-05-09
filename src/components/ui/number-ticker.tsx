'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';

interface NumberTickerProps {
  value: number;
  /** Minimum decimal places to keep — useful for prices (2 → 12.40 stays 12.40, not 12.4) */
  decimals?: number;
  /** Direction of the count animation */
  direction?: 'up' | 'down';
  /** Animation start delay in ms */
  delay?: number;
  className?: string;
  /** Optional locale for number formatting (e.g. fr-FR, en-US) */
  locale?: string;
  /** Optional currency formatter — pass "EUR" / "USD" etc. */
  currency?: string;
  /** Stiffness of the spring — higher = snappier */
  stiffness?: number;
}

/**
 * Animates a number from 0 (or `value`) up/down to its final state when
 * scrolled into view. Uses Framer Motion springs for a natural feel.
 *
 * Inspired by Magic UI's NumberTicker, reimplemented in-house.
 */
export default function NumberTicker({
  value,
  decimals = 0,
  direction = 'up',
  delay = 0,
  className = '',
  locale,
  currency,
  stiffness = 80,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState<string>(
    formatValue(direction === 'down' ? value : 0, decimals, locale, currency)
  );
  const motionValue = useMotionValue(direction === 'down' ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 20,
    stiffness,
  });
  const isInView = useInView(ref, { once: true, margin: '0px' });

  useEffect(() => {
    if (!isInView) return;
    const timer = setTimeout(() => {
      motionValue.set(direction === 'down' ? 0 : value);
    }, delay);
    return () => clearTimeout(timer);
  }, [isInView, motionValue, value, direction, delay]);

  useEffect(() => {
    return springValue.on('change', (v) => {
      setDisplay(formatValue(v, decimals, locale, currency));
    });
  }, [springValue, decimals, locale, currency]);

  return (
    <span ref={ref} className={`inline-block tabular-nums ${className}`}>
      {display}
    </span>
  );
}

function formatValue(
  v: number,
  decimals: number,
  locale: string | undefined,
  currency: string | undefined
): string {
  const opts: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  if (currency) {
    opts.style = 'currency';
    opts.currency = currency;
  }
  return new Intl.NumberFormat(locale, opts).format(v);
}
