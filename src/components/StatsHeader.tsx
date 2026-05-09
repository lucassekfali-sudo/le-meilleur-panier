'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import NumberTicker from '@/components/ui/number-ticker';
import { ShoppingCart, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';

/**
 * A compact dashboard shown at the top of the lists page.
 * Surfaces user activity at a glance with animated number tickers.
 */
export default function StatsHeader() {
  const { language, shoppingLists, purchaseHistory } = useStore();

  const stats = useMemo(() => {
    const totalLists = shoppingLists.length;
    const totalItems = shoppingLists.reduce((s, l) => s + l.items.length, 0);
    const checkedItems = shoppingLists.reduce(
      (s, l) => s + l.items.filter((i) => i.checked).length,
      0
    );
    const completionRate = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

    const now = new Date();
    const thisMonthSpend = purchaseHistory
      .filter((h) => {
        try {
          const d = new Date(h.archivedAt);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        } catch {
          return false;
        }
      })
      .reduce((s, h) => s + h.total, 0);

    return { totalLists, totalItems, checkedItems, completionRate, thisMonthSpend };
  }, [shoppingLists, purchaseHistory]);

  const fmtLocale =
    language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
    >
      <StatCard
        icon={<ShoppingCart className="w-4 h-4" />}
        label={t('statsLists', language)}
        accent="terracotta"
        delay={0}
      >
        <NumberTicker value={stats.totalLists} delay={100} />
      </StatCard>

      <StatCard
        icon={<CheckCircle2 className="w-4 h-4" />}
        label={t('statsCompletion', language)}
        sub={`${stats.checkedItems}/${stats.totalItems}`}
        accent="sage"
        delay={0.05}
      >
        <NumberTicker value={stats.completionRate} delay={200} />
        <span className="ml-0.5">%</span>
      </StatCard>

      <StatCard
        icon={<Calendar className="w-4 h-4" />}
        label={t('statsThisMonth', language)}
        accent="honey"
        delay={0.1}
      >
        <NumberTicker
          value={stats.thisMonthSpend}
          decimals={0}
          locale={fmtLocale}
          currency="EUR"
          delay={300}
        />
      </StatCard>

      <StatCard
        icon={<TrendingUp className="w-4 h-4" />}
        label={t('statsArchived', language)}
        accent="rose"
        delay={0.15}
      >
        <NumberTicker value={purchaseHistory.length} delay={400} />
      </StatCard>
    </motion.div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  accent: 'terracotta' | 'sage' | 'honey' | 'rose';
  delay: number;
  children: React.ReactNode;
}

function StatCard({ icon, label, sub, accent, delay, children }: StatCardProps) {
  const palettes: Record<StatCardProps['accent'], { text: string; bg: string; border: string }> = {
    terracotta: {
      text: 'text-terracotta-700 dark:text-terracotta-300',
      bg: 'bg-gradient-to-br from-terracotta-50 to-white dark:from-terracotta-950/30 dark:to-gray-900/40',
      border: 'border-terracotta-200/50 dark:border-terracotta-800/30',
    },
    sage: {
      text: 'text-emerald-700 dark:text-emerald-300',
      bg: 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900/40',
      border: 'border-emerald-200/50 dark:border-emerald-800/30',
    },
    honey: {
      text: 'text-honey-700 dark:text-honey-300',
      bg: 'bg-gradient-to-br from-honey-50 to-white dark:from-honey-950/30 dark:to-gray-900/40',
      border: 'border-honey-200/60 dark:border-honey-800/30',
    },
    rose: {
      text: 'text-rose-700 dark:text-rose-300',
      bg: 'bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-gray-900/40',
      border: 'border-rose-200/50 dark:border-rose-800/30',
    },
  };
  const p = palettes[accent];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 22 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={`group relative ${p.bg} backdrop-blur-sm border ${p.border} rounded-2xl p-3.5 transition-all hover:shadow-lg hover:shadow-black/5 cursor-default overflow-hidden`}
    >
      {/* subtle decorative ring */}
      <div className={`absolute -top-6 -right-6 w-16 h-16 rounded-full ${p.text} opacity-[0.06] group-hover:opacity-[0.12] transition-opacity`}
           style={{ background: 'currentColor' }} />

      <div className={`relative flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-medium ${p.text}`}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="relative mt-1.5 flex items-baseline gap-1">
        <span className={`text-2xl font-bold tabular-nums leading-none ${p.text}`}>
          {children}
        </span>
        {sub && <span className="text-[11px] text-muted-foreground font-medium">· {sub}</span>}
      </div>
    </motion.div>
  );
}
