'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import { ShoppingCart, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';

/**
 * A compact dashboard shown at the top of the lists page.
 * Surfaces user activity (lists, items checked, this-month spend, savings) at a glance.
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

  const fmt = (n: number) =>
    n.toLocaleString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
    >
      <StatCard
        icon={<ShoppingCart className="w-4 h-4" />}
        label={t('statsLists', language)}
        value={String(stats.totalLists)}
        accent="emerald"
        delay={0}
      />
      <StatCard
        icon={<CheckCircle2 className="w-4 h-4" />}
        label={t('statsCompletion', language)}
        value={`${stats.completionRate}%`}
        sub={`${stats.checkedItems}/${stats.totalItems}`}
        accent="emerald"
        delay={0.05}
      />
      <StatCard
        icon={<Calendar className="w-4 h-4" />}
        label={t('statsThisMonth', language)}
        value={fmt(stats.thisMonthSpend)}
        accent="blue"
        delay={0.1}
      />
      <StatCard
        icon={<TrendingUp className="w-4 h-4" />}
        label={t('statsArchived', language)}
        value={String(purchaseHistory.length)}
        accent="purple"
        delay={0.15}
      />
    </motion.div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: 'emerald' | 'blue' | 'purple';
  delay: number;
}

function StatCard({ icon, label, value, sub, accent, delay }: StatCardProps) {
  const accentColors = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-800/30 rounded-xl p-3 hover:shadow-md hover:shadow-emerald-500/5 transition-shadow"
    >
      <div className={`flex items-center gap-1.5 text-xs ${accentColors}`}>
        {icon}
        <span className="font-medium truncate">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums">{value}</span>
        {sub && <span className="text-xs text-muted-foreground">· {sub}</span>}
      </div>
    </motion.div>
  );
}
