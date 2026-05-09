'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  shimmerDuration?: string;
  borderRadius?: string;
  background?: string;
  children: React.ReactNode;
}

/**
 * A premium-looking button with a subtle shimmer effect that travels around
 * its border. Uses CSS gradients + masks (no JS animation), GPU-friendly.
 *
 * Inspired by Magic UI's ShimmerButton.
 */
export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = '#fae8db',
      shimmerSize = '0.05em',
      shimmerDuration = '3s',
      borderRadius = '12px',
      background = 'linear-gradient(135deg, #df8a5a 0%, #c97c5d 50%, #b06343 100%)',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white text-sm font-semibold transition-all duration-300 ease-out',
          'hover:scale-[1.02] active:scale-[0.98]',
          '[box-shadow:0_4px_14px_rgba(201,124,93,0.3),inset_0_-2px_0_rgba(0,0,0,0.15)]',
          'hover:[box-shadow:0_6px_20px_rgba(201,124,93,0.4),inset_0_-2px_0_rgba(0,0,0,0.15)]',
          className
        )}
        style={
          {
            '--spread': '90deg',
            '--shimmer-color': shimmerColor,
            '--shimmer-size': shimmerSize,
            '--speed': shimmerDuration,
            '--cut': '0.05em',
            '--bg': background,
            background,
            borderRadius,
          } as React.CSSProperties
        }
        {...props}
      >
        {/* Shimmer overlay */}
        <div
          className="-z-30 absolute inset-0 overflow-visible blur-[2px]"
          style={{ borderRadius }}
        >
          <div
            className="absolute inset-0 h-[100cqh] animate-spin-slow [aspect-ratio:1] [container-type:size]"
            style={{
              background: `conic-gradient(from calc(270deg - 45deg), transparent, var(--shimmer-color), transparent 90deg)`,
              animation: `spin-slow ${shimmerDuration} linear infinite`,
            }}
          />
        </div>
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </button>
    );
  }
);
ShimmerButton.displayName = 'ShimmerButton';
