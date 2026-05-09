'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
  /** Colors to cycle through (in order). Defaults to terracotta + honey + sage. */
  colors?: string[];
  /** Animation duration */
  speed?: string;
}

/**
 * Text element with an animated multi-color gradient.
 * Used for hero titles or "wow moment" labels.
 */
export default function AnimatedGradientText({
  children,
  className,
  colors = ['#c97c5d', '#d4a04c', '#728866', '#c97c5d'],
  speed = '6s',
}: AnimatedGradientTextProps) {
  const gradient = `linear-gradient(90deg, ${colors.join(', ')})`;
  return (
    <span
      className={cn(
        'inline-block bg-clip-text text-transparent font-bold',
        className
      )}
      style={{
        backgroundImage: gradient,
        backgroundSize: '200% auto',
        animation: `gradient-shift ${speed} ease infinite`,
        WebkitBackgroundClip: 'text',
      }}
    >
      {children}
    </span>
  );
}
