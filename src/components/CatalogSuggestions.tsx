'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/useStore';
import { effectivePrice, type ProductData } from '@/lib/firebase-service';
import { getCountry } from '@/lib/countries';
import { Plus, Sparkles } from 'lucide-react';

interface Props {
  query: string;
  excludeNames: string[];
  onAdd: (product: ProductData, price: number) => void;
}

function matches(query: string, name: string): boolean {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const target = name.toLowerCase();
  return words.length > 0 && words.every((w) => target.includes(w));
}

/**
 * Live suggestions from the global product catalog as the user types
 * in a list's search bar. Shows the cheapest store for each match and a
 * one-click "Add to list" button.
 */
export default function CatalogSuggestions({ query, excludeNames, onAdd }: Props) {
  const { products, user, loadProducts } = useStore();
  const [shown, setShown] = useState(true);

  useEffect(() => {
    if (products.length === 0) loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (n: number) => {
    const c = getCountry(user?.country);
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: c.currency,
      minimumFractionDigits: 2,
    }).format(n);
  };

  // Group catalog products by name, keep the cheapest store per name
  const suggestions = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];

    const matched = products.filter((p) => matches(q, p.name));
    if (matched.length === 0) return [];

    // Group by lowercased name
    const byName = new Map<string, { name: string; brand?: string; cheapest: ProductData; price: number; storeCount: number }>();
    for (const p of matched) {
      const key = p.name.toLowerCase();
      const ep = effectivePrice(p);
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, { name: p.name, brand: p.brand, cheapest: p, price: ep, storeCount: 1 });
      } else {
        existing.storeCount += 1;
        if (ep < existing.price) {
          existing.cheapest = p;
          existing.price = ep;
        }
      }
    }

    return Array.from(byName.values())
      // Hide products already in the current list (case-insensitive match)
      .filter((s) => !excludeNames.some((n) => n === s.name.toLowerCase()))
      .sort((a, b) => a.price - b.price)
      .slice(0, 5);
  }, [query, products, excludeNames]);

  if (suggestions.length === 0 || !shown) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="space-y-1.5"
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
          <Sparkles className="w-3 h-3 text-honey-500" />
          <span>{suggestions.length} {suggestions.length > 1 ? 'suggestions du catalogue' : 'suggestion du catalogue'}</span>
        </div>
        {suggestions.map((s) => (
          <div
            key={s.cheapest.id}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-honey-50/40 dark:bg-honey-950/20 border border-honey-200/40 dark:border-honey-800/30 hover:bg-honey-100/40 dark:hover:bg-honey-950/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{s.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {s.brand && <span>{s.brand} · </span>}
                <span className="font-medium text-emerald-700 dark:text-emerald-400">{s.cheapest.store}</span>
                {s.storeCount > 1 && <span className="text-muted-foreground"> +{s.storeCount - 1} autres</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{fmt(s.price)}</div>
            </div>
            <button
              onClick={() => onAdd(s.cheapest, s.price)}
              className="shrink-0 w-9 h-9 rounded-full gradient-emerald text-white flex items-center justify-center shadow-emerald hover:opacity-90 transition-opacity"
              aria-label="Ajouter à la liste"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setShown(false)}
          className="text-xs text-muted-foreground hover:underline px-1"
        >
          Masquer les suggestions
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
