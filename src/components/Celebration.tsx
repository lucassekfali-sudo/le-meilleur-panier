'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotate: number;
  emoji: string;
  delay: number;
}

interface Props {
  show: boolean;
  onDone?: () => void;
  emoji?: string[];
  message?: string;
  duration?: number;
}

const DEFAULT_EMOJIS = ['🎉', '✨', '⭐', '💚', '🛒', '💰'];

/**
 * A short, full-screen celebration overlay with falling confetti emojis.
 * Auto-dismisses after `duration` ms (default 2000).
 */
export default function Celebration({
  show,
  onDone,
  emoji = DEFAULT_EMOJIS,
  message,
  duration = 2000,
}: Props) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      onDone?.();
    }, duration);
    return () => clearTimeout(t);
  }, [show, duration, onDone]);

  if (!show) return null;

  // Generate particles deterministically per render
  const particles: Particle[] = Array.from({ length: 32 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    rotate: Math.random() * 720 - 360,
    emoji: emoji[i % emoji.length],
    delay: Math.random() * 0.4,
  }));

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-[9999]"
        >
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: `${p.x}vw`, y: `${p.y}vh`, rotate: 0, opacity: 1 }}
              animate={{
                y: '110vh',
                rotate: p.rotate,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 1.4 + Math.random() * 0.6,
                delay: p.delay,
                ease: 'easeIn',
                opacity: { times: [0, 0.7, 1] },
              }}
              className="absolute text-3xl"
              style={{ willChange: 'transform' }}
            >
              {p.emoji}
            </motion.div>
          ))}

          {message && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-3xl px-8 py-6 shadow-2xl border border-emerald-200 dark:border-emerald-800 text-center max-w-sm mx-4">
                <div className="text-5xl mb-2">🎉</div>
                <div className="font-bold text-xl text-emerald-700 dark:text-emerald-300">
                  {message}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
