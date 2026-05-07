'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { t } from '@/lib/translations';
import { effectivePrice, type ProductData } from '@/lib/firebase-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trophy,
  TrendingDown,
  Search,
  ShoppingCart,
  AlertCircle,
  ChevronDown,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';

type Mode = 'cart' | 'item';

// Match a list item name with a product.
// Match if the product name contains every word from the list item name (case-insensitive).
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
  matchRate: number; // 0..1
}

export default function PriceComparison() {
  const { language, shoppingLists, products, loadProducts } = useStore();
  const [mode, setMode] = useState<Mode>('cart');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [singleQuery, setSingleQuery] = useState('');

  useEffect(() => {
    loadProducts();
    // Default-select the first list if any
    if (!selectedListId && shoppingLists.length > 0) {
      setSelectedListId(shoppingLists[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shoppingLists.length]);

  const fmt = (n: number) =>
    n.toLocaleString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    });

  const stores = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => p.store && s.add(p.store));
    return Array.from(s).sort();
  }, [products]);

  const cartResults = useMemo<StoreCartResult[]>(() => {
    const list = shoppingLists.find((l) => l.id === selectedListId);
    if (!list || stores.length === 0) return [];

    return stores.map((store) => {
      const storeProducts = products.filter((p) => p.store === store);
      const matched: StoreCartResult['matched'] = [];
      const missing: StoreCartResult['missing'] = [];

      list.items.forEach((item) => {
        // Find best (cheapest) matching product in this store
        const candidates = storeProducts.filter((p) => matchesItem(item.name, p.name));
        if (candidates.length === 0) {
          missing.push({ itemName: item.name, quantity: item.quantity });
          return;
        }
        // Pick the one with lowest effective price
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
    }).sort((a, b) => {
      // Sort first by match rate desc, then by total asc
      if (Math.abs(a.matchRate - b.matchRate) > 0.001) return b.matchRate - a.matchRate;
      return a.total - b.total;
    });
  }, [selectedListId, shoppingLists, products, stores]);

  const itemResults = useMemo(() => {
    const q = singleQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => matchesItem(q, p.name))
      .map((p) => ({ p, ep: effectivePrice(p), promo: effectivePrice(p) < p.regularPrice }))
      .sort((a, b) => a.ep - b.ep);
  }, [products, singleQuery]);

  const cheapest = cartResults.length > 0 ? cartResults[0] : null;
  const mostExpensive = cartResults.length > 0 ? cartResults[cartResults.length - 1] : null;
  const savings = cheapest && mostExpensive ? mostExpensive.total - cheapest.total : 0;

  const selectedList = shoppingLists.find((l) => l.id === selectedListId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-6 h-6 text-emerald-600" />
        <h2 className="text-xl font-bold">{t('comparePrices', language)}</h2>
      </div>

      {/* Mode switch */}
      <div className="flex gap-2 p-1 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/40 dark:border-emerald-800/30 w-fit">
        <button
          onClick={() => setMode('cart')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'cart'
              ? 'bg-white dark:bg-gray-800 shadow text-emerald-700 dark:text-emerald-300'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingCart className="w-4 h-4 inline mr-1" />
          {t('compareCart', language)}
        </button>
        <button
          onClick={() => setMode('item')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'item'
              ? 'bg-white dark:bg-gray-800 shadow text-emerald-700 dark:text-emerald-300'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="w-4 h-4 inline mr-1" />
          {t('compareItem', language)}
        </button>
      </div>

      {/* No products in DB */}
      {products.length === 0 && (
        <Card className="border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <div className="font-semibold">{t('noProducts', language)}</div>
              <div className="text-sm text-muted-foreground">
                {t('noProductsDesc', language)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === 'cart' && products.length > 0 && (
        <>
          {/* List picker */}
          {shoppingLists.length === 0 ? (
            <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl">
              <CardContent className="p-6 text-center text-muted-foreground">
                {t('noLists', language)}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {t('compareWhichList', language)}
              </span>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger className="rounded-xl border-emerald-200/60 dark:border-emerald-800/40 bg-white/60 dark:bg-gray-800/60">
                  <SelectValue placeholder={t('selectAList', language)} />
                </SelectTrigger>
                <SelectContent>
                  {shoppingLists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.items.length} {t('totalItems', language)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Headline result */}
          {selectedList && cheapest && (
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
                        {cheapest.matched.length} / {selectedList.items.length} {t('itemsFound', language)}
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
          {selectedList && cartResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">
                {t('rankingByStore', language)}
              </h3>
              {cartResults.map((res, idx) => (
                <StoreResultRow key={res.store} result={res} totalItems={selectedList.items.length} rank={idx + 1} fmt={fmt} language={language} />
              ))}
            </div>
          )}
        </>
      )}

      {mode === 'item' && products.length > 0 && (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={singleQuery}
              onChange={(e) => setSingleQuery(e.target.value)}
              placeholder={t('searchProduct', language)}
              className="pl-9 h-12 rounded-xl border-emerald-200/60 dark:border-emerald-800/40 bg-white/60 dark:bg-gray-800/60"
              autoFocus
            />
          </div>

          {singleQuery.trim() && itemResults.length === 0 && (
            <Card className="border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl">
              <CardContent className="p-6 text-center text-muted-foreground">
                {t('noResults', language)}
              </CardContent>
            </Card>
          )}

          {itemResults.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {itemResults.length} {t('results', language)} — {t('sortedByPrice', language)}
              </div>
              {itemResults.map((r, idx) => (
                <Card key={r.p.id} className={`border-emerald-200/40 dark:border-emerald-800/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl overflow-hidden ${idx === 0 ? 'ring-2 ring-emerald-400/50' : ''}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    {r.p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.p.imageUrl} alt={r.p.name} className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-emerald-600/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{r.p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.p.brand && <span>{r.p.brand} · </span>}
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30">{r.p.store}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {r.promo ? (
                        <>
                          <div className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">{fmt(r.ep)}</div>
                          <div className="text-xs line-through text-muted-foreground tabular-nums">{fmt(r.p.regularPrice)}</div>
                        </>
                      ) : (
                        <div className="text-lg font-bold tabular-nums">{fmt(r.ep)}</div>
                      )}
                      {idx === 0 && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 justify-end mt-0.5">
                          <Sparkles className="w-3 h-3" />
                          {t('cheapest', language)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
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
