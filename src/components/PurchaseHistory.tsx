'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ChevronDown, Trash2, History, ShoppingBag, TrendingUp, Calendar } from 'lucide-react';

function formatDate(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function isThisMonth(iso: string): boolean {
  try {
    const d = new Date(iso);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  } catch {
    return false;
  }
}

export default function PurchaseHistory() {
  const { language, purchaseHistory, loadPurchaseHistory, deleteHistoryEntry } = useStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPurchaseHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const totalSpent = purchaseHistory.reduce((s, h) => s + h.total, 0);
    const count = purchaseHistory.length;
    const avg = count > 0 ? totalSpent / count : 0;
    const monthSpent = purchaseHistory
      .filter((h) => isThisMonth(h.archivedAt))
      .reduce((s, h) => s + h.total, 0);
    return { totalSpent, avg, monthSpent, count };
  }, [purchaseHistory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return purchaseHistory;
    return purchaseHistory.filter(
      (h) =>
        h.listName.toLowerCase().includes(q) ||
        h.items.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [purchaseHistory, search]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fmtCurrency = (n: number) =>
    n.toLocaleString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <History className="w-6 h-6 text-emerald-600" />
        <h2 className="text-xl font-bold">{t('purchaseHistory', language)}</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden">
          <div className="h-0.5 w-full gradient-emerald opacity-50" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              {t('totalSpent', language)}
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {fmtCurrency(stats.totalSpent)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden">
          <div className="h-0.5 w-full gradient-emerald opacity-50" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              {t('avgPerTrip', language)}
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {fmtCurrency(stats.avg)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden">
          <div className="h-0.5 w-full gradient-emerald opacity-50" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-4 h-4 text-emerald-600" />
              {t('thisMonth', language)}
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {fmtCurrency(stats.monthSpent)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {purchaseHistory.length > 0 && (
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchHistory', language)}
          className="border-emerald-200/60 dark:border-emerald-800/40 focus-visible:ring-emerald-500/50 bg-white/60 dark:bg-gray-800/60 rounded-xl h-11"
        />
      )}

      {/* Empty state */}
      {purchaseHistory.length === 0 && (
        <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl">
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-3">🕐</div>
            <h3 className="font-semibold text-lg">{t('noHistory', language)}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('noHistoryDesc', language)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Entries */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((h) => {
            const isOpen = expanded.has(h.id);
            const checkedRatio = h.itemsCount > 0 ? h.checkedCount / h.itemsCount : 0;
            return (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                layout
              >
                <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden">
                  <CardContent className="p-0">
                    <button
                      onClick={() => toggleExpand(h.id)}
                      className="w-full text-left p-4 flex items-center gap-3 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{h.listName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(h.archivedAt, language)} · {h.itemsCount}{' '}
                          {t('totalItems', language)}
                        </div>
                        <div className="mt-2 h-1 w-full bg-emerald-100 dark:bg-emerald-950/30 rounded-full overflow-hidden">
                          <div
                            className="h-full gradient-emerald rounded-full transition-all"
                            style={{ width: `${Math.round(checkedRatio * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {fmtCurrency(h.total)}
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform ml-auto mt-1 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-emerald-200/30 dark:border-emerald-800/20 overflow-hidden"
                        >
                          <div className="p-4 space-y-2">
                            {h.items.map((it) => (
                              <div
                                key={it.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={
                                      it.checked
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-muted-foreground'
                                    }
                                  >
                                    {it.checked ? '✓' : '·'}
                                  </span>
                                  <span className="truncate">
                                    {it.name}
                                    {it.quantity > 1 && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        × {it.quantity}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <span className="text-muted-foreground tabular-nums">
                                  {fmtCurrency(it.price * it.quantity)}
                                </span>
                              </div>
                            ))}

                            <div className="pt-2 mt-2 border-t border-emerald-200/30 dark:border-emerald-800/20 flex items-center justify-between">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    {t('delete', language)}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {t('deleteHistoryTitle', language)}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('deleteHistoryDesc', language)}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      {t('cancel', language)}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteHistoryEntry(h.id)}
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      {t('delete', language)}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <span className="text-sm text-muted-foreground">
                                {h.checkedCount} / {h.itemsCount}{' '}
                                {t('checkedItems', language)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
