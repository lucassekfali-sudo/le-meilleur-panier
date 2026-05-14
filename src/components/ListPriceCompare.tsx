'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, type AppShoppingList } from '@/lib/useStore';
import { t } from '@/lib/translations';
import { effectivePrice, type ProductData } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, TrendingDown, ChevronDown, AlertCircle } from 'lucide-react';
import { getCountry } from '@/lib/countries';

function matchesItem(itemName: string, productName: string): boolean {
  const words = itemName.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const product = productName.toLowerCase();
  return words.length > 0 && words.every((w) => product.includes(w));
}

interface StoreCartResult {
  store: string;
  total: number;
  matched: { itemName: string; quantity: number; product: ProductData; effectivePrice: number; promoActive: boolean }[];
  missing: { itemName: string; quantity: number }[];
  matchRate: number;
}

interface Props {
  list: AppShoppingList;
}

export default function ListPriceCompare({ list }: Props) {
  const { language, products, loadProducts } = useStore();

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (n: number) => {
    const user = useStore.getState().user;
    const c = getCountry(user?.country);
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: c.currency,
      minimumFractionDigits: 2,
    }).format(n);
  };

  const stores = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => p.store && s.add(p.store));
    return Array.from(s).sort();
  }, [products]);

  const cartResults = useMemo<StoreCartResult[]>(() => {
    if (stores.length === 0) return [];

    return stores
      .map((store) => {
        const storeProducts = products.filter((p) => p.store === store);
        const matched: StoreCartResult['matched'] = [];
        const missing: StoreCartResult['missing'] = [];

        list.items.forEach((item) => {
          const candidates = storeProducts.filter((p) => matchesItem(item.name, p.name));
          if (candidates.length === 0) {
            missing.push({ itemName: item.name, quantity: item.quantity });
            return;
          }
          const best = candidates
            .map((p) => ({ p, ep: effectivePrice(p) }))
            .sort((a, b) => a.ep - b.ep)[0];
          const promoActive = best.ep < best.p.regularPrice;
          matched.push({
            itemName: item.name,
            quantity: item.quantity,
            product: best.p,
            effectivePrice: best.ep,
            promoActive,
          });
        });

        const total = matched.reduce((s, m) => s + m.effectivePrice * m.quantity, 0);
        const totalItems = list.items.length;
        const matchRate = totalItems > 0 ? matched.length / totalItems : 0;

        return { store, total, matched, missing, matchRate };
      })
      .sort((a, b) => {
        if (Math.abs(a.matchRate - b.matchRate) > 0.001) return b.matchRate - a.matchRate;
        return a.total - b.total;
      });
  }, [list, products, stores]);

  const cheapest = cartResults.length > 0 ? cartResults[0] : null;
  const mostExpensive = cartResults.length > 0 ? cartResults[cartResults.length - 1] : null;
  const savings = cheapest && mostExpensive ? mostExpensive.total - cheapest.total : 0;

  if (products.length === 0) {
    return (
      <Card className="border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <div className="font-semibold">{t('noProducts', language)}</div>
            <div className="text-sm text-muted-foreground">{t('noProductsDesc', language)}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (list.items.length === 0) {
    return (
      <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl">
        <CardContent className="p-6 text-center text-muted-foreground">
          {t('emptyListNoCompare', language)}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Headline result */}
      {cheapest && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-emerald-300/50 dark:border-emerald-700/40 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-2xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <Trophy className="w-5 h-5" />
                <span className="font-semibold">{t('cheapestStore', language)}</span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    {cheapest.store}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {cheapest.matched.length} / {list.items.length} {t('itemsFound', language)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold tabular-nums">{fmt(cheapest.total)}</div>
                  {savings > 0 && (
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 justify-end">
                      <TrendingDown className="w-4 h-4" />
                      {t('saves', language)} {fmt(savings)} {t('vsExpensive', language)}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Per-store details */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">
          {t('rankingByStore', language)}
        </h3>
        {cartResults.map((res, idx) => (
          <StoreResultRow
            key={res.store}
            result={res}
            totalItems={list.items.length}
            rank={idx + 1}
            fmt={fmt}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}

interface StoreResultRowProps {
  result: StoreCartResult;
  totalItems: number;
  rank: number;
  fmt: (n: number) => string;
  language: string;
}

function StoreResultRow({ result, totalItems, rank, fmt, language }: StoreResultRowProps) {
  const [open, setOpen] = useState(rank === 1);
  const matchPct = totalItems > 0 ? Math.round((result.matched.length / totalItems) * 100) : 0;
  return (
    <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-3 flex items-center gap-3 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
          rank === 1 ? 'bg-emerald-500 text-white' : rank === 2 ? 'bg-emerald-200 text-emerald-800' : rank === 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{result.store}</div>
          <div className="text-xs text-muted-foreground">
            {result.matched.length} / {totalItems} {t('itemsFound', language)} ({matchPct}%)
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums">{fmt(result.total)}</div>
          {result.missing.length > 0 && (
            <div className="text-xs text-amber-600 dark:text-amber-400">
              +{result.missing.length} {t('itemsMissing', language)}
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-emerald-200/30 dark:border-emerald-800/20 overflow-hidden"
          >
            <div className="p-3 space-y-1.5 text-sm">
              {result.matched.map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>{' '}
                    <span className="truncate">{m.itemName}</span>
                    {m.quantity > 1 && <span className="text-xs text-muted-foreground"> × {m.quantity}</span>}
                    <span className="text-xs text-muted-foreground"> → {m.product.name}</span>
                    {m.promoActive && <span className="ml-1 text-xs text-rose-600 dark:text-rose-400 font-medium">PROMO</span>}
                  </div>
                  <span className="tabular-nums text-muted-foreground">{fmt(m.effectivePrice * m.quantity)}</span>
                </div>
              ))}
              {result.missing.map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-muted-foreground">
                  <div className="flex-1 min-w-0">
                    <span className="text-amber-600 dark:text-amber-400">?</span>{' '}
                    <span className="truncate">{m.itemName}</span>
                    {m.quantity > 1 && <span className="text-xs"> × {m.quantity}</span>}
                    <span className="text-xs"> — {t('notFoundInStore', language)}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
